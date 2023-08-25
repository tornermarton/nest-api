import { Type } from '@nestjs/common';
import {
  ApiProperty,
  ApiPropertyOptional,
  IntersectionType,
  PickType,
} from '@nestjs/swagger';
import { Type as TransformType } from 'class-transformer';
import {
  ArrayNotEmpty,
  Equals,
  IsArray,
  IsDefined,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  NotEquals,
  ValidateNested,
} from 'class-validator';

import {
  getEntityMetadata,
  NestApiEntityMetadata,
  NestApiEntityFieldsMetadata,
} from './metadata';
import { isNotNullOrUndefined } from '../core';

function renameType(type: Type, name: string): void {
  Object.defineProperty(type, 'name', {
    value: name,
    writable: false,
  });
}

export function NestApiResourceType(type: Type): Type {
  const { name } = type;

  const metadata: NestApiEntityMetadata = getEntityMetadata(type.prototype);

  class NestApiResourceTypeClass {
    @ApiProperty({ enum: [metadata.type] })
    @IsNotEmpty()
    @Equals(metadata.type)
    public readonly type: string;
  }
  renameType(NestApiResourceTypeClass, `${name}ResourceType`);

  return NestApiResourceTypeClass;
}

export function NestApiResourceIdentifier(type: Type): Type {
  const { name } = type;

  class NestApiResourceIdClass {
    @ApiProperty()
    @IsNotEmpty()
    @IsUUID(4)
    public readonly id: string;
  }

  class NestApiResourceIdentifierClass extends IntersectionType(
    NestApiResourceIdClass,
    NestApiResourceType(type),
  ) {}
  renameType(NestApiResourceIdentifierClass, `${name}ResourceIdentifier`);

  return NestApiResourceIdentifierClass;
}

export class NestApiDocumentPaging {
  @ApiProperty()
  public readonly limit: number;

  @ApiProperty()
  public readonly offset: number;

  @ApiPropertyOptional()
  public readonly total?: number;
}

export class NestApiPaginationLinks {
  @ApiPropertyOptional()
  public readonly first?: string;

  @ApiPropertyOptional()
  public readonly prev?: string;

  @ApiPropertyOptional()
  public readonly next?: string;

  @ApiPropertyOptional()
  public readonly last?: string;
}

export class NestApiCommonResourceRelationshipLinks {
  @ApiProperty()
  public readonly self: string;

  @ApiProperty()
  public readonly related: string;
}

export class NestApiResourceRelationshipToOneLinks extends NestApiCommonResourceRelationshipLinks {}

export function NestApiResourceRelationshipToOne(
  type: Type,
  options?: { omitLinks?: boolean },
): Type {
  const { name } = type;
  const resourceTypes: Type[] = [];

  class ResourceIdentifier extends NestApiResourceIdentifier(type) {}
  renameType(ResourceIdentifier, `${name}ResourceIdentifier`);

  class RelationshipToOneData {
    @ApiProperty({ type: ResourceIdentifier, nullable: true })
    @NotEquals(undefined)
    @IsOptional()
    @ValidateNested()
    @TransformType(() => ResourceIdentifier)
    public readonly data: ResourceIdentifier | null;
  }
  resourceTypes.push(RelationshipToOneData);

  if (!options?.omitLinks) {
    class RelationshipToOneLinks {
      @ApiProperty({ type: NestApiResourceRelationshipToOneLinks })
      public readonly links: NestApiResourceRelationshipToOneLinks;
    }
    resourceTypes.push(RelationshipToOneLinks);
  }

  class NestApiResourceRelationshipToOneClass extends IntersectionType(
    ...resourceTypes,
  ) {}
  renameType(
    NestApiResourceRelationshipToOneClass,
    `NestApiResourceRelationshipToOne${name}`,
  );

  return NestApiResourceRelationshipToOneClass;
}

export class NestApiResourceRelationshipToManyLinks extends IntersectionType(
  NestApiCommonResourceRelationshipLinks,
  NestApiPaginationLinks,
) {}

