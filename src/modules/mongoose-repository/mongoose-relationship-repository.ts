import { Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Connection, Model } from 'mongoose';
import {
  catchError,
  concatAll,
  concatMap,
  from,
  iif,
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
} from '../../repository/relationship-repository';

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

  public count(id1: string): Observable<number> {
    return from(this._model.find({ id1 }).count().exec());
  }

  public find(id1: string): Observable<Relationship[]> {
    return from(this._model.find({ id1 }).exec()).pipe(
      concatAll(),
      map((relationship) => relationship.toObject()),
      map((relationship) => this.transform(relationship)),
      toArray(),
    );
  }

  public findRelated(id1: string): Observable<TRelated[]> {
    const req = this._model
      .find({ id1 })
      .populate({ path: 'id2', model: this._related.name });

    return from(req.exec()).pipe(
      concatAll(),
      map((relationship) => relationship.toObject()),
      map((relationship) => this.transformRelated(relationship.id2)),
      toArray(),
    );
  }

  public create(dto: RelationshipCreateDto): Observable<Relationship> {
    const inverseDto: RelationshipCreateDto = {
      ...dto,
      id1: dto.id2,
      id2: dto.id1,
    };

    return from(this._connection.startSession()).pipe(
      concatMap((session) =>
        of(void 0).pipe(
          tap(() => session.startTransaction()),
          concatMap(() =>
            from(new this._model(dto).save({ session: session })),
          ),
          concatMap((relationship) =>
            iif(
              () => isNotNullOrUndefined(this._inverseModel),
              from(
                new this._inverseModel(inverseDto).save({ session: session }),
              ),
              of(void 0),
            ).pipe(
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

  public read(id1: string, id2: string): Observable<Relationship> {
    return from(this._model.findOne({ id1, id2 }).exec()).pipe(
      map((relationship) => relationship.toObject()),
      map((relationship) => this.transform(relationship)),
    );
  }

  public readRelated(id1: string, id2: string): Observable<TRelated> {
    const req = this._model
      .findOne({ id1, id2 })
      .populate({ path: 'id2', model: this._related.name });

    return from(req.exec()).pipe(
      map((relationship) => relationship.toObject()),
      map((relationship) => this.transformRelated(relationship.id2)),
    );
  }

  public delete(id1: string, id2: string): Observable<void> {
    return from(this._connection.startSession()).pipe(
      concatMap((session) =>
        of(void 0).pipe(
          tap(() => session.startTransaction()),
          concatMap(() =>
            from(
              this._inverseModel
                .findOneAndDelete({ id1: id2, id2: id1 })
                .session(session)
                .exec(),
            ),
          ),
          concatMap(() =>
            from(
              this._model
                .findOneAndDelete({ id1, id2 })
                .session(session)
                .exec(),
            ),
          ),
          concatMap(() => from(session.commitTransaction())),
          concatMap(() => from(session.endSession())),
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
