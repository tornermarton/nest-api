import { Type } from '@nestjs/common';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { Model } from 'mongoose';
import { concatAll, from, Observable, toArray } from 'rxjs';
import { map } from 'rxjs/operators';

import { MongooseEntity } from './mongoose-entity';
import { isNotNullOrUndefined } from '../../core';
import { IQueryEntitiesDto } from '../../dto';
import {
  EntityCreateDto,
  EntityRepository,
  EntityUpdateDto,
} from '../../repository';

function filterDtoToQuery(filter: unknown): Record<string, unknown> {
  return instanceToPlain(filter);
}

function sortDtoToQuery(sort: string[]): Record<string, 1 | -1> {
  return sort.reduce((acc, curr) => {
    if (curr.startsWith('-')) {
      acc[curr.substring(1)] = -1;
    } else {
      acc[curr] = 1;
    }
    return acc;
  }, {});
}

export class MongooseEntityRepository<
  TEntity extends MongooseEntity,
> extends EntityRepository<TEntity> {
  constructor(
    private readonly _type: Type<TEntity>,
    private readonly _model: Model<TEntity>,
  ) {
    super();
  }

  private transform(entity: unknown): TEntity {
    return plainToInstance(this._type, entity, {
      excludeExtraneousValues: true,
    });
  }

  public count<TFilter>(
    query: Omit<IQueryEntitiesDto<TEntity, TFilter, never>, 'include'>,
  ): Observable<number> {
    const filter = filterDtoToQuery(query.filter);

    return from(this._model.find(filter).countDocuments().exec());
  }

  public find<TFilter>(
    query: Omit<IQueryEntitiesDto<TEntity, TFilter, never>, 'include'>,
  ): Observable<TEntity[]> {
    const filter = filterDtoToQuery(query.filter);
    const sort = sortDtoToQuery(query.sort);

    const req = this._model
      .find(filter)
      .sort(sort)
      .skip(query.page.offset)
      .limit(query.page.limit);

    return from(req.exec()).pipe(
      concatAll(),
      map((entity) => entity.toObject()),
      map((entity) => this.transform(entity)),
      toArray(),
    );
  }

  public findByIds(ids: string[]): Observable<TEntity[]> {
    return from(this._model.find({ id: ids }).exec()).pipe(
      concatAll(),
      map((entity) => entity.toObject()),
      map((entity) => this.transform(entity)),
      toArray(),
    );
  }

  public create(dto: EntityCreateDto<TEntity>): Observable<TEntity> {
    return from(new this._model(dto).save()).pipe(
      map((entity) => entity.toObject()),
      map((entity) => this.transform(entity)),
    );
  }

  public read(id: string): Observable<TEntity | null> {
    return from(this._model.findById(id).exec()).pipe(
      map((result) => {
        if (isNotNullOrUndefined(result)) {
          const entity = result.toObject();

          return this.transform(entity);
        } else {
          return null;
        }
      }),
    );
  }

  public update(
    id: string,
    dto: EntityUpdateDto<TEntity>,
  ): Observable<TEntity | null> {
    return from(
      this._model
        .findByIdAndUpdate(id, dto, {
          new: true,
        })
        .exec(),
    ).pipe(
      map((result) => {
        if (isNotNullOrUndefined(result)) {
          const entity = result.toObject();

          return this.transform(entity);
        } else {
          return null;
        }
      }),
    );
  }

  public delete(id: string): Observable<void> {
    return from(this._model.findByIdAndDelete(id).exec()).pipe(
      map((): void => void 0),
    );
  }
}
