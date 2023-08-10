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
  IsUUID,
  ValidateNested,
} from 'class-validator';

import {
  getEntityMetadata,
  NestApiEntityMetadata,
  NestApiEntityPropertiesMetadata,
} from './metadata';

function renameType(type: Type, name: string): void {
  Object.defineProperty(type, 'name', {
    value: name,
    writable: false,
  });
}

export function NestApiResourceIdentifier(type: Type): Type {
  const { name } = type;

  const metadata: NestApiEntityMetadata = getEntityMetadata(type.prototype);

  class NestApiResourceIdentifierClass {
    @ApiProperty()
    @IsNotEmpty()
    @IsUUID(4)
    public readonly id: string;

    @ApiProperty({ enum: [metadata.type] })
    @IsNotEmpty()
    @Equals(metadata.type)
    public readonly type: string;
  }
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

export function NestApiResourceRelationshipToOne(type: Type): Type {
  const { name } = type;

  class ResourceIdentifier extends NestApiResourceIdentifier(type) {}
  renameType(ResourceIdentifier, `${name}ResourceIdentifier`);

  class NestApiResourceRelationshipToOneClass {
    @ApiProperty({ type: ResourceIdentifier })
    public readonly data: ResourceIdentifier;

    @ApiProperty({ type: NestApiResourceRelationshipToOneLinks })
    public readonly links: NestApiResourceRelationshipToOneLinks;
  }

  return NestApiResourceRelationshipToOneClass;
}

export class NestApiResourceRelationshipToManyLinks extends IntersectionType(
  NestApiCommonResourceRelationshipLinks,
  NestApiPaginationLinks,
) {}

export function NestApiResourceRelationshipToMany(type: Type): Type {
  const { name } = type;

  class ResourceIdentifier extends NestApiResourceIdentifier(type) {}
  renameType(ResourceIdentifier, `${name}ResourceIdentifier`);

  class NestApiResourceRelationshipToManyClass {
    @ApiProperty({ type: ResourceIdentifier, isArray: true })
    public readonly data: ResourceIdentifier[];

    @ApiProperty({ type: NestApiResourceRelationshipToOneLinks })
    public readonly links: NestApiResourceRelationshipToOneLinks;
  }

  return NestApiResourceRelationshipToManyClass;
}

export class NestApiResourceLinks {
  @ApiProperty()
  public readonly self: string;
}

export function NestApiResource(type: Type): Type {
  const name: string = type.name;
  const metadata: NestApiEntityMetadata = getEntityMetadata(type.prototype);
  const properties: NestApiEntityPropertiesMetadata = metadata.properties;
  const resourceTypes: Type[] = [NestApiResourceIdentifier(type)];

  // attributes
  const attributes: string[] = properties.attributes.map((e) => e.name);
  if (attributes.length > 0) {
    class ResourceAttributes extends PickType(type, attributes) {}
    renameType(ResourceAttributes, `${name}Attributes`);

    class ResourceWithAttributes {
      @ApiProperty({ type: ResourceAttributes })
      public readonly attributes: ResourceAttributes;
    }
    resourceTypes.push(ResourceWithAttributes);
  }
  // attributes

  // relationships
  const relationships: string[] = properties.relationships.map((e) => e.name);
  if (relationships.length > 0) {
    class ResourceRelationships extends PickType(type, relationships) {}
    renameType(ResourceRelationships, `${name}Relationships`);

    class ResourceWithRelationships {
      @ApiProperty({ type: ResourceRelationships })
      public readonly relationships: ResourceRelationships;
    }
    resourceTypes.push(ResourceWithRelationships);
  }
  // relationships

  // meta
  const meta: string[] = properties.meta.map((e) => e.name);
  if (meta.length > 0) {
    class ResourceMeta extends PickType(type, meta) {}
    renameType(ResourceMeta, `${name}Meta`);

    class ResourceWithMeta {
      @ApiProperty({ type: ResourceMeta })
      public readonly meta: ResourceMeta;
    }
    resourceTypes.push(ResourceWithMeta);
  }
  // meta

  // links
  class ResourceWithLinks {
    @ApiProperty({ type: NestApiResourceLinks })
    public readonly links: NestApiResourceLinks;
  }
  resourceTypes.push(ResourceWithLinks);
  // links

  class Resource extends IntersectionType(...resourceTypes) {}
  renameType(Resource, name);

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

export class NestApiEntityDocumentLinks extends NestApiCommonDocumentLinks {}

export function NestApiEntityDocument(type: Type): Type {
  const name: string = type.name;

  class Resource extends NestApiResource(type) {}
  renameType(Resource, name);

  class Document extends NestApiCommonDocument {
    @ApiProperty({ type: Resource })
    public readonly data: Resource;

    @ApiProperty({ type: NestApiEntityDocumentLinks })
    public readonly links: NestApiEntityDocumentLinks;
  }
  renameType(Document, `${name}EntityDocument`);

  return Document;
}

export class NestApiEntitiesDocumentLinks extends IntersectionType(
  NestApiCommonDocumentLinks,
  NestApiPaginationLinks,
) {}

export function NestApiEntitiesDocument(type: Type): Type {
  const name: string = type.name;

  class Resource extends NestApiResource(type) {}
  renameType(Resource, name);

  class Document extends NestApiCommonDocument {
    @ApiProperty({ type: Resource, isArray: true })
    public readonly data: Resource[];

    @ApiProperty({ type: NestApiEntityDocumentLinks })
    public readonly links: NestApiEntityDocumentLinks;

    @ApiProperty({ type: NestApiDocumentPaging })
    public readonly paging: NestApiDocumentPaging;
  }
  renameType(Document, `${name}EntitiesDocument`);

  return Document;
}

export function NestApiRelationshipRequestDocument(type: Type): Type {
  const name: string = type.name;

  class ResourceIdentifier extends NestApiResourceIdentifier(type) {}
  renameType(ResourceIdentifier, `${name}ResourceIdentifier`);

  class Document {
    @ApiProperty({ type: ResourceIdentifier, nullable: true })
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
