import { Type } from '@nestjs/common';

import { Entity } from '../core';

export type RelationshipDescriptor<
  TType extends string = string,
  TSource extends Entity = Entity,
  TTarget extends Entity = Entity,
> = {
  name: TType;
  source: Type<TSource>;
  kind: 'toOne' | 'toMany';
  target: Type<TTarget>;
  inverse?: TType;
};

export type RelationshipDescriptorMap<TType extends string = string> = Record<
  TType,
  RelationshipDescriptor<TType>
>;
