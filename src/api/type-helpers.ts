import { Type } from '@nestjs/common';
import { ApiPropertyOptions, OmitType, PartialType } from '@nestjs/swagger';

import {
  getResourceMetadata,
  NestApiResourceMetadata,
  setResourceMetadata,
} from './metadata';
import { Entity } from '../core';

type CreateResourceDtoOmittedKeys<K extends readonly unknown[] | undefined> =
  | keyof Entity
  | Exclude<K, undefined>[number];

type PatchResourceDtoOmittedKeys<K extends readonly unknown[] | undefined> =
  | Exclude<keyof Entity, 'id'>
  | Exclude<K, undefined>[number];

function copyMetadata<O extends Entity, N, K extends keyof O>(
  oldType: Type<O>,
  newType: Type<N>,
  omit: readonly K[] = [],
  openapi: ApiPropertyOptions = {},
): void {
  const metadata: NestApiResourceMetadata = getResourceMetadata(
    oldType.prototype,
  );
  const newMetadata: NestApiResourceMetadata = {
    name: metadata.name,
    fields: {
      id: omit.includes('id' as unknown as K) ? metadata.fields.id : undefined,
      attributes: metadata.fields.attributes
        .filter((a) => !omit.includes(a.name as unknown as K))
        .map((a) => ({ ...a, openapi: { ...a.openapi, ...openapi } })),
      relationships: metadata.fields.relationships
        .filter((r) => !omit.includes(r.name as unknown as K))
        .map((r) => ({
          ...r,
          openapi: {
            ...r.openapi,
            // If it is a toMany relationship it is considered optional for request DTOs
            required:
              r.descriptor.kind === 'toOne' ? !r.descriptor.nullable : false,
            ...openapi,
          },
        })),
      meta: [],
    },
  };
  setResourceMetadata(newType.prototype, newMetadata);
}

export function CreateResourceDto<
  T extends Entity,
  K extends Extract<keyof T, string> = never,
>(
  type: Type<T>,
  omit?: readonly K[],
): Type<Omit<T, CreateResourceDtoOmittedKeys<typeof omit>>> {
  const omittedKeys: readonly K[] = omit ?? [];

  const newType: Type<Omit<T, CreateResourceDtoOmittedKeys<typeof omit>>> =
    OmitType(type, [
      ...omittedKeys,
      'id',
      'createdAt',
      'createdBy',
      'updatedAt',
      'updatedBy',
    ]);

  copyMetadata(type, newType, omittedKeys);

  return newType;
}

export function PatchResourceDto<
  T extends Entity,
  K extends Extract<keyof T, string> = never,
>(
  type: Type<T>,
  omit?: readonly K[],
): Type<Partial<Omit<T, PatchResourceDtoOmittedKeys<typeof omit>>>> {
  const omittedKeys: readonly K[] = omit ?? [];

  const newType: Type<
    Partial<Omit<T, PatchResourceDtoOmittedKeys<typeof omit>>>
  > = PartialType(
    OmitType(type, [
      ...omittedKeys,
      'createdAt',
      'createdBy',
      'updatedAt',
      'updatedBy',
    ]),
  );

  copyMetadata(type, newType, omittedKeys, { required: false });

  return newType;
}
