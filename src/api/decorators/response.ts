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
} from '@nestjs/swagger';

import {
  NestApiEntitiesResponseDocument,
  NestApiEntityResponseDocument,
  NestApiErrorDocument,
  NestApiRelationshipResponseDocument,
  NestApiRelationshipsResponseDocument,
} from '../models';

export const NestApiEntityResponse = <TModel extends Type>(
  model: TModel,
  options?: ApiResponseOptions & { nullable?: boolean },
): MethodDecorator => {
  const document: Type = NestApiEntityResponseDocument(model, {
    nullable: options?.nullable,
  });

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
  const document: Type = NestApiEntitiesResponseDocument(model);

  return applyDecorators(
    ApiExtraModels(document),
    ApiResponse({
      status: 200,
      type: document,
      ...options,
    }),
  );
};

export const NestApiRelatedEntityResponse = <TModel extends Type>(
  model: TModel,
  options?: ApiResponseOptions & { nonNullable?: boolean },
): MethodDecorator => {
  const document: Type = NestApiEntityResponseDocument(model, {
    nullable: !options?.nonNullable,
  });

  return applyDecorators(
    ApiExtraModels(document),
    ApiResponse({
      status: 200,
      type: document,
      ...options,
    }),
  );
};

export const NestApiRelatedEntitiesResponse = <TModel extends Type>(
  model: TModel,
  options?: ApiResponseOptions,
): MethodDecorator => {
  const document: Type = NestApiEntitiesResponseDocument(model);

  return applyDecorators(
    ApiExtraModels(document),
    ApiResponse({
      status: 200,
      type: document,
      ...options,
    }),
  );
};

export const NestApiRelationshipResponse = <TModel extends Type>(
  model: TModel,
  options?: ApiResponseOptions & { nonNullable?: boolean },
): MethodDecorator => {
  const document: Type = NestApiRelationshipResponseDocument(model, {
    nonNullable: options?.nonNullable,
  });

  return applyDecorators(
    ApiExtraModels(document),
    ApiResponse({
      status: 200,
      type: document,
      ...options,
    }),
  );
};

export const NestApiRelationshipsResponse = <TModel extends Type>(
  model: TModel,
  options?: ApiResponseOptions,
): MethodDecorator => {
  const document: Type = NestApiRelationshipsResponseDocument(model);

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
