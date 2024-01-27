import { Type } from '@nestjs/common';
import {
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
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
  getResourceMetadata,
  NestApiResourceMetadata,
  NestApiResourceFieldsMetadata,
} from './metadata';
import { isNotNullOrUndefined } from '../core';

function renameType(type: Type, name: string): void {
  Object.defineProperty(type, 'name', {
    value: name,
    writable: false,
  });
}

export function NestApiResourceTypeData(type: Type): Type {
  const { name } = type;

  const metadata: NestApiResourceMetadata = getResourceMetadata(type.prototype);

  class NestApiResourceDataTypeClass {
    @ApiProperty({ enum: [metadata.name] })
    @IsNotEmpty()
    @Equals(metadata.name)
    public readonly type: string;
  }
  renameType(NestApiResourceDataTypeClass, `${name}ResourceType`);

  return NestApiResourceDataTypeClass;
}

export function NestApiResourceIdentifierData(type: Type): Type {
  const { name } = type;

  class NestApiResourceIdDataClass {
    @ApiProperty()
    @IsNotEmpty()
    @IsUUID(4)
    public readonly id: string;
  }

  class NestApiResourceIdentifierDataClass extends IntersectionType(
    NestApiResourceIdDataClass,
    NestApiResourceTypeData(type),
  ) {}
  renameType(NestApiResourceIdentifierDataClass, `${name}ResourceIdentifier`);

  return NestApiResourceIdentifierDataClass;
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
  options?: { nullable?: boolean; omitLinks?: boolean },
): Type {
  const { name } = type;
  const resourceTypes: Type[] = [];

  class ResourceIdentifierData extends NestApiResourceIdentifierData(type) {}
  renameType(ResourceIdentifierData, `${name}ResourceIdentifier`);

  class RelationshipToOneData {
    @ApiProperty({
      type: ResourceIdentifierData,
      nullable: options?.nullable,
    })
    @ValidateNested()
    @TransformType(() => ResourceIdentifierData)
    public readonly data: ResourceIdentifierData | null;
  }
  resourceTypes.push(RelationshipToOneData);

  if (!options?.nullable) {
    IsDefined()(RelationshipToOneData.prototype, 'data');
  } else {
    NotEquals(undefined)(RelationshipToOneData.prototype, 'data');
  }

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

  class ResourceIdentifierData extends NestApiResourceIdentifierData(type) {}
  renameType(ResourceIdentifierData, `${name}ResourceIdentifier`);

  class RelationshipToManyData {
    @ApiProperty({ type: ResourceIdentifierData, isArray: true })
    @IsDefined()
    @IsArray()
    @ValidateNested({ each: true })
    @TransformType(() => ResourceIdentifierData)
    public readonly data: ResourceIdentifierData[];
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

export function NestApiResourceData(
  type: Type,
  options?: { omitLinks?: boolean },
): Type {
  const resourceName: string = type.name;
  const metadata: NestApiResourceMetadata = getResourceMetadata(type.prototype);
  const fields: NestApiResourceFieldsMetadata = metadata.fields;
  const resourceDataTypes: Type[] = [];

  // identifier
  if (isNotNullOrUndefined(metadata.fields.id)) {
    resourceDataTypes.push(NestApiResourceIdentifierData(type));
  } else {
    resourceDataTypes.push(NestApiResourceTypeData(type));
  }
  // identifier

  // attributes
  const attributes: string[] = fields.attributes.map((e) => e.name);
  if (attributes.length > 0) {
    class ResourceDataAttributes extends PickType(type, attributes) {}
    renameType(ResourceDataAttributes, `${resourceName}Attributes`);

    const required: boolean = fields.attributes
      .map((a) => a.openapi)
      .some((o) => !!o?.required);

    class ResourceDataWithAttributes {
      @ApiProperty({ type: ResourceDataAttributes, required: required })
      @IsDefined()
      @ValidateNested()
      @TransformType(() => ResourceDataAttributes)
      public readonly attributes: ResourceDataAttributes;
    }
    resourceDataTypes.push(ResourceDataWithAttributes);
  }
  // attributes

  // relationships
  if (fields.relationships.length > 0) {
    class ResourceDataRelationships {}
    renameType(ResourceDataRelationships, `${resourceName}Relationships`);

    for (const { name, descriptor, openapi } of fields.relationships) {
      const relatedType: Type = descriptor.related();
      const model: Type =
        descriptor.kind === 'toMany'
          ? NestApiResourceRelationshipToMany(relatedType, options)
          : NestApiResourceRelationshipToOne(relatedType, {
              ...options,
              nullable: descriptor.nullable,
            });
      const kindSection: string =
        descriptor.kind.slice(0, 1).toUpperCase() + descriptor.kind.slice(1);
      renameType(
        model,
        `${resourceName}Relationship${kindSection}${relatedType.name}`,
      );

      ApiProperty({
        ...openapi,
        type: model,
        isArray: false,
      })(ResourceDataRelationships.prototype, name);
      if (!openapi.required) {
        IsOptional()(ResourceDataRelationships.prototype, name);
      }
      IsDefined()(ResourceDataRelationships.prototype, name);
      ValidateNested()(ResourceDataRelationships.prototype, name);
      TransformType(() => model)(ResourceDataRelationships.prototype, name);
    }

    const required: boolean = fields.relationships
      .map((r) => r.openapi)
      .some((o) => !!o?.required);

    class ResourceDataWithRelationships {
      @ApiProperty({ type: ResourceDataRelationships, required: required })
      @IsDefined()
      @ValidateNested()
      @TransformType(() => ResourceDataRelationships)
      public readonly relationships: ResourceDataRelationships;
    }
    if (!required) {
      IsOptional()(ResourceDataWithRelationships.prototype, 'relationships');
    }
    resourceDataTypes.push(ResourceDataWithRelationships);
  }
  // relationships

  // meta
  const meta: string[] = fields.meta.map((e) => e.name);
  if (meta.length > 0) {
    class ResourceDataMeta extends PickType(type, meta) {}
    renameType(ResourceDataMeta, `${resourceName}Meta`);

    const required: boolean = fields.meta
      .map((m) => m.openapi)
      .some((o) => !!o?.required);

    class ResourceDataWithMeta {
      @ApiProperty({ type: ResourceDataMeta, required: required })
      @IsDefined()
      @ValidateNested()
      @TransformType(() => ResourceDataMeta)
      public readonly meta: ResourceDataMeta;
    }
    resourceDataTypes.push(ResourceDataWithMeta);
  }
  // meta

  // links
  if (!options?.omitLinks) {
    class ResourceDataWithLinks {
      @ApiProperty({ type: NestApiResourceLinks })
      public readonly links: NestApiResourceLinks;
    }
    resourceDataTypes.push(ResourceDataWithLinks);
  }
  // links

  class ResourceData extends IntersectionType(...resourceDataTypes) {}
  renameType(ResourceData, resourceName);

  return ResourceData;
}

export class NestApiDocumentMeta {
  @ApiProperty()
  public readonly timestamp: Date;

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

export function NestApiResourceRequestDocument(type: Type): Type {
  const name: string = type.name;

  class ResourceData extends NestApiResourceData(type, { omitLinks: true }) {}
  renameType(ResourceData, name);

  class Document {
    @ApiProperty({ type: ResourceData })
    @IsDefined()
    @ValidateNested()
    @TransformType(() => ResourceData)
    public readonly data: ResourceData;
  }
  renameType(Document, `${name}ResourceRequestDocument`);

  return Document;
}

export class NestApiResourceResponseDocumentLinks extends NestApiCommonDocumentLinks {}

export function NestApiResourceResponseDocument(type: Type): Type {
  const name: string = type.name;
  const documentTypes: Type[] = [];

  class ResourceData extends NestApiResourceData(type) {}
  renameType(ResourceData, name);

  class DocumentBase extends NestApiCommonDocument {
    @ApiProperty({ type: ResourceData })
    public readonly data: ResourceData;

    @ApiProperty({ type: NestApiResourceResponseDocumentLinks })
    public readonly links: NestApiResourceResponseDocumentLinks;
  }
  documentTypes.push(DocumentBase);

  const metadata: NestApiResourceMetadata = getResourceMetadata(type.prototype);
  if (metadata.fields.relationships.length > 0) {
    const includedRefs: { $ref: string }[] = metadata.fields.relationships
      .map(({ descriptor }) => descriptor)
      .map(({ related }) => related())
      .map((t) => ({ $ref: getSchemaPath(t) }));

    class DocumentWithIncluded {
      @ApiPropertyOptional({ type: 'array', items: { oneOf: includedRefs } })
      public readonly included?: unknown[];
    }
    documentTypes.push(DocumentWithIncluded);
  }

  class Document extends IntersectionType(...documentTypes) {}
  renameType(Document, `${name}ResourceResponseDocument`);

  return Document;
}

export function NestApiRelatedResourceResponseDocument(
  type: Type,
  options?: { nullable?: boolean },
): Type {
  const name: string = type.name;
  // TODO: maybe better naming can be implemented
  const qualifier: string = options?.nullable ? 'Nullable' : '';
  const documentTypes: Type[] = [];

  class ResourceData extends NestApiResourceData(type) {}
  renameType(ResourceData, name);

  class DocumentBase extends NestApiCommonDocument {
    @ApiProperty({ type: ResourceData, nullable: options?.nullable })
    public readonly data: ResourceData | null;

    @ApiProperty({ type: NestApiResourceResponseDocumentLinks })
    public readonly links: NestApiResourceResponseDocumentLinks;
  }
  documentTypes.push(DocumentBase);

  const metadata: NestApiResourceMetadata = getResourceMetadata(type.prototype);
  if (metadata.fields.relationships.length > 0) {
    const includedRefs: { $ref: string }[] = metadata.fields.relationships
      .map(({ descriptor }) => descriptor)
      .map(({ related }) => related())
      .map((t) => ({ $ref: getSchemaPath(t) }));

    class DocumentWithIncluded {
      @ApiPropertyOptional({ type: 'array', items: { oneOf: includedRefs } })
      public readonly included?: unknown[];
    }
    documentTypes.push(DocumentWithIncluded);
  }

  class Document extends IntersectionType(...documentTypes) {}
  renameType(Document, `${name}${qualifier}RelatedResourceResponseDocument`);

  return Document;
}

export class NestApiResourcesResponseDocumentLinks extends IntersectionType(
  NestApiCommonDocumentLinks,
  NestApiPaginationLinks,
) {}

export function NestApiResourcesResponseDocument(type: Type): Type {
  const name: string = type.name;
  const documentTypes: Type[] = [];

  class ResourceData extends NestApiResourceData(type) {}
  renameType(ResourceData, name);

  class DocumentBase extends NestApiCommonDocument {
    @ApiProperty({ type: ResourceData, isArray: true })
    public readonly data: ResourceData[];

    @ApiProperty({ type: NestApiResourceResponseDocumentLinks })
    public readonly links: NestApiResourceResponseDocumentLinks;

    @ApiProperty({ type: NestApiDocumentPaging })
    public readonly paging: NestApiDocumentPaging;
  }
  documentTypes.push(DocumentBase);

  const metadata: NestApiResourceMetadata = getResourceMetadata(type.prototype);
  if (metadata.fields.relationships.length > 0) {
    const includedRefs: { $ref: string }[] = metadata.fields.relationships
      .map(({ descriptor }) => descriptor)
      .map(({ related }) => related())
      .map((t) => ({ $ref: getSchemaPath(t) }));

    class DocumentWithIncluded {
      @ApiPropertyOptional({ type: 'array', items: { oneOf: includedRefs } })
      public readonly included?: unknown[];
    }
    documentTypes.push(DocumentWithIncluded);
  }

  class Document extends IntersectionType(...documentTypes) {}
  renameType(Document, `${name}ResourcesResponseDocument`);

  return Document;
}

export function NestApiRelationshipRequestDocument(
  type: Type,
  options?: { nullable?: boolean },
): Type {
  const name: string = type.name;

  class ResourceIdentifier extends NestApiResourceIdentifierData(type) {}
  renameType(ResourceIdentifier, `${name}ResourceIdentifier`);

  class Document {
    @ApiProperty({ type: ResourceIdentifier, nullable: options?.nullable })
    @ValidateNested()
    @TransformType(() => ResourceIdentifier)
    public readonly data: ResourceIdentifier | null;
  }
  renameType(Document, `${name}RelationshipRequestDocument`);

  if (!options?.nullable) {
    IsDefined()(Document.prototype, 'data');
  } else {
    NotEquals(undefined)(Document.prototype, 'data');
  }

  return Document;
}

export class NestApiRelationshipResponseDocumentLinks extends NestApiCommonDocumentLinks {
  @ApiProperty()
  public readonly related: string;
}

export function NestApiRelationshipResponseDocument(
  type: Type,
  options?: { nullable?: boolean },
): Type {
  const name: string = type.name;

  class ResourceIdentifierData extends NestApiResourceIdentifierData(type) {}
  renameType(ResourceIdentifierData, `${name}ResourceIdentifier`);

  class Document extends NestApiCommonDocument {
    @ApiProperty({
      type: ResourceIdentifierData,
      nullable: options?.nullable,
    })
    public readonly data: ResourceIdentifierData | null;

    @ApiProperty({ type: NestApiRelationshipResponseDocumentLinks })
    public readonly links: NestApiRelationshipResponseDocumentLinks;
  }
  renameType(Document, `${name}RelationshipResponseDocument`);

  return Document;
}

export function NestApiRelationshipsRequestDocument(type: Type): Type {
  const name: string = type.name;

  class ResourceIdentifier extends NestApiResourceIdentifierData(type) {}
  renameType(ResourceIdentifier, `${name}ResourceIdentifier`);

  class Document {
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

  class ResourceIdentifier extends NestApiResourceIdentifierData(type) {}
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
