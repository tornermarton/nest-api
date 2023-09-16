import { Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  concatAll,
  concatMap,
  forkJoin,
  from,
  Observable,
  of,
  reduce,
  toArray,
} from 'rxjs';
import { map } from 'rxjs/operators';

import { EntityManagerService } from './entity-manager.service';
import { Entity, isNotNullOrUndefined } from '../../core';
import { IQueryEntitiesDto, IQueryEntityDto } from '../../dto';
import {
  EntityCreateDto,
  EntityRepository,
  EntityUpdateDto,
  RelationshipDescriptor,
  RelationshipRepository,
} from '../../repository';
import {
  EntitiesResponse,
  EntityResponse,
  RelationshipResponse,
  RelationshipsResponse,
} from '../../response';

export type EntityManagerEntityDefinition<TEntity extends Entity> = {
  type: Type<TEntity>;
  repository: EntityRepository<TEntity>;
};

export type EntityManagerRelationshipDefinition<TRelated extends Entity> = {
  descriptor: RelationshipDescriptor<TRelated>;
  repository: RelationshipRepository<TRelated>;
};

// TODO: maybe move this logic to relationship repo?
type TypedId2Set<T> = [T] extends [Array<unknown>] ? string[] : [string];

type TypedRelationshipResponse<T> = [T] extends [Array<unknown>]
  ? RelationshipsResponse
  : RelationshipResponse;

type TypedRelatedResponse<T, V> = [T] extends [Array<unknown>]
  ? EntitiesResponse<V>
  : EntityResponse<V | null>;

export class EntityManager<
  TEntity extends Entity,
  TRelationships extends Extract<keyof TEntity, string> = never,
