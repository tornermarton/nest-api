import { Type } from '@nestjs/common';
import { ApiPropertyOptions, ApiQueryOptions } from '@nestjs/swagger';

import {
  NEST_API_ENTITY_METADATA_KEY,
  NEST_API_ENTITY_FIELDS_METADATA_KEY,
  NEST_API_QUERY_METADATA_KEY,
} from './constants';
import {
  Entity,
  isNotNullOrUndefined,
  isNullOrUndefined,
  UnknownEntityException,
  UnknownRelationshipException,
} from '../core';
import { RelationshipDescriptor } from '../repository';

export type NestApiEntityFieldsMetadata = {
  id?: { name: string; openapi: ApiPropertyOptions };
  attributes: { name: string; openapi: ApiPropertyOptions }[];
  // eslint-disable-next-line @typescript-eslint/ban-types
  relationships: {
    name: string;
    // TODO: any might not be the best here
    descriptor: RelationshipDescriptor<any>;
    openapi: ApiPropertyOptions;
  }[];
  meta: { name: string; openapi: ApiPropertyOptions }[];
};

export type NestApiEntityMetadata = {
  type: string;
  fields: NestApiEntityFieldsMetadata;
};

export type NestApiQueryParameterMetadata = {
  type?: Type;
  openapi: ApiQueryOptions;
};

export type NestApiQueryMetadata = {
  parameters: NestApiQueryParameterMetadata[];
};

// eslint-disable-next-line @typescript-eslint/ban-types
export function getEntityMetadata(target: Function): NestApiEntityMetadata {
  const reflected: NestApiEntityMetadata | undefined = Reflect.getMetadata(
    NEST_API_ENTITY_METADATA_KEY,
    target,
  );

  if (isNullOrUndefined(reflected)) {
    throw new UnknownEntityException(
      `Target [${target.name}] must be decorated  with @NestApiEntity()`,
    );
  }

  return reflected;
}
export function setEntityMetadata(
  // eslint-disable-next-line @typescript-eslint/ban-types
  target: Function,
  metadata: NestApiEntityMetadata,
): void {
  Reflect.defineMetadata(NEST_API_ENTITY_METADATA_KEY, metadata, target);
}

export function getEntityFieldsMetadata(
  // eslint-disable-next-line @typescript-eslint/ban-types
  target: Object,
): Partial<NestApiEntityFieldsMetadata> {
  const reflected: Partial<NestApiEntityFieldsMetadata> | undefined =
    Reflect.getMetadata(NEST_API_ENTITY_FIELDS_METADATA_KEY, target);

  if (isNullOrUndefined(reflected)) {
    return {};
  }

  return reflected;
}

export function setEntityFieldsMetadata(
  // eslint-disable-next-line @typescript-eslint/ban-types
  target: Object,
  metadata: Partial<NestApiEntityFieldsMetadata>,
): void {
  Reflect.defineMetadata(NEST_API_ENTITY_FIELDS_METADATA_KEY, metadata, target);
}

export function getInverseRelationshipDescriptor<TRelated extends Entity>({
  name,
  related,
  inverse,
}: RelationshipDescriptor<TRelated>): RelationshipDescriptor<any> | null {
  if (isNullOrUndefined(inverse)) {
    return null;
  }

  const type: Type = related();
  const metadata = getEntityMetadata(type.prototype);
  const { relationships } = metadata.fields;
  const relationship = relationships.find(({ name }) => name === inverse);

  if (isNullOrUndefined(relationship)) {
    throw new UnknownRelationshipException(
      `Could not find inverse relationship [${inverse}] on [${type.name}] for relationship [${name}]`,
    );
  }

  return relationship.descriptor;
}

export function getRelationshipDescriptors<TEntity extends Entity>(
  type: Type<TEntity>,
): RelationshipDescriptor<any>[] {
  const metadata: NestApiEntityMetadata = getEntityMetadata(type.prototype);
  const { relationships } = metadata.fields;
  const descriptors = relationships.map(({ descriptor }) => descriptor);
  const inverseDescriptors = descriptors
    .map(getInverseRelationshipDescriptor)
    .filter(isNotNullOrUndefined);

  return [...descriptors, ...inverseDescriptors];
}

export function getRelationshipDescriptorByKey<
  TEntity extends Entity,
  TKey extends Extract<keyof TEntity, string>,
>(type: Type<TEntity>, key: TKey): RelationshipDescriptor<any> {
  const metadata: NestApiEntityMetadata = getEntityMetadata(type.prototype);

  const descriptor: RelationshipDescriptor<any> | undefined =
    metadata.fields.relationships.find(({ name }) => name === key)?.descriptor;

  if (isNullOrUndefined(descriptor)) {
    throw new UnknownRelationshipException(
      `Could not find relationship [${key}] on [${type.name}]`,
    );
  }

  return descriptor;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function getQueryMetadata(target: Object): NestApiQueryMetadata {
  const reflected: NestApiQueryMetadata | undefined = Reflect.getMetadata(
    NEST_API_QUERY_METADATA_KEY,
    target,
  );

  if (isNullOrUndefined(reflected)) {
    return { parameters: [] };
  }

  return reflected;
}
export function setQueryMetadata(
  // eslint-disable-next-line @typescript-eslint/ban-types
  target: Object,
  metadata: NestApiQueryMetadata,
): void {
  Reflect.defineMetadata(NEST_API_QUERY_METADATA_KEY, metadata, target);
}
