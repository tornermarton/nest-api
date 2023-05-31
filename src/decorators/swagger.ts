import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiProperty,
  ApiResponse,
  ApiResponseOptions,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  ParameterObject,
  ReferenceObject,
} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

import { EntityApiResponse, PagedApiResponse } from '../response';

class QueryDecoratorSwaggerParameters {
  public style?: string;
  public schema?: ReferenceObject;
}

type SwaggerDecoratorParams = Parameters<typeof ApiProperty>;
type SwaggerDecoratorMetadata = SwaggerDecoratorParams[0];
type ApiQueryElementDecoratorMetadata = SwaggerDecoratorMetadata &
  QueryDecoratorSwaggerParameters;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const ApiQueryProperty = (params?: ApiQueryElementDecoratorMetadata) => {
  return ApiProperty(params);
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const ApiQueryPropertyOptional = (
  params?: ApiQueryElementDecoratorMetadata,
) => {
  return ApiProperty({ required: false, ...params });
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const NestApiQuery = <TModel extends Type>(
  model: TModel,
): MethodDecorator => {
  return (
    target: object,
    key: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const name = 'swagger/apiParameters';
    const parameters = Reflect.getMetadata(name, descriptor.value) || [];
    const query: ParameterObject[] = [
      {
        name: 'page',
        in: 'query',
        required: false,
        style: 'deepObject',
        schema: {
          properties: {
            limit: { type: 'number' },
            offset: { type: 'number' },
          },
        },
      },
      {
        name: 'sort',
        in: 'query',
        required: false,
        schema: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
      },
      {
        name: 'filter',
        in: 'query',
        required: false,
        style: 'deepObject',
        schema: {
          $ref: getSchemaPath(model),
        },
      },
      {
        name: 'expand',
        in: 'query',
        required: false,
        schema: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
      },
    ];

    Reflect.defineMetadata(name, [...parameters, ...query], descriptor.value);

    return descriptor;
  };
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const EntityNestApiResponse = <TModel extends Type>(
  model: TModel,
  options?: ApiResponseOptions,
) => {
  return applyDecorators(
    ApiResponse({
      ...options,
      schema: {
        title: `EntityResponseOf${model.name}`,
        allOf: [
          { $ref: getSchemaPath(EntityApiResponse) },
          {
            properties: {
              data: {
                $ref: getSchemaPath(model),
              },
            },
            required: ['data'],
          },
        ],
      },
    }),
  );
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const PagedNestApiResponse = <TModel extends Type>(
  model: TModel,
  options?: ApiResponseOptions,
) => {
  return applyDecorators(
    ApiResponse({
      ...options,
      schema: {
        title: `PagedResponseOf${model.name}`,
        allOf: [
          { $ref: getSchemaPath(PagedApiResponse) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
            },
            required: ['data'],
          },
        ],
      },
    }),
  );
};