> {
  private readonly _service: EntityManagerService;

  private readonly _entity: EntityManagerEntityDefinition<TEntity>;
  private readonly _relationships: Record<
    string,
    EntityManagerRelationshipDefinition<any>
  >;

  constructor(
    service: EntityManagerService,
    entity: EntityManagerEntityDefinition<TEntity>,
    relationships?: Record<
      TRelationships,
      EntityManagerRelationshipDefinition<any>
    >,
  ) {
    this._service = service;

    this._entity = entity;
    this._relationships = relationships ?? {};
  }

  private populateRelationships<
    TInclude extends Extract<keyof TEntity, TRelationships>,
  >(
    entity: TEntity,
    include: TInclude[] = [],
  ): Observable<{ entity: Record<string, unknown>; included: unknown[] }> {
    return from(Object.keys(this._relationships) as TRelationships[]).pipe(
      map((key) => {
        if (include.includes(key as TInclude)) {
          return this.findRelated(key, entity.id).pipe(
            map(({ data }) => ({
              relationships: {
                [key]: Array.isArray(data)
                  ? data.map(({ id }) => id)
                  : data !== null
                  ? data.id
                  : undefined,
              },
              included: Array.isArray(data)
                ? data
                : data !== null
                ? [data]
                : [],
            })),
          );
        } else {
          return this.findRelationship(key, entity.id).pipe(
            map(({ data }) => ({
              relationships: { [key]: data },
              included: [],
            })),
          );
        }
      }),
      toArray(),
      concatMap((observables) => forkJoin(observables)),
      concatAll(),
      reduce((acc, { relationships, included }) => ({
        relationships: {
          ...acc.relationships,
          ...relationships,
        },
        included: [...acc.included, ...included],
      })),
      map(({ relationships, included }) => ({
        entity: { ...entity, ...relationships },
        included: included,
      })),
    );
  }

  public transform<TInclude extends Extract<keyof TEntity, TRelationships>>(
    entity: TEntity,
    include: TInclude[] = [],
  ): Observable<{ entity: TEntity; included: unknown[] }> {
    return this.populateRelationships(entity, include).pipe(
      map(({ entity, included }) => ({
        entity: plainToInstance(this._entity.type, entity, {
          excludeExtraneousValues: true,
        }),
        included,
      })),
    );
  }

  public find<TFilter, TInclude extends Extract<keyof TEntity, TRelationships>>(
    query: IQueryEntitiesDto<TEntity, TFilter, TInclude>,
    options?: { count: boolean },
  ): Observable<EntitiesResponse<TEntity>> {
    const entities$: Observable<{ entities: TEntity[]; included?: unknown[] }> =
      this._entity.repository.find(query).pipe(
        concatAll(),
        concatMap((entity) => this.transform(entity, query.include)),
        reduce(
          (acc, { entity, included }) => ({
            entities: [...acc.entities, entity],
            included: [...acc.included, ...included],
          }),
          { entities: [] as TEntity[], included: [] as unknown[] },
        ),
        map(({ entities, included }) => ({
          entities,
          included: query.include.length > 0 ? included : undefined,
        })),
      );
    const count$: Observable<number | undefined> = options?.count
      ? this._entity.repository.count(query)
      : of(undefined);

    return forkJoin([entities$, count$]).pipe(
      map(
        ([{ entities, included }, total]) =>
          new EntitiesResponse(entities, included, total),
      ),
    );
  }

  public create(
    dto: EntityCreateDto<TEntity>,
  ): Observable<EntityResponse<TEntity>> {
    return this._entity.repository.create(dto).pipe(
      concatMap((entity) => this.transform(entity)),
      map(({ entity }) => new EntityResponse(entity)),
    );
  }

  public read<TInclude extends Extract<keyof TEntity, TRelationships>>(
    id: string,
    query?: IQueryEntityDto<TEntity, TInclude>,
  ): Observable<EntityResponse<TEntity | null>> {
    return this._entity.repository.read(id).pipe(
      concatMap((entity) => {
        if (isNotNullOrUndefined(entity)) {
          return this.transform(entity, query?.include);
        } else {
          return of({ entity, included: undefined });
        }
      }),
      map(({ entity, included }) => ({
        entity,
        included: (query?.include?.length ?? 0) > 0 ? included : undefined,
      })),
      map(({ entity, included }) => new EntityResponse(entity, included)),
    );
  }

  public update(
    id: string,
    dto: EntityUpdateDto<TEntity>,
  ): Observable<EntityResponse<TEntity | null>> {
    return this._entity.repository.update(id, dto).pipe(
      concatMap((entity) => {
        if (isNotNullOrUndefined(entity)) {
          return this.transform(entity).pipe(map(({ entity }) => entity));
        } else {
          return of(entity);
        }
      }),
      map((entity) => new EntityResponse(entity)),
    );
  }

  public delete(id: string): Observable<void> {
    return this._entity.repository.delete(id);
  }

  public findRelated<TRelated extends Entity, TKey extends TRelationships>(
    key: TKey,
    id1: string,
    options?: { count: boolean },
  ): Observable<TypedRelatedResponse<TEntity[TKey], TRelated>> {
    const definition = this._relationships[
      key
    ] as EntityManagerRelationshipDefinition<TRelated>;
    const { descriptor, repository } = definition;
    const { kind, related } = descriptor;
    const relatedManager = this._service.get<TRelated>(related());

    const entities$: Observable<TRelated[]> = repository.findRelated(id1).pipe(
      concatAll(),
      concatMap((entity) => relatedManager.transform(entity)),
      map(({ entity }) => entity),
      toArray(),
    );

    const count$: Observable<number | undefined> = options?.count
      ? repository.count(id1)
      : of(undefined);

    return forkJoin([entities$, count$]).pipe(
      map(([entities, total]) => {
        if (kind === 'toOne') {
          const entity = entities.length > 0 ? entities[0] : undefined;

          return new EntityResponse(entity);
        } else {
          return new EntitiesResponse(entities, undefined, total);
        }
      }),
      map((r) => r as TypedRelatedResponse<TEntity[TKey], TRelated>),
    );
  }

  public findRelationship<TKey extends TRelationships>(
    key: TKey,
    id1: string,
    options?: { count: boolean },
  ): Observable<TypedRelationshipResponse<TEntity[TKey]>> {
    const { descriptor, repository } = this._relationships[key];
    const { kind, related } = descriptor;

    const ids$: Observable<string[]> = repository.find(id1).pipe(
      concatAll(),
      map(({ id2 }) => id2),
      toArray(),
    );

    const count$: Observable<number | undefined> = options?.count
      ? repository.count(id1)
      : of(undefined);

    return forkJoin([ids$, count$]).pipe(
      map(([ids, total]) => {
        if (kind === 'toOne') {
          const id = ids.length > 0 ? ids[0] : undefined;

          return new RelationshipResponse(related(), id);
        } else {
          return new RelationshipsResponse(related(), ids, total);
        }
      }),
      map((r) => r as TypedRelationshipResponse<TEntity[TKey]>),
    );
  }

  public createRelationship<TKey extends TRelationships>(
    key: TKey,
    id1: string,
    id2set: TypedId2Set<TEntity[TKey]>,
    createdBy: string,
  ): Observable<TypedRelationshipResponse<TEntity[TKey]>> {
    const { descriptor, repository } = this._relationships[key];
    const { kind, related } = descriptor;

    return repository.create(id1, id2set, createdBy).pipe(
      concatAll(),
      map(({ id2 }) => id2),
      toArray(),
      map((ids) => {
        if (kind === 'toOne') {
          const id = ids.length > 0 ? ids[0] : undefined;

          return new RelationshipResponse(related(), id);
        } else {
          return new RelationshipsResponse(related(), ids);
        }
      }),
      map((r) => r as TypedRelationshipResponse<TEntity[TKey]>),
    );
  }

  public deleteRelationship<TKey extends TRelationships>(
    key: TKey,
    id1: string,
    id2set: TypedId2Set<TEntity[TKey]>,
  ): Observable<void> {
    const { repository } = this._relationships[key];

    return repository.delete(id1, id2set);
  }
}
