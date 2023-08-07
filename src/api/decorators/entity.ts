import { ApiProperty, ApiPropertyOptions } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

import { isNullOrUndefined } from '../../core';
import {
  getEntityPropertiesMetadata,
  NestApiEntityPropertiesMetadata,
  setEntityMetadata,
  setEntityPropertiesMetadata,
} from '../metadata';
import {
  NestApiResourceRelationshipToMany,
  NestApiResourceRelationshipToOne,
} from '../models';

export function NestApiEntity(name: string): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (target: Function): void => {
    const propertiesMetadata: Partial<NestApiEntityPropertiesMetadata> =
      getEntityPropertiesMetadata(target.prototype);

    if (isNullOrUndefined(propertiesMetadata.id)) {
      // TODO: lib error
      throw new Error(
        `Entity [${name}] must have an ID property decorated with @NestApiEntityId()`,
      );
    }

    propertiesMetadata.attributes = propertiesMetadata.attributes ?? [];
    propertiesMetadata.relationships = propertiesMetadata.relationships ?? [];
    propertiesMetadata.meta = propertiesMetadata.meta ?? [];

    setEntityMetadata(target.prototype, {
      type: name,
      properties: {
        id: propertiesMetadata.id,
        attributes: propertiesMetadata.attributes,
        relationships: propertiesMetadata.relationships,
        meta: propertiesMetadata.meta,
      },
    });
  };
}

export function NestApiIdProperty(
  options?: Omit<ApiPropertyOptions, 'name'>,
): PropertyDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (target: Object, propertyKey: string | symbol): void => {
    Expose()(target, propertyKey);
    ApiProperty({ ...options, name: 'id' })(target, propertyKey);

    setEntityPropertiesMetadata(target, {
      ...getEntityPropertiesMetadata(target),
      id: { name: propertyKey.toString() },
    });
  };
}

export function NestApiAttributeProperty(
  options?: ApiPropertyOptions,
): PropertyDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (target: Object, propertyKey: string | symbol): void => {
    Expose()(target, propertyKey);
    ApiProperty(options)(target, propertyKey);

    const propertiesMetadata: Partial<NestApiEntityPropertiesMetadata> =
      getEntityPropertiesMetadata(target);
    setEntityPropertiesMetadata(target, {
      ...propertiesMetadata,
      attributes: [
        ...(propertiesMetadata.attributes ?? []),
        { name: propertyKey.toString() },
      ],
    });
  };
}

export function NestApiRelationshipProperty(
  // eslint-disable-next-line @typescript-eslint/ban-types
  options: ApiPropertyOptions & { type: () => Function },
): PropertyDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (target: Object, propertyKey: string | symbol): void => {
    Expose()(target, propertyKey);
    ApiProperty({
      ...options,
      type: options.isArray
        ? NestApiResourceRelationshipToMany
        : NestApiResourceRelationshipToOne,
      isArray: false,
    })(target, propertyKey);

    const propertiesMetadata: Partial<NestApiEntityPropertiesMetadata> =
      getEntityPropertiesMetadata(target);
    setEntityPropertiesMetadata(target, {
      ...propertiesMetadata,
      relationships: [
        ...(propertiesMetadata.relationships ?? []),
        {
          name: propertyKey.toString(),
          type: options.type,
          isArray: options.isArray,
        },
      ],
    });
  };
}

export function NestApiMetaProperty(
  options?: ApiPropertyOptions,
): PropertyDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (target: Object, propertyKey: string | symbol): void => {
    Expose()(target, propertyKey);
    ApiProperty(options)(target, propertyKey);

    const propertiesMetadata: Partial<NestApiEntityPropertiesMetadata> =
      getEntityPropertiesMetadata(target);
    setEntityPropertiesMetadata(target, {
      ...propertiesMetadata,
      meta: [
        ...(propertiesMetadata.meta ?? []),
        { name: propertyKey.toString() },
      ],
    });
  };
}
