import { Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  concatAll,
  concatMap,
  EMPTY,
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
import { IQueryDto } from '../../dto';
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

type TypedRelationshipRelatedResponse<T, V> = [T] extends [Array<unknown>]
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

  private populateRelationships(
    entity: TEntity,
  ): Observable<Record<keyof TEntity, unknown>> {
    return from(Object.keys(this._relationships) as TRelationships[]).pipe(
      map((key) =>
        this.findRelationship(key, entity.id).pipe(
          map((r) => ({ [key]: r.data })),
        ),
      ),
      toArray(),
      concatMap((observables) => forkJoin(observables)),
      concatAll(),
      reduce((acc, relationship) => ({
        ...acc,
        ...relationship,
      })),
      map((relationships) => ({ ...entity, ...relationships })),
    );
  }

  public transform(entity: TEntity): Observable<TEntity> {
    return this.populateRelationships(entity).pipe(
      map((e) =>
        plainToInstance(this._entity.type, e, {
          excludeExtraneousValues: true,
        }),
      ),
    );
  }

  public find<TFilter>(
    query: IQueryDto<TEntity, TFilter>,
    options?: { count: boolean },
  ): Observable<EntitiesResponse<TEntity>> {
    const entities$: Observable<TEntity[]> = this._entity.repository
      .find(query)
      .pipe(
        concatAll(),
        concatMap((entity) => this.transform(entity)),
        toArray(),
      );
    const count$: Observable<number> = options?.count
      ? this._entity.repository.count(query)
      : EMPTY;

    return forkJoin([entities$, count$]).pipe(
      map(([entities, total]) => new EntitiesResponse(entities, total)),
    );
  }

  public create(
    dto: EntityCreateDto<TEntity>,
  ): Observable<EntityResponse<TEntity>> {
    return this._entity.repository.create(dto).pipe(
      concatMap((entity) => this.transform(entity)),
      map((entity) => new EntityResponse(entity)),
    );
  }

  public read(id: string): Observable<EntityResponse<TEntity | null>> {
    return this._entity.repository.read(id).pipe(
      concatMap((entity) => {
        if (isNotNullOrUndefined(entity)) {
          return this.transform(entity);
        } else {
          return of(entity);
        }
      }),
      map((entity) => new EntityResponse(entity)),
    );
  }

  public update(
    id: string,
    dto: EntityUpdateDto<TEntity>,
  ): Observable<EntityResponse<TEntity | null>> {
    return this._entity.repository.update(id, dto).pipe(
      concatMap((entity) => {
        if (isNotNullOrUndefined(entity)) {
          return this.transform(entity);
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
  ): Observable<TypedRelationshipRelatedResponse<TEntity[TKey], TRelated>> {
    const definition = this._relationships[
      key
    ] as EntityManagerRelationshipDefinition<TRelated>;
    const { descriptor, repository } = definition;
    const { kind, related } = descriptor;
    const relatedManager = this._service.get<TRelated>(related());

    const entities$: Observable<TRelated[]> = repository.findRelated(id1).pipe(
      concatAll(),
      concatMap((entity) => relatedManager.transform(entity)),
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
          return new EntitiesResponse(entities, total);
        }
      }),
      map(
        (r) => r as TypedRelationshipRelatedResponse<TEntity[TKey], TRelated>,
      ),
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
      map((relationship) => relationship.id2),
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
      map((relationship) => relationship.id2),
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
