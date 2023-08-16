import { Type } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptions } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

import { isNullOrUndefined } from '../../core';
import {
  getEntityFieldsMetadata,
  NestApiEntityFieldsMetadata,
  setEntityMetadata,
  setEntityFieldsMetadata,
} from '../metadata';

export function NestApiEntity(name: string): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (target: Function): void => {
    const fieldsMetadata: Partial<NestApiEntityFieldsMetadata> =
      getEntityFieldsMetadata(target.prototype);

    if (isNullOrUndefined(fieldsMetadata.id)) {
      // TODO: lib error
      throw new Error(
        `Entity [${name}] must have an ID property decorated with @NestApiEntityId()`,
      );
    }

    fieldsMetadata.attributes = fieldsMetadata.attributes ?? [];
    fieldsMetadata.relationships = fieldsMetadata.relationships ?? [];
    fieldsMetadata.meta = fieldsMetadata.meta ?? [];

    setEntityMetadata(target.prototype, {
      type: name,
      fields: {
        id: fieldsMetadata.id,
        attributes: fieldsMetadata.attributes,
        relationships: fieldsMetadata.relationships,
        meta: fieldsMetadata.meta,
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

    setEntityFieldsMetadata(target, {
      ...getEntityFieldsMetadata(target),
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

    const fieldsMetadata: Partial<NestApiEntityFieldsMetadata> =
      getEntityFieldsMetadata(target);
    setEntityFieldsMetadata(target, {
      ...fieldsMetadata,
      attributes: [
        ...(fieldsMetadata.attributes ?? []),
        { name: propertyKey.toString(), openapi: openapi },
      ],
    });
  };
}

export function NestApiRelationshipField(
  // eslint-disable-next-line @typescript-eslint/ban-types
  options: ApiPropertyOptions & { type: () => Type },
): PropertyDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (target: Object, propertyKey: string | symbol): void => {
    Expose()(target, propertyKey);

    const openapi: ApiPropertyOptions = options ?? {};
    openapi.required = openapi.required ?? true;

    const fieldsMetadata: Partial<NestApiEntityFieldsMetadata> =
      getEntityFieldsMetadata(target);
    setEntityFieldsMetadata(target, {
      ...fieldsMetadata,
      relationships: [
        ...(fieldsMetadata.relationships ?? []),
        {
          name: propertyKey.toString(),
          type: options.type,
          kind: options.isArray ? 'toMany' : 'toOne',
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
    // TODO: move to Resource in models.ts
    ApiProperty(options)(target, propertyKey);

    const openapi: ApiPropertyOptions = options ?? {};
    openapi.required = openapi.required ?? true;

    const fieldsMetadata: Partial<NestApiEntityFieldsMetadata> =
      getEntityFieldsMetadata(target);
    setEntityFieldsMetadata(target, {
      ...fieldsMetadata,
      meta: [
        ...(fieldsMetadata.meta ?? []),
        { name: propertyKey.toString(), openapi: openapi },
      ],
    });
  };
}
