import { Type } from '@nestjs/common';
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
  isNotNullOrUndefined,
  isNullOrUndefined,
  Relationship,
} from '../../core';
import { RelationshipRepository } from '../../repository';

export class MongooseRelationshipRepository<
  TRelated extends MongooseEntity,
> extends RelationshipRepository<TRelated> {
  constructor(
    private readonly _connection: Connection,
    private readonly _related: Type<TRelated>,
    private readonly _model: Model<MongooseRelationship>,
    private readonly _inverseModel?: Model<MongooseRelationship>,
  ) {
    super();
  }

  private transform(relationship: unknown): MongooseRelationship {
    return plainToInstance(MongooseRelationship, relationship, {
      excludeExtraneousValues: true,
    });
  }

  private transformRelated(entity: unknown): TRelated {
    return plainToInstance(this._related, entity, {
      excludeExtraneousValues: true,
    });
  }

  public count(id1: string, id2set?: string[]): Observable<number> {
    const filter = { id1 };

    if (isNotNullOrUndefined(id2set)) {
      filter['id2'] = { $in: id2set };
    }

    return from(this._model.find(filter).countDocuments().exec());
  }

  public find(id1: string, id2set?: string[]): Observable<Relationship[]> {
    const filter = { id1 };

    if (isNotNullOrUndefined(id2set)) {
      filter['id2'] = { $in: id2set };
    }

    // TODO: add optimization if id2set has only one element
    const req = this._model.find(filter);

    return from(req.exec()).pipe(
      concatAll(),
      map((relationship) => relationship.toObject()),
      map((relationship) => this.transform(relationship)),
      toArray(),
    );
  }

  public findRelated(id1: string, id2set?: string[]): Observable<TRelated[]> {
    const filter = { id1 };

    if (isNotNullOrUndefined(id2set)) {
      filter['id2'] = { $in: id2set };
    }

    // TODO: add optimization if id2set has only one element
    const req = this._model
      .find(filter)
      .populate({ path: 'id2', model: this._related.name });

    return from(req.exec()).pipe(
      concatAll(),
      map((relationship) => relationship.toObject()),
      map((relationship) => this.transformRelated(relationship.id2)),
      toArray(),
    );
  }

  private _createInverse(
    session: ClientSession,
    id1: string,
    id2set: string[],
    createdBy: string,
  ): Observable<unknown> {
    if (isNullOrUndefined(this._inverseModel)) {
      return of(void 0);
    }

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

    return from(this._inverseModel.bulkWrite(queries, { session }));
  }

  private _create(
    session: ClientSession,
    id1: string,
    id2set: string[],
    createdBy: string,
  ): Observable<unknown> {
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

    return of(void 0).pipe(
      concatMap(() => from(this._model.bulkWrite(queries, { session }))),
      concatMap(() => this._createInverse(session, id1, id2set, createdBy)),
    );
  }

  public create(
    id1: string,
    id2set: string[],
    createdBy: string,
  ): Observable<Relationship[]> {
    return from(this._connection.startSession()).pipe(
      concatMap((session) =>
        of(void 0).pipe(
          tap(() => session.startTransaction()),
          concatMap(() => this._create(session, id1, id2set, createdBy)),
          concatMap(() =>
            of(void 0).pipe(
              concatMap(() => from(session.commitTransaction())),
              concatMap(() => from(session.endSession())),
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
      concatMap(() => this.find(id1, id2set)),
    );
  }

  private _deleteInverse(
    session: ClientSession,
    id1: string,
    id2set?: string[],
  ): Observable<unknown> {
    if (isNullOrUndefined(this._inverseModel)) {
      return of(void 0);
    }

    const filter = { id2: id1 };

    if (isNotNullOrUndefined(id2set)) {
      filter['id1'] = { $in: id2set };
    }

    // TODO: add optimization if id2set has only one element
    const req = this._inverseModel.deleteMany(filter);

    return from(req.session(session).exec());
  }

  private _delete(
    session: ClientSession,
    id1: string,
    id2set?: string[],
  ): Observable<unknown> {
    const filter = { id1 };

    if (isNotNullOrUndefined(id2set)) {
      filter['id2'] = { $in: id2set };
    }

    // TODO: add optimization if id2set has only one element
    const req = this._model.deleteMany(filter);

    return of(void 0).pipe(
      concatMap(() => this._deleteInverse(session, id1, id2set)),
      concatMap(() => from(req.session(session).exec())),
    );
  }

  public delete(id1: string, id2set?: string[]): Observable<void> {
    return from(this._connection.startSession()).pipe(
      concatMap((session) =>
        of(void 0).pipe(
          tap(() => session.startTransaction()),
          concatMap(() => this._delete(session, id1, id2set)),
          concatMap(() =>
            of(void 0).pipe(
              concatMap(() => from(session.commitTransaction())),
              concatMap(() => from(session.endSession())),
              map(() => void 0),
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
      map(() => void 0),
    );
  }

  public update(
    id1: string,
    id2set: string[],
    createdBy: string,
  ): Observable<Relationship[]> {
    return from(this._connection.startSession()).pipe(
      concatMap((session) =>
        of(void 0).pipe(
          tap(() => session.startTransaction()),
          concatMap(() => this._delete(session, id1)),
          concatMap(() => this._create(session, id1, id2set, createdBy)),
          concatMap(() =>
            of(void 0).pipe(
              concatMap(() => from(session.commitTransaction())),
              concatMap(() => from(session.endSession())),
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
      concatMap(() => this.find(id1, id2set)),
    );
  }
}