export function NestApiResourceRelationshipToMany(
  type: Type,
  options?: { omitLinks?: boolean },
): Type {
  const { name } = type;
  const resourceTypes: Type[] = [];

  class ResourceIdentifier extends NestApiResourceIdentifier(type) {}
  renameType(ResourceIdentifier, `${name}ResourceIdentifier`);

  class RelationshipToManyData {
    @ApiProperty({ type: ResourceIdentifier, isArray: true })
    @IsDefined()
    @IsArray()
    @ValidateNested({ each: true })
    @TransformType(() => ResourceIdentifier)
    public readonly data: ResourceIdentifier[];
  }
  resourceTypes.push(RelationshipToManyData);

  if (!options?.omitLinks) {
    class RelationshipToManyLinks {
      @ApiProperty({ type: NestApiResourceRelationshipToManyLinks })
      public readonly links: NestApiResourceRelationshipToManyLinks;
    }
    resourceTypes.push(RelationshipToManyLinks);
  }

  class NestApiResourceRelationshipToManyClass extends IntersectionType(
    ...resourceTypes,
  ) {}
  renameType(
    NestApiResourceRelationshipToManyClass,
    `NestApiResourceRelationshipToMany${name}`,
  );

  return NestApiResourceRelationshipToManyClass;
}

export class NestApiResourceLinks {
  @ApiProperty()
  public readonly self: string;
}

export function NestApiResource(
  type: Type,
  options?: { omitLinks?: boolean },
): Type {
  const resourceName: string = type.name;
  const metadata: NestApiEntityMetadata = getEntityMetadata(type.prototype);
  const fields: NestApiEntityFieldsMetadata = metadata.fields;
  const resourceTypes: Type[] = [];

  // identifier
  if (isNotNullOrUndefined(metadata.fields.id)) {
    resourceTypes.push(NestApiResourceIdentifier(type));
  } else {
    resourceTypes.push(NestApiResourceType(type));
  }
  // identifier

  // attributes
  const attributes: string[] = fields.attributes.map((e) => e.name);
  if (attributes.length > 0) {
    class ResourceAttributes extends PickType(type, attributes) {}
    renameType(ResourceAttributes, `${resourceName}Attributes`);

    const required: boolean = fields.attributes
      .map((a) => a.openapi)
      .some((o) => !!o?.required);

    class ResourceWithAttributes {
      @ApiProperty({ type: ResourceAttributes, required: required })
      @IsDefined()
      @ValidateNested()
      @TransformType(() => ResourceAttributes)
      public readonly attributes: ResourceAttributes;
    }
    resourceTypes.push(ResourceWithAttributes);
  }
  // attributes

  // relationships
  if (fields.relationships.length > 0) {
    class ResourceRelationships {}
    renameType(ResourceRelationships, `${resourceName}Relationships`);

    for (const { name, type, kind, openapi } of fields.relationships) {
      const entityType: Type = type();
      const model: Type =
        kind === 'toMany'
          ? NestApiResourceRelationshipToMany(entityType, options)
          : NestApiResourceRelationshipToOne(entityType, options);
      const kindSection: string =
        kind.slice(0, 1).toUpperCase() + kind.slice(1);
      renameType(
        model,
        `${resourceName}Relationship${kindSection}${entityType.name}`,
      );

      ApiProperty({
        ...openapi,
        type: model,
        isArray: false,
      })(ResourceRelationships.prototype, name);
      if (!openapi.required) {
        IsOptional()(ResourceRelationships.prototype, name);
      }
      IsDefined()(ResourceRelationships.prototype, name);
      ValidateNested()(ResourceRelationships.prototype, name);
      TransformType(() => model)(ResourceRelationships.prototype, name);
    }

    const required: boolean = fields.relationships
      .map((r) => r.openapi)
      .some((o) => !!o?.required);

    class ResourceWithRelationships {
      @ApiProperty({ type: ResourceRelationships, required: required })
      @IsDefined()
      @ValidateNested()
      @TransformType(() => ResourceRelationships)
      public readonly relationships: ResourceRelationships;
    }
    resourceTypes.push(ResourceWithRelationships);
  }
  // relationships

  // meta
  const meta: string[] = fields.meta.map((e) => e.name);
  if (meta.length > 0) {
    class ResourceMeta extends PickType(type, meta) {}
    renameType(ResourceMeta, `${resourceName}Meta`);

    const required: boolean = fields.meta
      .map((m) => m.openapi)
      .some((o) => !!o?.required);

    class ResourceWithMeta {
      @ApiProperty({ type: ResourceMeta, required: required })
      @IsDefined()
      @ValidateNested()
      @TransformType(() => ResourceMeta)
      public readonly meta: ResourceMeta;
    }
    resourceTypes.push(ResourceWithMeta);
  }
  // meta

  // links
  if (!options?.omitLinks) {
    class ResourceWithLinks {
      @ApiProperty({ type: NestApiResourceLinks })
      public readonly links: NestApiResourceLinks;
    }
    resourceTypes.push(ResourceWithLinks);
  }
  // links

  class Resource extends IntersectionType(...resourceTypes) {}
  renameType(Resource, resourceName);

  return Resource;
}

