import { Type } from '@nestjs/common';

import {
  NestApiResourceInterface,
  NestApiResourceRelationshipInterface,
  NestApiResourceRelationshipToManyLinksInterface,
  NestApiResourceRelationshipToOneLinksInterface,
} from '../api';
import { isNotNullOrUndefined } from '../core';

export type BaseUrl = { scheme: string; host: string; port: number };

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

export class NestApiEntityResourceBuilder {
  private readonly _id: string;
  private readonly _type: string;

  private _meta?: Record<string, unknown>;
  private _attributes?: Record<string, unknown>;
  private _relationships?: Record<string, NestApiResourceRelationshipInterface>;

  constructor(id: string, type: string) {
    this._id = id;
    this._type = type;
  }

  private getSelfPath(): string {
    return `/${this._type}/${this._id}`;
  }

  public meta<T>(name: string, value: T): NestApiEntityResourceBuilder {
    this._meta = this._meta ?? {};
    this._meta[name] = value;
    return this;
  }

  public attribute<T>(name: string, value: T): NestApiEntityResourceBuilder {
    this._attributes = this._attributes ?? {};
    this._attributes[name] = value;
    return this;
  }

  private createRelationshipToOneLinks(
    type: string,
  ): NestApiResourceRelationshipToOneLinksInterface {
    return {
      self: `${this.getSelfPath()}/relationships/${type}`,
      related: `${this.getSelfPath()}/${type}`,
    };
  }

  private createRelationshipToManyLinks(
    type: string,
  ): NestApiResourceRelationshipToManyLinksInterface {
    // TODO: add paging links for ToMany
    // const limit: number = QueryDtoPage.DEFAULT_LIMIT;
    // const offset: number = QueryDtoPage.DEFAULT_OFFSET;
    // const nextOffset: number = offset + limit;

    return {
      ...this.createRelationshipToOneLinks(type),
      // first: `${this.getSelfPath()}/relationships/${type}?page[limit]=${limit}&page[offset]=${offset}`,
      // next: `${this.getSelfPath()}/relationships/${type}?page[limit]=${limit}&page[offset]=${nextOffset}`,
    };
  }

  public relationshipToOne(
    name: string,
    type: string,
    value: string | null,
  ): NestApiEntityResourceBuilder {
    this._relationships = this._relationships ?? {};

    this._relationships[name] = {
      data: isNotNullOrUndefined(value) ? { id: value, type: type } : null,
      links: this.createRelationshipToOneLinks(type),
    };

    return this;
  }

  public relationshipToMany(
    name: string,
    type: string,
    value: string[],
  ): NestApiEntityResourceBuilder {
    this._relationships = this._relationships ?? {};

    this._relationships[name] = {
      data: value.map((id) => ({
        id: id,
        type: type,
      })),
      links: this.createRelationshipToManyLinks(type),
    };

    return this;
  }

  public build(): NestApiResourceInterface {
    return {
      id: this._id,
      type: this._type,
      attributes: this._attributes,
      relationships: this._relationships,
      meta: this._meta,
      links: {
        self: this.getSelfPath(),
      },
    };
  }
}
