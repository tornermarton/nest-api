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

export type EntityManagerRelationshipDefinition = {
  descriptor: RelationshipDescriptor;
  repository: RelationshipRepository<any>;
};

export type EntityManagerDefinition<
  TEntity extends Entity,
  TRelationships extends Extract<keyof TEntity, string>,
> = {
  entity: EntityManagerEntityDefinition<TEntity>;
  relationships?: Record<TRelationships, EntityManagerRelationshipDefinition>;
};

// TODO: maybe move this logic to relationship repo?
type TypedId2Set<T> = [T] extends [Array<unknown>] ? string[] : [string];

type TypedRelationshipResponse<T> = [T] extends [Array<unknown>]
  ? RelationshipsResponse
  : RelationshipResponse;

export class EntityManager<
  TEntity extends Entity,
  TRelationships extends Extract<keyof TEntity, string> = never,
> {
  private readonly _entity: EntityManagerEntityDefinition<TEntity>;
  private readonly _relationships: Record<
    string,
    EntityManagerRelationshipDefinition
  >;

  constructor({
    entity,
    relationships,
  }: EntityManagerDefinition<TEntity, TRelationships>) {
    this._entity = entity;
    this._relationships = relationships ?? {};
  }

  private transform(entity: Record<keyof TEntity, unknown>): TEntity {
    return plainToInstance(this._entity.type, entity, {
      excludeExtraneousValues: true,
    });
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

  public find<TFilter, TExpand extends Extract<keyof TEntity, string>>(
    query: IQueryDto<TEntity, TFilter, TExpand>,
    options?: { count: boolean },
  ): Observable<EntitiesResponse<TEntity>> {
    const entities$: Observable<TEntity[]> = this._entity.repository
      .find(query)
      .pipe(
        concatAll(),
        concatMap((entity) => this.populateRelationships(entity)),
        map((entity) => this.transform(entity)),
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
      concatMap((entity) => this.populateRelationships(entity)),
      map((entity) => this.transform(entity)),
      map((entity) => new EntityResponse(entity)),
    );
  }

  public read(id: string): Observable<EntityResponse<TEntity | null>> {
    return this._entity.repository.read(id).pipe(
      concatMap((entity) => {
        if (isNotNullOrUndefined(entity)) {
          return this.populateRelationships(entity);
        } else {
          return of(entity);
        }
      }),
      map((entity) => {
        if (isNotNullOrUndefined(entity)) {
          return this.transform(entity);
        } else {
          return entity;
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
          return this.populateRelationships(entity);
        } else {
          return of(entity);
        }
      }),
      map((entity) => {
        if (isNotNullOrUndefined(entity)) {
          return this.transform(entity);
        } else {
          return entity;
        }
      }),
      map((entity) => new EntityResponse(entity)),
    );
  }

  public delete(id: string): Observable<void> {
    return this._entity.repository.delete(id);
  }

  public findRelationship<TKey extends TRelationships>(
    key: TKey,
    id1: string,
    options?: { count: boolean },
  ): Observable<TypedRelationshipResponse<TEntity[TKey]>> {
    const { descriptor, repository } = this._relationships[key];
    const { kind, target } = descriptor;

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

          return new RelationshipResponse(target, id);
        } else {
          return new RelationshipsResponse(target, ids, total);
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
    const { kind, target } = descriptor;

    return repository.create(id1, id2set, createdBy).pipe(
      concatAll(),
      map((relationship) => relationship.id2),
      toArray(),
      map((ids) => {
        if (kind === 'toOne') {
          const id = ids.length > 0 ? ids[0] : undefined;

          return new RelationshipResponse(target, id);
        } else {
          return new RelationshipsResponse(target, ids);
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
