import { Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Model } from 'mongoose';
import { concatAll, from, Observable, toArray } from 'rxjs';
import { map } from 'rxjs/operators';

import { MongooseEntity } from './mongoose-entity';
import { filterDtoToQuery, sortDtoToQuery } from './utils';
import { isNotNullOrUndefined } from '../../core';
import { IQueryResourcesDto } from '../../dto';
import {
  EntityCreateDto,
  EntityRepository,
  EntityUpdateDto,
} from '../../repository';

export class MongooseEntityRepository<
  TEntity extends MongooseEntity,
> extends EntityRepository<TEntity> {
  constructor(
    private readonly type: Type<TEntity>,
    private readonly model: Model<TEntity>,
  ) {
    super();
  }

  private transform(entity: unknown): TEntity {
    return plainToInstance(this.type, entity, {
      excludeExtraneousValues: true,
    });
  }

  public count<TFilter>(
    query: Omit<IQueryResourcesDto<TEntity, TFilter>, 'include'>,
  ): Observable<number> {
    const filter = filterDtoToQuery(query.filter ?? {});

    return from(this.model.find(filter).countDocuments().exec());
  }

  public find<TFilter>(
    query: Omit<IQueryResourcesDto<TEntity, TFilter>, 'include'>,
  ): Observable<TEntity[]> {
    const filter = filterDtoToQuery(query.filter ?? {});
    const sort = sortDtoToQuery(query.sort ?? []);

    const req = this.model
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

  public create(dto: EntityCreateDto<TEntity>): Observable<TEntity> {
    return from(new this.model(dto).save()).pipe(
      map((entity) => entity.toObject()),
      map((entity) => this.transform(entity)),
    );
  }

  public read(id: string): Observable<TEntity | null> {
    return from(this.model.findById(id).exec()).pipe(
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
      this.model
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
    return from(this.model.findByIdAndDelete(id).exec()).pipe(
      map((): void => void 0),
    );
  }
}
