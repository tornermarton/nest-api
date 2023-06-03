import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiResponse,
  ApiResponseOptions,
  getSchemaPath,
} from '@nestjs/swagger';
import { ParameterObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

import { SWAGGER_API_PARAMETERS_METADATA_KEY } from './constants';
import { PageDto } from '../core';
import { EntityApiResponse, PagedApiResponse } from '../response';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const NestApiQuery = <TModel extends Type>(
  model: TModel,
): MethodDecorator => {
  return (
    target: object,
    key: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const parameters =
      Reflect.getMetadata(
        SWAGGER_API_PARAMETERS_METADATA_KEY,
        descriptor.value,
      ) ?? [];
    const query: ParameterObject[] = [
      {
        name: 'page',
        in: 'query',
        required: false,
        style: 'deepObject',
        schema: {
          properties: {
            limit: { type: 'number', default: PageDto.DEFAULT_LIMIT },
            offset: { type: 'number', default: PageDto.DEFAULT_OFFSET },
          },
        },
      },
      {
        name: 'sort',
        in: 'query',
        required: false,
        style: 'form',
        explode: false,
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
        style: 'form',
        explode: false,
        schema: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
      },
    ];

    Reflect.defineMetadata(
      SWAGGER_API_PARAMETERS_METADATA_KEY,
      [...parameters, ...query],
      descriptor.value,
    );

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
