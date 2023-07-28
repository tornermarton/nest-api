import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiExtraModels,
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

import { PageDto } from '../../query';
import { SWAGGER_API_PARAMETERS_METADATA_KEY } from '../constants';
import {
  NestApiEntitiesDocument,
  NestApiEntityDocument,
  NestApiErrorDocument,
} from '../models';

export const NestApiQuery = <TModel extends Type>(
  model: TModel,
): MethodDecorator => {
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    ApiExtraModels(model)(target, propertyKey, descriptor);

    const parameters: ParameterObject[] | undefined = Reflect.getMetadata(
      SWAGGER_API_PARAMETERS_METADATA_KEY,
      descriptor.value as object,
    );

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
      [...(parameters ?? []), ...query],
      descriptor.value as object,
    );

    return descriptor;
  };
};

export const NestApiEntityResponse = <TModel extends Type>(
  model: TModel,
  options?: ApiResponseOptions,
): MethodDecorator => {
  const document: Type = NestApiEntityDocument(model);

  return applyDecorators(
    ApiExtraModels(document),
    ApiResponse({
      status: 200,
      type: document,
      ...options,
    }),
  );
};

export const NestApiEntitiesResponse = <TModel extends Type>(
  model: TModel,
  options?: ApiResponseOptions,
): MethodDecorator => {
  const document: Type = NestApiEntitiesDocument(model);

  return applyDecorators(
    ApiExtraModels(document),
    ApiResponse({
      status: 200,
      type: document,
      ...options,
    }),
  );
};

export const NestApiNoContentResponse = (
  options?: ApiResponseOptions,
): MethodDecorator => {
  return applyDecorators(
    ApiNoContentResponse({
      ...options,
    }),
  );
};

type NestApiErrorResponseDecorator = (
  options?: ApiResponseOptions,
) => MethodDecorator;
function createErrorResponseDecorator(
  wrapped: NestApiErrorResponseDecorator,
): NestApiErrorResponseDecorator {
  return (options?: ApiResponseOptions) => {
    return applyDecorators(
      wrapped({
        type: NestApiErrorDocument,
        ...options,
      }),
    );
  };
}

export const NestApiBadRequestResponse: NestApiErrorResponseDecorator =
  createErrorResponseDecorator(ApiBadRequestResponse);

export const NestApiUnauthorizedResponse: NestApiErrorResponseDecorator =
  createErrorResponseDecorator(ApiUnauthorizedResponse);

export const NestApiForbiddenResponse: NestApiErrorResponseDecorator =
  createErrorResponseDecorator(ApiForbiddenResponse);

export const NestApiNotFoundResponse: NestApiErrorResponseDecorator =
  createErrorResponseDecorator(ApiNotFoundResponse);

export const NestApiUnprocessableEntityResponse: NestApiErrorResponseDecorator =
  createErrorResponseDecorator(ApiUnprocessableEntityResponse);

export const NestApiServiceUnavailableResponse: NestApiErrorResponseDecorator =
  createErrorResponseDecorator(ApiServiceUnavailableResponse);
