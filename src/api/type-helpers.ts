import { Type } from '@nestjs/common';
import { OmitType, PartialType } from '@nestjs/swagger';

import {
  getEntityMetadata,
  NestApiEntityMetadata,
  setEntityMetadata,
} from './metadata';
import { Entity } from '../core';

type CreateEntityDtoOmittedKeys<K extends readonly unknown[] | undefined> =
  | keyof Entity
  | Exclude<K, undefined>[number];

type PatchEntityDtoOmittedKeys<K extends readonly unknown[] | undefined> =
  | Exclude<keyof Entity, 'id'>
  | Exclude<K, undefined>[number];

function copyMetadata<O extends Entity, N, K extends keyof O>(
  oldType: Type<O>,
  newType: Type<N>,
  omit: readonly K[] = [],
): void {
  const metadata: NestApiEntityMetadata = getEntityMetadata(oldType.prototype);
  const newMetadata: NestApiEntityMetadata = {
    type: metadata.type,
    properties: {
      id: omit.includes('id' as unknown as K)
        ? metadata.properties.id
        : undefined,
      attributes: metadata.properties.attributes.filter(
        (a) => !omit.includes(a.name as unknown as K),
      ),
      relationships: metadata.properties.relationships.filter(
        (r) => !omit.includes(r.name as unknown as K),
      ),
      meta: [],
    },
  };
  setEntityMetadata(newType.prototype, newMetadata);
}

export function CreateEntityDto<
  T extends Entity,
  K extends Extract<keyof T, string> = never,
>(
  type: Type<T>,
  omit?: readonly K[],
): Type<Omit<T, CreateEntityDtoOmittedKeys<typeof omit>>> {
  const omittedKeys: readonly K[] = omit ?? [];

  const newType: Type<Omit<T, CreateEntityDtoOmittedKeys<typeof omit>>> =
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

export function PatchEntityDto<
  T extends Entity,
  K extends Extract<keyof T, string> = never,
>(
  type: Type<T>,
  omit?: readonly K[],
): Type<Partial<Omit<T, PatchEntityDtoOmittedKeys<typeof omit>>>> {
  const omittedKeys: readonly K[] = omit ?? [];

  const newType: Type<
    Partial<Omit<T, PatchEntityDtoOmittedKeys<typeof omit>>>
  > = PartialType(
    OmitType(type, [
      ...omittedKeys,
      'createdAt',
      'createdBy',
      'updatedAt',
      'updatedBy',
    ]),
  );

  copyMetadata(type, newType, omittedKeys);

  return newType;
}