import { ApiProperty, ApiPropertyOptions } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

import { Entity, isNullOrUndefined, MissingIdFieldException } from '../../core';
import { RelationshipDescriptor } from '../../repository';
import {
  getResourceFieldsMetadata,
  NestApiResourceFieldsMetadata,
  setResourceMetadata,
  setResourceFieldsMetadata,
} from '../metadata';

export function NestApiResource(name: string): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (target: Function): void => {
    const fieldsMetadata: Partial<NestApiResourceFieldsMetadata> =
      getResourceFieldsMetadata(target.prototype);

    if (isNullOrUndefined(fieldsMetadata.id)) {
      throw new MissingIdFieldException(
        `Resource [${name}] must have an ID property decorated with @NestApiIdField()`,
      );
    }

    setResourceMetadata(target.prototype, {
      name: name,
      fields: {
        id: fieldsMetadata.id,
        attributes: fieldsMetadata.attributes ?? [],
        relationships: fieldsMetadata.relationships ?? [],
        meta: fieldsMetadata.meta ?? [],
      },
    });
  };
}

export function NestApiIdField(
  options?: Omit<ApiPropertyOptions, 'name' | 'required'>,
): PropertyDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (target: Object, propertyKey: string | symbol): void => {
    Expose()(target, propertyKey);
    // TODO: move to Resource in models.ts
    ApiProperty({ ...options, name: 'id', required: true })(
      target,
      propertyKey,
    );

    const openapi: ApiPropertyOptions = options ?? {};
    openapi.required = openapi.required ?? true;

    setResourceFieldsMetadata(target, {
      ...getResourceFieldsMetadata(target),
      id: { name: propertyKey.toString(), openapi: openapi },
    });
  };
}

export function NestApiAttributeField(
  options?: ApiPropertyOptions,
): PropertyDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (target: Object, propertyKey: string | symbol): void => {
    Expose()(target, propertyKey);
    // TODO: move to Resource in models.ts
    ApiProperty(options)(target, propertyKey);

    const openapi: ApiPropertyOptions = options ?? {};
    openapi.required = openapi.required ?? true;

    const fieldsMetadata: Partial<NestApiResourceFieldsMetadata> =
      getResourceFieldsMetadata(target);
    setResourceFieldsMetadata(target, {
      ...fieldsMetadata,
      attributes: [
        ...(fieldsMetadata.attributes ?? []),
        { name: propertyKey.toString(), openapi: openapi },
      ],
    });
  };
}

export function NestApiRelationshipField<TRelated extends Entity>(
  descriptor: RelationshipDescriptor<TRelated>,
  options?: Omit<ApiPropertyOptions, 'required'>,
): PropertyDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (target: Object, propertyKey: string | symbol): void => {
    Expose()(target, propertyKey);

    const openapi: ApiPropertyOptions = options ?? {};
    openapi.required = true;

    const fieldsMetadata: Partial<NestApiResourceFieldsMetadata> =
      getResourceFieldsMetadata(target);
    setResourceFieldsMetadata(target, {
      ...fieldsMetadata,
      relationships: [
        ...(fieldsMetadata.relationships ?? []),
        {
          name: propertyKey.toString(),
          descriptor: descriptor as RelationshipDescriptor,
          openapi: openapi,
        },
      ],
    });
  };
}

export function NestApiMetaField(
  options?: ApiPropertyOptions,
): PropertyDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (target: Object, propertyKey: string | symbol): void => {
    Expose()(target, propertyKey);
    // TODO: move to ResourceData in models.ts
    ApiProperty(options)(target, propertyKey);

    const openapi: ApiPropertyOptions = options ?? {};
    openapi.required = openapi.required ?? true;

    const fieldsMetadata: Partial<NestApiResourceFieldsMetadata> =
      getResourceFieldsMetadata(target);
    setResourceFieldsMetadata(target, {
      ...fieldsMetadata,
      meta: [
        ...(fieldsMetadata.meta ?? []),
        { name: propertyKey.toString(), openapi: openapi },
      ],
    });
  };
}
