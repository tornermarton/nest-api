import { Type } from '@nestjs/common';
import { ApiPropertyOptions } from '@nestjs/swagger';

import {
  NEST_API_ENTITY_METADATA_KEY,
  NEST_API_ENTITY_FIELDS_METADATA_KEY,
} from './constants';
import { isNullOrUndefined } from '../core';

export type NestApiEntityFieldsMetadata = {
  id?: { name: string; openapi: ApiPropertyOptions };
  attributes: { name: string; openapi: ApiPropertyOptions }[];
  // eslint-disable-next-line @typescript-eslint/ban-types
  relationships: {
    name: string;
    type: () => Type;
    kind: 'toOne' | 'toMany';
    openapi: ApiPropertyOptions;
  }[];
  meta: { name: string; openapi: ApiPropertyOptions }[];
};

export type NestApiEntityMetadata = {
  type: string;
  fields: NestApiEntityFieldsMetadata;
};

// eslint-disable-next-line @typescript-eslint/ban-types
export function getEntityMetadata(target: Function): NestApiEntityMetadata {
  const reflected: NestApiEntityMetadata | undefined = Reflect.getMetadata(
    NEST_API_ENTITY_METADATA_KEY,
    target,
  );

  if (isNullOrUndefined(reflected)) {
    // TODO: lib error
    throw new Error(
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