export class NestApiDocumentMeta {
  @ApiProperty()
  public readonly status: number;

  @ApiProperty()
  public readonly reason: string;
}

export class NestApiCommonDocumentLinks {
  @ApiProperty()
  public readonly self: string;
}

export class NestApiCommonDocument {
  @ApiProperty({ type: NestApiDocumentMeta })
  public readonly meta: NestApiDocumentMeta;
}

export class NestApiEmptyDocumentLinks extends NestApiCommonDocumentLinks {}

export class NestApiEmptyDocument extends NestApiCommonDocument {
  @ApiProperty({ type: NestApiEmptyDocumentLinks })
  public readonly links: NestApiEmptyDocumentLinks;
}

export function NestApiEntityRequestDocument(type: Type): Type {
  const name: string = type.name;

  class Resource extends NestApiResource(type, { omitLinks: true }) {}
  renameType(Resource, name);

  class Document {
    @ApiProperty({ type: Resource })
    @IsDefined()
    @ValidateNested()
    @TransformType(() => Resource)
    public readonly data: Resource;
  }
  renameType(Document, `${name}EntityRequestDocument`);

  return Document;
}

export class NestApiEntityResponseDocumentLinks extends NestApiCommonDocumentLinks {}

export function NestApiEntityResponseDocument(type: Type): Type {
  const name: string = type.name;

  class Resource extends NestApiResource(type) {}
  renameType(Resource, name);

  class Document extends NestApiCommonDocument {
    @ApiProperty({ type: Resource })
    public readonly data: Resource;

    @ApiProperty({ type: NestApiEntityResponseDocumentLinks })
    public readonly links: NestApiEntityResponseDocumentLinks;
  }
  renameType(Document, `${name}EntityResponseDocument`);

  return Document;
}

export class NestApiEntitiesResponseDocumentLinks extends IntersectionType(
  NestApiCommonDocumentLinks,
  NestApiPaginationLinks,
) {}

export function NestApiEntitiesResponseDocument(type: Type): Type {
  const name: string = type.name;

  class Resource extends NestApiResource(type) {}
  renameType(Resource, name);

  class Document extends NestApiCommonDocument {
    @ApiProperty({ type: Resource, isArray: true })
    public readonly data: Resource[];

    @ApiProperty({ type: NestApiEntityResponseDocumentLinks })
    public readonly links: NestApiEntityResponseDocumentLinks;

    @ApiProperty({ type: NestApiDocumentPaging })
    public readonly paging: NestApiDocumentPaging;
  }
  renameType(Document, `${name}EntitiesResponseDocument`);

  return Document;
}

export function NestApiRelationshipRequestDocument(type: Type): Type {
  const name: string = type.name;

  class ResourceIdentifier extends NestApiResourceIdentifier(type) {}
  renameType(ResourceIdentifier, `${name}ResourceIdentifier`);

  class Document {
    @ApiProperty({ type: ResourceIdentifier, nullable: true })
    @IsOptional()
    @ValidateNested()
    @TransformType(() => ResourceIdentifier)
    public readonly data: ResourceIdentifier | null;
  }
  renameType(Document, `${name}RelationshipRequestDocument`);

  return Document;
}

