import { plainToInstance } from 'class-transformer';
import { Connection, Model, ClientSession } from 'mongoose';
import {
  catchError,
  concatAll,
  concatMap,
  from,
  Observable,
  of,
  tap,
  throwError,
  toArray,
} from 'rxjs';
import { map } from 'rxjs/operators';

import { MongooseEntity } from './mongoose-entity';
import { MongooseRelationship } from './mongoose-relationship';
import {
  Entity,
  isNotNullOrUndefined,
  isNullOrUndefined,
  Relationship,
} from '../../core';
import {
  RelationshipDescriptor,
  RelationshipRepository,
} from '../../repository';

export type MongooseRelationshipDefinition<TRelated extends Entity> = {
  descriptor: RelationshipDescriptor<TRelated>;
  model: Model<MongooseRelationship>;
};

export class MongooseRelationshipRepository<
  TRelated extends MongooseEntity,
> extends RelationshipRepository<TRelated> {
  constructor(
    private readonly _connection: Connection,
    private readonly _definition: MongooseRelationshipDefinition<TRelated>,
    private readonly _inverseDefinition?: MongooseRelationshipDefinition<any>,
  ) {
    super();
  }

  private runAsTransaction<T>(
    method: (session: ClientSession) => Observable<T>,
  ): Observable<T> {
    return from(this._connection.startSession()).pipe(
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
    return plainToInstance(this._definition.descriptor.related(), entity, {
      excludeExtraneousValues: true,
    });
  }

  private _createInverse(
    session: ClientSession,
    id1: string,
    id2set: string[],
    createdBy: string,
  ): Observable<unknown> {
    if (isNullOrUndefined(this._inverseDefinition)) {
      return of(void 0);
    }

    const { model } = this._inverseDefinition;

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
    const { model } = this._definition;

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
    if (isNullOrUndefined(this._inverseDefinition)) {
      return of(void 0);
    }

    const { model } = this._inverseDefinition;

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
    const { model } = this._definition;

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

  public count(id1: string, id2set?: string[]): Observable<number> {
    const { model } = this._definition;

    const filter = { id1 };

    if (isNotNullOrUndefined(id2set)) {
      filter['id2'] = { $in: id2set };
    }

    return from(model.find(filter).countDocuments().exec());
  }

  public find(id1: string, id2set?: string[]): Observable<Relationship[]> {
    const { model } = this._definition;

    const filter = { id1 };

    if (isNotNullOrUndefined(id2set)) {
      filter['id2'] = { $in: id2set };
    }

    // TODO: add optimization if id2set has only one element
    const req = model.find(filter);

    return from(req.exec()).pipe(
      concatAll(),
      map((relationship) => relationship.toObject()),
      map((relationship) => this.transform(relationship)),
      toArray(),
    );
  }

  public findRelated(id1: string, id2set?: string[]): Observable<TRelated[]> {
    const { model } = this._definition;

    const filter = { id1 };

    if (isNotNullOrUndefined(id2set)) {
      filter['id2'] = { $in: id2set };
    }

    // TODO: add optimization if id2set has only one element
    const req = model.find(filter).populate({
      path: 'id2',
      model: this._definition.descriptor.related().name,
    });

    return from(req.exec()).pipe(
      concatAll(),
      map((relationship) => relationship.toObject()),
      map((relationship) => this.transformRelated(relationship.id2)),
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
          if (this._definition.descriptor.kind === 'toMany') {
            return this._create(session, id1, id2set, createdBy);
          }

          if (id2set.length !== 1) {
            // TODO: error
            throw new Error(
              'Cannot create [toOne] relationship with multiple id2 values',
            );
          }

          return this._update(session, id1, id2set, createdBy);
        }),
        concatMap(() => {
          if (this._inverseDefinition?.descriptor.kind === 'toMany') {
            return this._createInverse(session, id1, id2set, createdBy);
          }

          // no check is required since id1 and id2 will be switched

          return this._updateInverse(session, id1, id2set, createdBy);
        }),
        concatMap(() => this.find(id1, id2set)),
      ),
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
        concatMap(() => this.find(id1, id2set)),
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
