import { Type } from '@nestjs/common';

export class EntityResponse<T = unknown> {
  constructor(public readonly data: T, public readonly included?: unknown[]) {}
}

export class EntitiesResponse<T = unknown> {
  constructor(
    public readonly data: T[],
    public readonly included?: unknown[],
    public readonly total?: number,
  ) {}
}

export class RelatedEntityResponse<T = unknown> {
  constructor(public readonly data: T, public readonly included?: unknown[]) {}
}

export class RelatedEntitiesResponse<T = unknown> {
  constructor(
    public readonly data: T[],
    public readonly included?: unknown[],
    public readonly total?: number,
  ) {}
}

export class RelationshipResponse<T = unknown> {
  constructor(public readonly type: Type<T>, public readonly data?: string) {}
}

export class RelationshipsResponse<T = unknown> {
  constructor(
    public readonly type: Type<T>,
    public readonly data: string[],
    public readonly total?: number,
  ) {}
}
