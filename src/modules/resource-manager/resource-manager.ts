import { Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { omit } from 'lodash';
import {
  concatAll,
  concatMap,
  defaultIfEmpty,
  delayWhen,
  filter,
  forkJoin,
  from,
  noop,
  Observable,
  of,
  reduce,
  toArray,
} from 'rxjs';
import { map } from 'rxjs/operators';

import { ResourceManagerService } from './resource-manager.service';
import { Entity, isNotNullOrUndefined, isNullOrUndefined } from '../../core';
import {
  IQueryResourcesDto,
  IQueryResourceDto,
  IQueryRelationshipsDto,
} from '../../dto';
import {
  EntityCreateDto,
  EntityRepository,
  EntityUpdateDto,
  RelationshipDescriptor,
  RelationshipRepository,
} from '../../repository';
import {
  ResourcesResponse,
  ResourceResponse,
  RelatedResourcesResponse,
  RelatedResourceResponse,
  RelationshipResponse,
  RelationshipsResponse,
} from '../../response';

type PrimitiveType = Date | string | number | boolean | undefined | null;

type PrimitiveProperties<T> = {
  [K in keyof T as T[K] extends PrimitiveType ? K : never]: T[K];
};

type NonPrimitiveProperties<T> = {
  [K in keyof T as T[K] extends PrimitiveType ? never : K]: T[K];
};

type PrimitiveOfUnionType<T> = [T] extends [Array<infer E>]
  ? Extract<E, PrimitiveType>
  : Extract<T, PrimitiveType>;

type NonPrimitiveOfUnionType<T> = [T] extends [Array<infer E>]
  ? Exclude<E, PrimitiveType>
  : Exclude<T, PrimitiveType>;

// TODO: Entity & should be removed if possible
type ResourceEntity<TResource> = Entity & PrimitiveProperties<TResource>;
type ResourceRelationships<TResource> = NonPrimitiveProperties<TResource>;
type Id2Type<T> = PrimitiveOfUnionType<T>;
type RelatedResourceType<T> = Entity & NonPrimitiveOfUnionType<T>;

export type ResourceRelationshipKey<TResource> = Extract<
  keyof ResourceRelationships<TResource>,
  string
>;

export type ResourceCreateDto<TResource> = EntityCreateDto<
  ResourceEntity<TResource>
> &
  ResourceRelationships<TResource>;

export type ResourceUpdateDto<TResource> = EntityUpdateDto<
  ResourceEntity<TResource>
> &
  Partial<ResourceRelationships<TResource>>;

export type ResourceManagerEntityDefinition<TResource extends Entity = Entity> =
  {
    type: Type<ResourceEntity<TResource>>;
    repository: EntityRepository<ResourceEntity<TResource>>;
  };

export type ResourceManagerRelationshipDefinition<
  TRelated extends Entity = Entity,
> = {
  descriptor: RelationshipDescriptor<TRelated>;
  repository: RelationshipRepository<TRelated>;
};

export type ResourceManagerRelationshipDefinitions<T> = Record<
  ResourceRelationshipKey<T>,
  ResourceManagerRelationshipDefinition
>;

// TODO: use Id2Type instead of string to add more flexibility
type TypedId2Set<T> = [T] extends [Array<unknown>] ? string[] : [string];

type TypedRelationshipResponse<T> = [T] extends [Array<infer E>]
  ? RelationshipsResponse<E>
  : RelationshipResponse<T>;

type TypedRelatedResponse<T> = [T] extends [Array<infer E>]
  ? RelatedResourcesResponse<RelatedResourceType<E>>
  : null extends T
    ? RelatedResourceResponse<RelatedResourceType<T> | undefined>
    : RelatedResourceResponse<RelatedResourceType<T>>;

export class ResourceManager<TResource extends Entity = Entity> {
  constructor(
    private readonly service: ResourceManagerService,
    private readonly resource: Type<TResource>,
    private readonly entity: ResourceManagerEntityDefinition<TResource>,
    private readonly relationships: ResourceManagerRelationshipDefinitions<TResource>,
  ) {}

  private getRelationshipKeys(): ResourceRelationshipKey<TResource>[] {
    return Object.keys(
      this.relationships,
    ) as ResourceRelationshipKey<TResource>[];
  }

  private getRelationshipDefinition<
    TKey extends ResourceRelationshipKey<TResource>,
  >(
    key: TKey,
  ): ResourceManagerRelationshipDefinition<
    RelatedResourceType<TResource[TKey]>
  > {
    // TODO: proper typing
    return this.relationships[
      key
    ] as unknown as ResourceManagerRelationshipDefinition<
      RelatedResourceType<TResource[TKey]>
    >;
  }

  private populateRelationship(
    key: ResourceRelationshipKey<TResource>,
    entity: ResourceEntity<TResource>,
    include: ResourceRelationshipKey<TResource>[] = [],
  ): Observable<{
    relationships: Record<string, string | string[] | undefined>;
    included: unknown[];
  }> {
    if (include.includes(key)) {
      return this.readRelated(key, entity.id).pipe(
        map(({ data }) => {
          if (Array.isArray(data)) {
            const relationships = { [key]: data.map(({ id }) => id) };
            const included = data;

            return { relationships, included };
          }

          if (isNotNullOrUndefined(data)) {
            const relationships = { [key]: data.id };
            const included = [data];

            return { relationships, included };
          }

          return { relationships: { [key]: undefined }, included: [] };
        }),
      );
    } else {
      return this.readRelationship(key, entity.id).pipe(
        map(({ data }) => ({
          relationships: { [key]: data },
          included: [],
        })),
      );
    }
  }

  private populateRelationships(
    entity: ResourceEntity<TResource>,
    include: ResourceRelationshipKey<TResource>[] = [],
  ): Observable<{
    relationships: ResourceRelationships<TResource>;
    included: unknown[];
  }> {
    const relationshipKeys = this.getRelationshipKeys();

    return from(relationshipKeys).pipe(
      map((key) => this.populateRelationship(key, entity, include)),
      toArray(),
      concatMap((observables$) => forkJoin(observables$)),
      concatAll(),
      reduce((acc, { relationships, included }) => ({
        relationships: {
          ...acc.relationships,
          ...relationships,
        },
        included: [...acc.included, ...included],
      })),
      defaultIfEmpty({
        relationships: {},
        included: [],
      }),
      map(({ relationships, included }) => ({
        relationships: relationships as ResourceRelationships<TResource>,
        included: included,
      })),
    );
  }

  public transform(
    entity: ResourceEntity<TResource>,
    include: ResourceRelationshipKey<TResource>[] = [],
  ): Observable<{ resource: TResource; included: unknown[] }> {
    return this.populateRelationships(entity, include).pipe(
      map(({ relationships, included }) => {
        const plain = { ...entity, ...relationships };
        const resource = plainToInstance(this.resource, plain, {
          excludeExtraneousValues: true,
        });

        return { resource, included };
      }),
    );
  }

  public find<TFilter, TInclude extends ResourceRelationshipKey<TResource>>(
    query: IQueryResourcesDto<TResource, TFilter, TInclude>,
    options?: { count: boolean },
  ): Observable<ResourcesResponse<TResource>> {
    const resources$ = this.entity.repository.find(query).pipe(
      concatAll(),
      concatMap((entity) => this.transform(entity, query.include)),
      reduce(
        (acc, { resource, included }) => ({
          resources: [...acc.resources, resource],
          included: [...acc.included, ...included],
        }),
        {
          resources: [] as TResource[],
          included: [] as unknown[],
        },
      ),
      map(({ resources, included }) => ({
        resources,
        included: included.length > 0 ? included : undefined,
      })),
    );
    const count$ = options?.count
      ? this.entity.repository.count(query)
      : of(undefined);

    return forkJoin([resources$, count$]).pipe(
      map(
        ([{ resources, included }, total]) =>
          new ResourcesResponse(resources, included, total),
      ),
    );
  }

  private updateRelationships(
    { id, createdBy }: ResourceEntity<TResource>,
    dto: ResourceCreateDto<TResource> | ResourceUpdateDto<TResource>,
  ): Observable<void> {
    const relationshipKeys = this.getRelationshipKeys();

    return from(relationshipKeys).pipe(
      map(<TKey extends ResourceRelationshipKey<TResource>>(key: TKey) => {
        const value = dto[key];

        if (isNullOrUndefined(value)) {
          return of([]);
        }

        // TODO: proper typing
        const id2set = (Array.isArray(value) ? value : [value]) as TypedId2Set<
          TResource[TKey]
        >;

        return this.updateRelationship(key, id, id2set, createdBy);
      }),
      toArray(),
      concatMap((observables$) => forkJoin(observables$)),
      map(noop),
      defaultIfEmpty(void 0),
    );
  }

  public create(
    dto: ResourceCreateDto<TResource>,
  ): Observable<ResourceResponse<TResource>> {
    const relationshipKeys = this.getRelationshipKeys();

    // TODO: proper typing
    const entityCreateDto = omit(
      dto,
      ...relationshipKeys,
    ) as unknown as EntityCreateDto<ResourceEntity<TResource>>;

    return this.entity.repository.create(entityCreateDto).pipe(
      delayWhen((entity) => this.updateRelationships(entity, dto)),
      concatMap((entity) => this.transform(entity)),
      map(({ resource }) => new ResourceResponse(resource)),
    );
  }

  public read<TInclude extends ResourceRelationshipKey<TResource>>(
    id: string,
    query?: IQueryResourceDto<TResource, TInclude>,
  ): Observable<ResourceResponse<TResource | null>> {
    return this.entity.repository.read(id).pipe(
      filter(isNotNullOrUndefined),
      concatMap((entity) => this.transform(entity, query?.include)),
      map(({ resource, included }) => ({
        resource,
        included: included.length > 0 ? included : undefined,
      })),
      defaultIfEmpty({ resource: null, included: undefined }),
      map(({ resource, included }) => new ResourceResponse(resource, included)),
    );
  }

  public update(
    id: string,
    dto: ResourceUpdateDto<TResource>,
  ): Observable<ResourceResponse<TResource | null>> {
    const relationshipKeys = this.getRelationshipKeys();

    // TODO: proper typing
    const entityUpdateDto = omit(
      dto,
      ...relationshipKeys,
    ) as unknown as EntityUpdateDto<ResourceEntity<TResource>>;

    return this.entity.repository.update(id, entityUpdateDto).pipe(
      filter(isNotNullOrUndefined),
      delayWhen((entity) => this.updateRelationships(entity, dto)),
      concatMap((entity) => this.transform(entity)),
      map(({ resource }) => resource),
      defaultIfEmpty(null),
      map((resource) => new ResourceResponse(resource)),
    );
  }

  public delete(id: string): Observable<void> {
    return this.entity.repository.delete(id);
  }

  public findRelated<
    TKey extends ResourceRelationshipKey<TResource>,
    TFilter = never,
  >(
    key: TKey,
    id1: string,
    query: IQueryRelationshipsDto<TFilter>,
    options?: { count: boolean },
  ): Observable<TypedRelatedResponse<TResource[TKey]>> {
    const { descriptor, repository } = this.getRelationshipDefinition(key);
    const { kind, related } = descriptor;
    const relatedManager = this.service.get(related());

    const resources$: Observable<RelatedResourceType<TResource[TKey]>[]> =
      repository.findRelated(id1, query).pipe(
        concatAll(),
        concatMap((entity) => relatedManager.transform(entity)),
        map(({ resource }) => resource),
        toArray(),
      );

    const count$: Observable<number | undefined> = options?.count
      ? repository.countRelated(id1, query)
      : of(undefined);

    return forkJoin([resources$, count$]).pipe(
      map(([resources, total]) => {
        if (kind === 'toOne') {
          const resource = resources.length > 0 ? resources[0] : undefined;

          return new RelatedResourceResponse(resource);
        } else {
          return new RelatedResourcesResponse(resources, undefined, total);
        }
      }),
      map((r) => r as TypedRelatedResponse<TResource[TKey]>),
    );
  }

  public readRelated<TKey extends ResourceRelationshipKey<TResource>>(
    key: TKey,
    id1: string,
    id2set?: TypedId2Set<TResource[TKey]>,
  ): Observable<TypedRelatedResponse<TResource[TKey]>> {
    const { descriptor, repository } = this.getRelationshipDefinition(key);
    const { kind, related } = descriptor;
    const relatedManager = this.service.get(related());

    return repository.readRelated(id1, id2set).pipe(
      concatAll(),
      concatMap((entity) => relatedManager.transform(entity)),
      map(({ resource }) => resource),
      toArray(),
      map((resources) => {
        if (kind === 'toOne') {
          const resource = resources.length > 0 ? resources[0] : undefined;

          return new RelatedResourceResponse(resource);
        } else {
          return new RelatedResourcesResponse(resources);
        }
      }),
      map((r) => r as TypedRelatedResponse<TResource[TKey]>),
    );
  }

  public findRelationship<
    TKey extends ResourceRelationshipKey<TResource>,
    TFilter = never,
  >(
    key: TKey,
    id1: string,
    query: IQueryRelationshipsDto<TFilter>,
    options?: { count: boolean },
  ): Observable<TypedRelationshipResponse<TResource[TKey]>> {
    const { descriptor, repository } = this.getRelationshipDefinition(key);
    const { kind, related } = descriptor;

    const ids$: Observable<string[]> = repository.find(id1, query).pipe(
      concatAll(),
      map(({ id2 }) => id2),
      toArray(),
    );

    const count$: Observable<number | undefined> = options?.count
      ? repository.count(id1, query)
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
      map((r) => r as TypedRelationshipResponse<TResource[TKey]>),
    );
  }

  public createRelationship<TKey extends ResourceRelationshipKey<TResource>>(
    key: TKey,
    id1: string,
    id2set: TypedId2Set<TResource[TKey]>,
    createdBy: string,
  ): Observable<TypedRelationshipResponse<TResource[TKey]>> {
    const { descriptor, repository } = this.getRelationshipDefinition(key);
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
      map((r) => r as TypedRelationshipResponse<TResource[TKey]>),
    );
  }

  public readRelationship<TKey extends ResourceRelationshipKey<TResource>>(
    key: TKey,
    id1: string,
    id2set?: TypedId2Set<TResource[TKey]>,
  ): Observable<TypedRelationshipResponse<TResource[TKey]>> {
    const { descriptor, repository } = this.getRelationshipDefinition(key);
    const { kind, related } = descriptor;

    return repository.read(id1, id2set).pipe(
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
      map((r) => r as TypedRelationshipResponse<TResource[TKey]>),
    );
  }

  public updateRelationship<TKey extends ResourceRelationshipKey<TResource>>(
    key: TKey,
    id1: string,
    id2set: TypedId2Set<TResource[TKey]>,
    createdBy: string,
  ): Observable<TypedRelationshipResponse<TResource[TKey]>> {
    const { descriptor, repository } = this.getRelationshipDefinition(key);
    const { kind, related } = descriptor;

    return repository.update(id1, id2set, createdBy).pipe(
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
      map((r) => r as TypedRelationshipResponse<TResource[TKey]>),
    );
  }

  public deleteRelationship<TKey extends ResourceRelationshipKey<TResource>>(
    key: TKey,
    id1: string,
    id2set?: TypedId2Set<TResource[TKey]>,
  ): Observable<void> {
    const { repository } = this.getRelationshipDefinition(key);

    return repository.delete(id1, id2set);
  }
}
