import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiResponse,
  ApiResponseOptions,
  ApiServiceUnavailableResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { ParameterObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

import { SWAGGER_API_PARAMETERS_METADATA_KEY } from './constants';
import { PageDto } from '../query';
import {
  EntityApiResponse,
  ErrorApiResponse,
  PagedApiResponse,
} from '../response';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const NestApiQuery = <TModel extends Type>(
  model: TModel,
): MethodDecorator => {
  return (
    target: object,
    key: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const parameters: ParameterObject[] =
      (Reflect.getMetadata(
        SWAGGER_API_PARAMETERS_METADATA_KEY,
        descriptor.value as object,
      ) as ParameterObject[]) ?? [];
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
      descriptor.value as object,
    );

    return descriptor;
  };
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const NestApiEntityResponse = <TModel extends Type>(
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
export const NestApiPagedResponse = <TModel extends Type>(
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

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const NestApiNoContentResponse = (options?: ApiResponseOptions) => {
  return applyDecorators(
    ApiNoContentResponse({
      type: ErrorApiResponse,
      ...options,
    }),
  );
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const NestApiBadRequestResponse = (options?: ApiResponseOptions) => {
  return applyDecorators(
    ApiBadRequestResponse({
      type: ErrorApiResponse,
      ...options,
    }),
  );
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const NestApiUnauthorizedResponse = (options?: ApiResponseOptions) => {
  return applyDecorators(
    ApiUnauthorizedResponse({
      type: ErrorApiResponse,
      ...options,
    }),
  );
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const NestApiForbiddenResponse = (options?: ApiResponseOptions) => {
  return applyDecorators(
    ApiForbiddenResponse({
      type: ErrorApiResponse,
      ...options,
    }),
  );
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const NestApiNotFoundResponse = (options?: ApiResponseOptions) => {
  return applyDecorators(
    ApiNotFoundResponse({
      type: ErrorApiResponse,
      ...options,
    }),
  );
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const NestApiUnprocessableEntityResponse = (
  options?: ApiResponseOptions,
) => {
  return applyDecorators(
    ApiUnprocessableEntityResponse({
      type: ErrorApiResponse,
      ...options,
    }),
  );
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const NestApiServiceUnavailableResponse = (
  options?: ApiResponseOptions,
) => {
  return applyDecorators(
    ApiServiceUnavailableResponse({
      type: ErrorApiResponse,
      ...options,
    }),
  );
};
