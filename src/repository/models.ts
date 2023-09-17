import { Type } from '@nestjs/common';

import { Entity } from '../core';

type CommonRelationshipDescriptor<
  TKind extends 'toOne' | 'toMany',
  TRelated extends Entity = Entity,
> = {
  name: string;
  kind: TKind;
  related: () => Type<TRelated>;
  inverse?: Extract<keyof TRelated, string>;
};

export type ToOneRelationshipDescriptor<TRelated extends Entity = Entity> =
  CommonRelationshipDescriptor<'toOne', TRelated> & {
    nonNullable?: boolean;
  };

export type ToManyRelationshipDescriptor<TRelated extends Entity = Entity> =
  CommonRelationshipDescriptor<'toMany', TRelated>;

export type RelationshipDescriptor<TRelated extends Entity = Entity> =
  | ToOneRelationshipDescriptor<TRelated>
  | ToManyRelationshipDescriptor<TRelated>;

export type RelationshipDescriptorMap = Record<string, RelationshipDescriptor>;
