import { Type } from '@nestjs/common';
import { ApiPropertyOptions, ApiQueryOptions } from '@nestjs/swagger';

import {
  NEST_API_RESOURCE_METADATA_KEY,
  NEST_API_RESOURCE_FIELDS_METADATA_KEY,
  NEST_API_QUERY_METADATA_KEY,
} from './constants';
import {
  Entity,
  isNotNullOrUndefined,
  isNullOrUndefined,
  UnknownResourceException,
  UnknownRelationshipException,
} from '../core';
import { ResourceRelationshipKey } from '../modules';
import { RelationshipDescriptor } from '../repository';

export type NestApiResourceFieldsMetadata = {
  id?: { name: string; openapi: ApiPropertyOptions };
  attributes: { name: string; openapi: ApiPropertyOptions }[];
  relationships: {
    name: string;
    descriptor: RelationshipDescriptor;
    openapi: ApiPropertyOptions;
  }[];
  meta: { name: string; openapi: ApiPropertyOptions }[];
};

export type NestApiResourceMetadata = {
  name: string;
  fields: NestApiResourceFieldsMetadata;
};

export type NestApiQueryParameterMetadata = {
  type?: Type;
  openapi: ApiQueryOptions;
};

export type NestApiQueryMetadata = {
  parameters: NestApiQueryParameterMetadata[];
};

// eslint-disable-next-line @typescript-eslint/ban-types
export function getResourceMetadata(target: Function): NestApiResourceMetadata {
  const metadata: NestApiResourceMetadata | undefined = Reflect.getMetadata(
    NEST_API_RESOURCE_METADATA_KEY,
    target,
  );

  if (isNullOrUndefined(metadata)) {
    throw new UnknownResourceException(
      `Target [${target.name}] must be decorated  with @NestApiResource()`,
    );
  }

  return metadata;
}
export function setResourceMetadata(
  // eslint-disable-next-line @typescript-eslint/ban-types
  target: Function,
  metadata: NestApiResourceMetadata,
): void {
  Reflect.defineMetadata(NEST_API_RESOURCE_METADATA_KEY, metadata, target);
}

export function getResourceFieldsMetadata(
  // eslint-disable-next-line @typescript-eslint/ban-types
  target: Object,
): Partial<NestApiResourceFieldsMetadata> {
  const metadata: Partial<NestApiResourceFieldsMetadata> | undefined =
    Reflect.getMetadata(NEST_API_RESOURCE_FIELDS_METADATA_KEY, target);

  if (isNullOrUndefined(metadata)) {
    return {};
  }

  return metadata;
}

export function setResourceFieldsMetadata(
  // eslint-disable-next-line @typescript-eslint/ban-types
  target: Object,
  metadata: Partial<NestApiResourceFieldsMetadata>,
): void {
  Reflect.defineMetadata(
    NEST_API_RESOURCE_FIELDS_METADATA_KEY,
    metadata,
    target,
  );
}

export function getInverseRelationshipDescriptor<TRelated extends Entity>({
  name,
  related,
  inverse,
}: RelationshipDescriptor<TRelated>): RelationshipDescriptor<any> | null {
  if (isNullOrUndefined(inverse)) {
    return null;
  }

  const type: Type<TRelated> = related();
  const metadata = getResourceMetadata(type.prototype);
  const { relationships } = metadata.fields;
  const relationship = relationships.find(({ name }) => name === inverse);

  if (isNullOrUndefined(relationship)) {
    throw new UnknownRelationshipException(
      `Could not find inverse relationship [${inverse}] on [${type.name}] for relationship [${name}]`,
    );
  }

  return relationship.descriptor;
}

export function getRelationshipDescriptors<TResource extends Entity>(
  type: Type<TResource>,
): RelationshipDescriptor<any>[] {
  const metadata: NestApiResourceMetadata = getResourceMetadata(type.prototype);
  const { relationships } = metadata.fields;
  const descriptors = relationships.map(({ descriptor }) => descriptor);
  const inverseDescriptors = descriptors
    .map(getInverseRelationshipDescriptor)
    .filter(isNotNullOrUndefined);

  return [...descriptors, ...inverseDescriptors];
}

export function getRelationshipDescriptorByKey<
  TResource extends Entity,
  TKey extends ResourceRelationshipKey<TResource>,
>(type: Type<TResource>, key: TKey): RelationshipDescriptor {
  const metadata: NestApiResourceMetadata = getResourceMetadata(type.prototype);

  const descriptor: RelationshipDescriptor | undefined =
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
  const metadata: NestApiQueryMetadata | undefined = Reflect.getMetadata(
    NEST_API_QUERY_METADATA_KEY,
    target,
  );

  if (isNullOrUndefined(metadata)) {
    return { parameters: [] };
  }

  return metadata;
}
export function setQueryMetadata(
  // eslint-disable-next-line @typescript-eslint/ban-types
  target: Object,
  metadata: NestApiQueryMetadata,
): void {
  Reflect.defineMetadata(NEST_API_QUERY_METADATA_KEY, metadata, target);
}
