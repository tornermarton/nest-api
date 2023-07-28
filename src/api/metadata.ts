import {
  NEST_API_ENTITY_METADATA_KEY,
  NEST_API_ENTITY_PROPERTIES_METADATA_KEY,
} from './constants';
import { isNullOrUndefined } from '../core';

export type NestApiEntityPropertiesMetadata = {
  id: { name: string };
  attributes: { name: string }[];
  relationships: { name: string; type: string; isArray: boolean }[];
  meta: { name: string }[];
};

export type NestApiEntityMetadata = {
  type: string;
  properties: NestApiEntityPropertiesMetadata;
};

// eslint-disable-next-line @typescript-eslint/ban-types
export function getEntityMetadata(target: Function): NestApiEntityMetadata {
  const reflected: NestApiEntityMetadata | undefined = Reflect.getMetadata(
    NEST_API_ENTITY_METADATA_KEY,
    target,
  );

  if (isNullOrUndefined(reflected)) {
    // TODO: lib error
    throw new Error('Target must be a decorated NestApiEntity');
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

export function getEntityPropertiesMetadata(
  // eslint-disable-next-line @typescript-eslint/ban-types
  target: Object,
): Partial<NestApiEntityPropertiesMetadata> {
  const reflected: Partial<NestApiEntityPropertiesMetadata> | undefined =
    Reflect.getMetadata(NEST_API_ENTITY_PROPERTIES_METADATA_KEY, target);

  if (isNullOrUndefined(reflected)) {
    return {};
  }

  return reflected;
}

export function setEntityPropertiesMetadata(
  // eslint-disable-next-line @typescript-eslint/ban-types
  target: Object,
  metadata: Partial<NestApiEntityPropertiesMetadata>,
): void {
  Reflect.defineMetadata(
    NEST_API_ENTITY_PROPERTIES_METADATA_KEY,
    metadata,
    target,
  );
}
