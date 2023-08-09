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
import { isNotNullOrUndefined, Relationship } from '../../core';
import {
  RelationshipCreateDto,
  RelationshipRepository,
} from '../../repository';

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

  private createInverse(
    dto: RelationshipCreateDto,
    session: ClientSession,
  ): Observable<unknown> {
    if (isNotNullOrUndefined(this._inverseModel)) {
      const inverseDto: RelationshipCreateDto = {
        ...dto,
        id1: dto.id2,
        id2: dto.id1,
      };

      const req = this._inverseModel.findOneAndUpdate(
        { id1: inverseDto.id1, id2: inverseDto.id2 },
        { $setOnInsert: inverseDto },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      return from(req.session(session).exec());
    } else {
      return of(void 0);
    }
  }

  public create(dto: RelationshipCreateDto): Observable<Relationship> {
    const req = this._model.findOneAndUpdate(
      { id1: dto.id1, id2: dto.id2 },
      { $setOnInsert: dto },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return from(this._connection.startSession()).pipe(
      concatMap((session) =>
        of(void 0).pipe(
          tap(() => session.startTransaction()),
          concatMap(() => from(req.session(session).exec())),
          concatMap((relationship) =>
            this.createInverse(dto, session).pipe(map(() => relationship)),
          ),
          concatMap((relationship) =>
            of(void 0).pipe(
              concatMap(() => from(session.commitTransaction())),
              concatMap(() => from(session.endSession())),
              map(() => relationship),
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
      map((relationship) => relationship.toObject()),
      map((relationship) => this.transform(relationship)),
    );
  }

  private deleteInverse(
    session: ClientSession,
    id1: string,
    id2set?: string[],
  ): Observable<unknown> {
    if (isNotNullOrUndefined(this._inverseModel)) {
      const filter = { id2: id1 };

      if (isNotNullOrUndefined(id2set)) {
        filter['id1'] = { $in: id2set };
      }

      // TODO: add optimization if id2set has only one element
      const req = this._inverseModel.deleteMany(filter);

      return from(req.session(session).exec());
    } else {
      return of(void 0);
    }
  }
  public delete(id1: string, id2set?: string[]): Observable<void> {
    const filter = { id1 };

    if (isNotNullOrUndefined(id2set)) {
      filter['id2'] = { $in: id2set };
    }

    // TODO: add optimization if id2set has only one element
    const req = this._model.deleteMany(filter);

    return from(this._connection.startSession()).pipe(
      concatMap((session) =>
        of(void 0).pipe(
          tap(() => session.startTransaction()),
          concatMap(() => this.deleteInverse(session, id1, id2set)),
          concatMap(() => from(req.session(session).exec())),
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
      map((): void => void 0),
    );
  }
}