export class NestApiRelationshipResponseDocumentLinks extends NestApiCommonDocumentLinks {
  @ApiProperty()
  public readonly related: string;
}

export function NestApiRelationshipResponseDocument(type: Type): Type {
  const name: string = type.name;

  class ResourceIdentifier extends NestApiResourceIdentifier(type) {}
  renameType(ResourceIdentifier, `${name}ResourceIdentifier`);

  class Document extends NestApiCommonDocument {
    @ApiProperty({ type: ResourceIdentifier, nullable: true })
    public readonly data: ResourceIdentifier | null;

    @ApiProperty({ type: NestApiRelationshipResponseDocumentLinks })
    public readonly links: NestApiRelationshipResponseDocumentLinks;
  }
  renameType(Document, `${name}RelationshipResponseDocument`);

  return Document;
}

export function NestApiRelationshipsRequestDocument(type: Type): Type {
  const name: string = type.name;

  class ResourceIdentifier extends NestApiResourceIdentifier(type) {}
  renameType(ResourceIdentifier, `${name}ResourceIdentifier`);

  class Document extends NestApiCommonDocument {
    @ApiProperty({ type: ResourceIdentifier, isArray: true })
    @IsDefined()
    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @TransformType(() => ResourceIdentifier)
    public readonly data: ResourceIdentifier[];
  }
  renameType(Document, `${name}RelationshipsRequestDocument`);

  return Document;
}

export class NestApiRelationshipsResponseDocumentLinks extends IntersectionType(
  NestApiCommonDocumentLinks,
  NestApiPaginationLinks,
) {
  @ApiProperty()
  public readonly related: string;
}

export function NestApiRelationshipsResponseDocument(type: Type): Type {
  const name: string = type.name;

  class ResourceIdentifier extends NestApiResourceIdentifier(type) {}
  renameType(ResourceIdentifier, `${name}ResourceIdentifier`);

  class Document extends NestApiCommonDocument {
    @ApiProperty({ type: ResourceIdentifier, isArray: true })
    public readonly data: ResourceIdentifier[];

    @ApiProperty({ type: NestApiRelationshipsResponseDocumentLinks })
    public readonly links: NestApiRelationshipsResponseDocumentLinks;

    @ApiProperty({ type: NestApiDocumentPaging })
    public readonly paging: NestApiDocumentPaging;
  }
  renameType(Document, `${name}RelationshipsResponseDocument`);

  return Document;
}

export class NestApiCommonError {
  @ApiProperty()
  public readonly status: number;

  @ApiProperty()
  public readonly title: string;

  @ApiPropertyOptional()
  public readonly detail?: string;
}

export class NestApiHeaderErrorSource {
  @ApiProperty()
  public readonly header: string;
}
export class NestApiHeaderError extends NestApiCommonError {
  @ApiProperty({ type: NestApiHeaderErrorSource })
  public readonly source: NestApiHeaderErrorSource;
}

export class NestApiQueryErrorSource {
  @ApiProperty()
  public readonly parameter: string;
}
export class NestApiQueryError extends NestApiCommonError {
  @ApiProperty({ type: NestApiQueryErrorSource })
  public readonly source: NestApiQueryErrorSource;
}

export class NestApiBodyErrorSource {
  @ApiProperty()
  public readonly pointer: string;
}
export class NestApiBodyError extends NestApiCommonError {
  @ApiProperty({ type: NestApiBodyErrorSource })
  public readonly source: NestApiBodyErrorSource;
}

// TODO: this does not show as correct in swagger
export class NestApiError extends IntersectionType(
  NestApiHeaderError,
  NestApiQueryError,
  NestApiBodyError,
) {}

export class NestApiErrorDocumentLinks extends NestApiCommonDocumentLinks {}

export class NestApiErrorDocument extends NestApiCommonDocument {
  @ApiProperty({ type: NestApiError, isArray: true })
  public readonly errors: NestApiError[];

  @ApiProperty({ type: NestApiErrorDocumentLinks })
  public readonly links: NestApiErrorDocumentLinks;
}
