import { Type } from '@nestjs/common';
import {
  ApiProperty,
  ApiPropertyOptional,
  IntersectionType,
  PickType,
} from '@nestjs/swagger';

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

export class NestApiResourceIdentifier {
  @ApiProperty()
  public readonly id: string;

  @ApiProperty()
  public readonly type: string;
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

export class NestApiResourceRelationshipToOne {
  @ApiProperty({ type: NestApiResourceIdentifier })
  public readonly data: NestApiResourceIdentifier;

  @ApiProperty({ type: NestApiResourceRelationshipToOneLinks })
  public readonly links: NestApiResourceRelationshipToOneLinks;
}

export class NestApiResourceRelationshipToManyLinks extends IntersectionType(
  NestApiCommonResourceRelationshipLinks,
  NestApiPaginationLinks,
) {}

export class NestApiResourceRelationshipToMany {
  @ApiProperty({ type: NestApiResourceIdentifier, isArray: true })
  public readonly data: NestApiResourceIdentifier[];

  @ApiProperty({ type: NestApiResourceRelationshipToManyLinks })
  public readonly links: NestApiResourceRelationshipToManyLinks;
}

export class NestApiResourceLinks {
  @ApiProperty()
  public readonly self: string;
}

export function NestApiResource(type: Type): Type {
  const name: string = type.name;
  const metadata: NestApiEntityMetadata = getEntityMetadata(type.prototype);
  const properties: NestApiEntityPropertiesMetadata = metadata.properties;
  const resourceTypes: Type[] = [NestApiResourceIdentifier];

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

  class Document extends NestApiCommonDocument {
    @ApiProperty({ type: NestApiResource(type) })
    public readonly data;

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

  class Document extends NestApiCommonDocument {
    @ApiProperty({ type: NestApiResource(type), isArray: true })
    public readonly data;

    @ApiProperty({ type: NestApiEntityDocumentLinks })
    public readonly links: NestApiEntityDocumentLinks;
  }
  renameType(Document, `${name}EntitiesDocument`);

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
