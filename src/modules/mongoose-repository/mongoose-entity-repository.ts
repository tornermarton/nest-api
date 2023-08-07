import { Type } from '@nestjs/common';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { Model } from 'mongoose';
import {
  concatAll,
  concatMap,
  forkJoin,
  from,
  Observable,
  reduce,
  toArray,
} from 'rxjs';
import { map } from 'rxjs/operators';

import { MongooseEntity } from './mongoose-entity';
import { IQueryDto } from '../../query';
import {
  EntityCreateDto,
  EntityRepository,
  EntityUpdateDto,
} from '../../repository';
import { RelationshipRepository } from '../../repository/relationship-repository';

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

function expandDtoToQuery(expand: string[]): { path: string }[] {
  return expand.map((e) => ({ path: e }));
}

export class MongooseEntityRepository<
  TEntity extends MongooseEntity,
> extends EntityRepository<TEntity> {
  constructor(
    private readonly _type: Type<TEntity>,
    private readonly _model: Model<TEntity>,
    private readonly _relationships: Record<
      string,
      RelationshipRepository<any>
    > = {},
  ) {
    super();
  }

  private transform(entity: unknown): TEntity {
    return plainToInstance(this._type, entity, {
      excludeExtraneousValues: true,
    });
  }

  private fetchRelationships(id: string): Observable<Record<string, string[]>> {
    return from(Object.entries(this._relationships)).pipe(
      // TODO: handle toOne relationships
      map(([key, repository]) =>
        repository.find(id).pipe(
          concatAll(),
          map((relationship) => relationship.id2),
          toArray(),
          map((relationships) => [key, relationships] as const),
        ),
      ),
      toArray(),
      concatMap((observables) => forkJoin(observables)),
      concatAll(),
      reduce((acc, [key, relationships]) => {
        acc[key] = relationships;

        return acc;
      }, {} as Record<string, string[]>),
    );
  }

  public count<TFilter, TExpand extends Extract<keyof TEntity, string>>(
    query: IQueryDto<TEntity, TFilter, TExpand>,
  ): Observable<number> {
    const filter = filterDtoToQuery(query.filter);

    return from(this._model.find(filter).count().exec());
  }

  public find<TFilter, TExpand extends Extract<keyof TEntity, string>>(
    query: IQueryDto<TEntity, TFilter, TExpand>,
  ): Observable<TEntity[]> {
    const filter = filterDtoToQuery(query.filter);
    const sort = sortDtoToQuery(query.sort);
    const expand = expandDtoToQuery(query.expand);

    const req = this._model
      .find(filter)
      .skip(query.page.offset * query.page.limit)
      .limit(query.page.limit)
      .sort(sort)
      .populate(expand);

    return from(req.exec()).pipe(
      concatAll(),
      map((entity) => entity.toObject()),
      concatMap((entity) =>
        this.fetchRelationships(entity.id).pipe(
          map((relationships) => ({ ...entity, ...relationships })),
        ),
      ),
      map((entity) => this.transform(entity)),
      toArray(),
    );
  }

  public create(dto: EntityCreateDto<TEntity>): Observable<TEntity> {
    return from(new this._model(dto).save()).pipe(
      map((entity) => entity.toObject()),
      concatMap((entity) =>
        this.fetchRelationships(entity.id).pipe(
          map((relationships) => ({ ...entity, ...relationships })),
        ),
      ),
      map((entity) => this.transform(entity)),
    );
  }

  public read(id: string): Observable<TEntity> {
    return from(this._model.findById(id).exec()).pipe(
      map((entity) => entity.toObject()),
      concatMap((entity) =>
        this.fetchRelationships(entity.id).pipe(
          map((relationships) => ({ ...entity, ...relationships })),
        ),
      ),
      map((entity) => this.transform(entity)),
    );
  }

  public update(
    id: string,
    dto: EntityUpdateDto<TEntity>,
  ): Observable<TEntity> {
    return from(
      this._model
        .findByIdAndUpdate(id, dto, {
          new: true,
        })
        .exec(),
    ).pipe(
      map((entity) => entity.toObject()),
      concatMap((entity) =>
        this.fetchRelationships(entity.id).pipe(
          map((relationships) => ({ ...entity, ...relationships })),
        ),
      ),
      map((entity) => this.transform(entity)),
    );
  }

  public delete(id: string): Observable<void> {
    return from(this._model.findByIdAndDelete(id).exec()).pipe(
      map((): void => void 0),
    );
  }
}
