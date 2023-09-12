import { Type } from '@nestjs/common';

import { Entity } from '../core';

export type RelationshipDescriptor<TRelated extends Entity = Entity> = {
  name: string;
  kind: 'toOne' | 'toMany';
  related: () => Type<TRelated>;
  inverse?: Extract<keyof TRelated, string>;
};

export type RelationshipDescriptorMap = Record<string, RelationshipDescriptor>;
