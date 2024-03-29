import { plainToInstance } from 'class-transformer';
import { Connection, Model, ClientSession } from 'mongoose';
import {
  catchError,
  concatAll,
  concatMap,
  count,
  filter,
  from,
  Observable,
  of,
  skip,
  take,
  tap,
  throwError,
  toArray,
} from 'rxjs';
import { map } from 'rxjs/operators';

import { MongooseEntity } from './mongoose-entity';
import { MongooseRelationship } from './mongoose-relationship';
import { filterDtoToQuery } from './utils';
import {
  Entity,
  InvalidIdSetException,
  isNotNullOrUndefined,
  isNullOrUndefined,
  Relationship,
} from '../../core';
import { IQueryRelationshipsDto } from '../../dto';
import {
  RelationshipDescriptor,
  RelationshipRepository,
} from '../../repository';

export type MongooseRelationshipDefinition<TRelated extends Entity = Entity> = {
  descriptor: RelationshipDescriptor<TRelated>;
  model: Model<MongooseRelationship>;
};

export class MongooseRelationshipRepository<
  TRelated extends MongooseEntity,
> extends RelationshipRepository<TRelated> {
  constructor(
    private readonly connection: Connection,
    private readonly definition: MongooseRelationshipDefinition<TRelated>,
    private readonly inverseDefinition?: MongooseRelationshipDefinition,
  ) {
    super();
  }

  private runAsTransaction<T>(
    method: (session: ClientSession) => Observable<T>,
  ): Observable<T> {
    return from(this.connection.startSession()).pipe(
      concatMap((session) =>
        of(void 0).pipe(
          tap(() => session.startTransaction()),
          concatMap(() => method(session)),
          concatMap((result) =>
            of(void 0).pipe(
              concatMap(() => from(session.commitTransaction())),
              concatMap(() => from(session.endSession())),
              map(() => result),
            ),
          ),
          catchError((error) =>
            of(void 0).pipe(
              concatMap(() => from(session.abortTransaction())),
              concatMap(() => from(session.endSession())),
              concatMap(() => throwError(() => error)),
            ),
          ),
        ),
      ),
    );
  }

  private transform(relationship: unknown): MongooseRelationship {
    return plainToInstance(MongooseRelationship, relationship, {
      excludeExtraneousValues: true,
    });
  }

  private transformRelated(entity: unknown): TRelated {
    return plainToInstance(this.definition.descriptor.related(), entity, {
      excludeExtraneousValues: true,
    });
  }

  private _createInverse(
    session: ClientSession,
    id1: string,
    id2set: string[],
    createdBy: string,
  ): Observable<unknown> {
    if (isNullOrUndefined(this.inverseDefinition)) {
      return of(void 0);
    }

    const { model } = this.inverseDefinition;

    const queries = id2set
      .map((id2) => ({
        id1: id2,
        id2: id1,
        createdBy,
        updatedBy: createdBy,
      }))
      .map((dto) => ({
        updateOne: {
          filter: { id1: dto.id1, id2: dto.id2 },
          update: { $setOnInsert: dto },
          upsert: true,
        },
      }));

    return from(model.bulkWrite(queries, { session }));
  }

  private _create(
    session: ClientSession,
    id1: string,
    id2set: string[],
    createdBy: string,
  ): Observable<unknown> {
    const { model } = this.definition;

    const queries = id2set
      .map((id2) => ({
        id1,
        id2,
        createdBy,
        updatedBy: createdBy,
      }))
      .map((dto) => ({
        updateOne: {
          filter: { id1: dto.id1, id2: dto.id2 },
          update: { $setOnInsert: dto },
          upsert: true,
        },
      }));

    return from(model.bulkWrite(queries, { session }));
  }

  private _deleteInverse(
    session: ClientSession,
    id1: string,
    id2set?: string[],
  ): Observable<unknown> {
    if (isNullOrUndefined(this.inverseDefinition)) {
      return of(void 0);
    }

    const { model } = this.inverseDefinition;

    const filter = { id2: id1 };

    if (isNotNullOrUndefined(id2set)) {
      filter['id1'] = { $in: id2set };
    }

    // TODO: add optimization if id2set has only one element
    const req = model.deleteMany(filter);

    return from(req.session(session).exec());
  }

  private _delete(
    session: ClientSession,
    id1: string,
    id2set?: string[],
  ): Observable<unknown> {
    const { model } = this.definition;

    const filter = { id1 };

    if (isNotNullOrUndefined(id2set)) {
      filter['id2'] = { $in: id2set };
    }

    // TODO: add optimization if id2set has only one element
    const req = model.deleteMany(filter);

    return from(req.session(session).exec());
  }

  private _update(
    session: ClientSession,
    id1: string,
    id2set: string[],
    createdBy: string,
  ): Observable<unknown> {
    return of(void 0).pipe(
      concatMap(() => this._delete(session, id1)),
      concatMap(() => this._create(session, id1, id2set, createdBy)),
    );
  }

  private _updateInverse(
    session: ClientSession,
    id1: string,
    id2set: string[],
    createdBy: string,
  ): Observable<unknown> {
    return of(void 0).pipe(
      concatMap(() => this._deleteInverse(session, id1)),
      concatMap(() => this._createInverse(session, id1, id2set, createdBy)),
    );
  }

  public count<TFilter>(
    id1: string,
    query: IQueryRelationshipsDto<TFilter>,
  ): Observable<number> {
    const { model, descriptor } = this.definition;

    if (isNullOrUndefined(query.filter)) {
      const req = model.find({ id1 }).countDocuments();

      return from(req.exec());
    }

    // TODO: this method is very expensive but currently will suffice, should probably start from related direction
    const relationshipsFilter = { id1 };
    const relatedFilter = filterDtoToQuery(query.filter);

    const req = model.find(relationshipsFilter).populate({
      path: 'id2',
      model: descriptor.related().name,
      match: relatedFilter,
    });

    return from(req.exec()).pipe(
      concatAll(),
      map((relationship) => relationship.toObject()),
      map(({ id2 }) => id2),
      filter(isNotNullOrUndefined),
      toArray(),
      count(),
    );
  }

  public find<TFilter>(
    id1: string,
    query: IQueryRelationshipsDto<TFilter>,
  ): Observable<Relationship[]> {
    const { model, descriptor } = this.definition;

    if (isNullOrUndefined(query.filter)) {
      const req = model
        .find({ id1 })
        .skip(query.page.offset)
        .limit(query.page.limit);

      return from(req.exec()).pipe(
        concatAll(),
        map((relationship) => relationship.toObject()),
        map((relationship) => this.transform(relationship)),
        toArray(),
      );
    }

    // TODO: this method is very expensive but currently will suffice, should probably start from related direction
    const relationshipsFilter = { id1 };
    const relatedFilter = filterDtoToQuery(query.filter);

    const req = model.find(relationshipsFilter).populate({
      path: 'id2',
      model: descriptor.related().name,
      match: relatedFilter,
    });

    return from(req.exec()).pipe(
      concatAll(),
      map((relationship) => relationship.toObject()),
      filter(({ id2 }) => isNotNullOrUndefined(id2)),
      skip(query.page.offset),
      take(query.page.limit),
      map((relationship) => ({
        ...relationship,
        // TODO: correct typing
        id2: (relationship.id2 as unknown as TRelated).id,
      })),
      map((relationship) => this.transform(relationship)),
      toArray(),
    );
  }

  public countRelated<TFilter>(
    id1: string,
    query: IQueryRelationshipsDto<TFilter>,
  ): Observable<number> {
    const { model, descriptor } = this.definition;

    if (isNullOrUndefined(query.filter)) {
      const req = model.find({ id1 }).countDocuments();

      return from(req.exec());
    }

    // TODO: this method is very expensive but currently will suffice, should probably start from related direction
    const relationshipsFilter = { id1 };
    const relatedFilter = filterDtoToQuery(query.filter);

    const req = model.find(relationshipsFilter).populate({
      path: 'id2',
      model: descriptor.related().name,
      match: relatedFilter,
    });

    return from(req.exec()).pipe(
      concatAll(),
      map((relationship) => relationship.toObject()),
      map(({ id2 }) => id2),
      filter(isNotNullOrUndefined),
      toArray(),
      count(),
    );
  }

  public findRelated<TFilter = never>(
    id1: string,
    query: IQueryRelationshipsDto<TFilter>,
  ): Observable<TRelated[]> {
    const { model, descriptor } = this.definition;

    // TODO: this method is very expensive but currently will suffice, should probably start from related direction
    const relationshipsFilter = { id1 };
    const relatedFilter = filterDtoToQuery(query.filter ?? {});

    const req = model.find(relationshipsFilter).populate({
      path: 'id2',
      model: descriptor.related().name,
      match: relatedFilter,
    });

    return from(req.exec()).pipe(
      concatAll(),
      map((relationship) => relationship.toObject()),
      map(({ id2 }) => id2),
      filter(isNotNullOrUndefined),
      skip(query.page.offset),
      take(query.page.limit),
      map((related) => this.transformRelated(related)),
      toArray(),
    );
  }

  public create(
    id1: string,
    id2set: string[],
    createdBy: string,
  ): Observable<Relationship[]> {
    return this.runAsTransaction((session) =>
      of(void 0).pipe(
        concatMap(() => {
          if (this.definition.descriptor.kind === 'toMany') {
            return this._create(session, id1, id2set, createdBy);
          }

          if (id2set.length !== 1) {
            throw new InvalidIdSetException(
              'Cannot create [toOne] relationship with multiple id2 values',
            );
          }

          return this._update(session, id1, id2set, createdBy);
        }),
        concatMap(() => {
          if (this.inverseDefinition?.descriptor.kind === 'toMany') {
            return this._createInverse(session, id1, id2set, createdBy);
          }

          // no check is required since id1 and id2 will be switched

          return this._updateInverse(session, id1, id2set, createdBy);
        }),
        concatMap(() => this.read(id1, id2set)),
      ),
    );
  }

  public read(id1: string, id2set?: string[]): Observable<Relationship[]> {
    const { model } = this.definition;

    const relationshipsFilter = { id1 };

    if (isNotNullOrUndefined(id2set)) {
      relationshipsFilter['id2'] = { $in: id2set };
    }

    return from(model.find(relationshipsFilter).exec()).pipe(
      concatAll(),
      map((relationship) => relationship.toObject()),
      map((relationship) => this.transform(relationship)),
      toArray(),
    );
  }

  public readRelated(id1: string, id2set?: string[]): Observable<TRelated[]> {
    const { model, descriptor } = this.definition;

    const relationshipsFilter = { id1 };

    if (isNotNullOrUndefined(id2set)) {
      relationshipsFilter['id2'] = { $in: id2set };
    }

    const req = model.find(relationshipsFilter).populate({
      path: 'id2',
      model: descriptor.related().name,
    });

    return from(req.exec()).pipe(
      concatAll(),
      map((relationship) => relationship.toObject()),
      map(({ id2 }) => id2),
      filter(isNotNullOrUndefined),
      map((related) => this.transformRelated(related)),
      toArray(),
    );
  }

  public update(
    id1: string,
    id2set: string[],
    createdBy: string,
  ): Observable<Relationship[]> {
    return this.runAsTransaction((session) =>
      of(void 0).pipe(
        concatMap(() => this._update(session, id1, id2set, createdBy)),
        concatMap(() => this._updateInverse(session, id1, id2set, createdBy)),
        concatMap(() => this.read(id1, id2set)),
      ),
    );
  }

  public delete(id1: string, id2set?: string[]): Observable<void> {
    return this.runAsTransaction((session) =>
      of(void 0).pipe(
        concatMap(() => this._delete(session, id1, id2set)),
        concatMap(() => this._deleteInverse(session, id1, id2set)),
        map(() => void 0),
      ),
    );
  }
}
