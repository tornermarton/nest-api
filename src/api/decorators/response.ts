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

import { Entity } from '../../core';
import { RelationshipDescriptor } from '../../repository';
import { getRelationshipDescriptorByKey } from '../metadata';
import {
  NestApiEntitiesResponseDocument,
  NestApiEntityResponseDocument,
  NestApiErrorDocument,
  NestApiRelatedEntityResponseDocument,
  NestApiRelationshipResponseDocument,
  NestApiRelationshipsResponseDocument,
} from '../models';

export const NestApiEntityResponse = <TModel extends Type>(
  model: TModel,
  options?: ApiResponseOptions,
): MethodDecorator => {
  const document: Type = NestApiEntityResponseDocument(model);

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

export const NestApiRelatedEntityResponse = <
  TEntity extends Entity,
  TKey extends Extract<keyof TEntity, string>,
>(
  model: Type<TEntity>,
  key: TKey,
  options?: ApiResponseOptions,
): MethodDecorator => {
  const descriptor: RelationshipDescriptor<any> =
    getRelationshipDescriptorByKey(model, key);

  const type: Type = descriptor.related();
  const nonNullable: boolean =
    descriptor.kind === 'toOne' ? !!descriptor.nonNullable : false;

  const document: Type = NestApiRelatedEntityResponseDocument(type, {
    nonNullable,
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

export const NestApiRelatedEntitiesResponse = <
  TEntity extends Entity,
  TKey extends Extract<keyof TEntity, string>,
>(
  model: Type<TEntity>,
  key: TKey,
  options?: ApiResponseOptions,
): MethodDecorator => {
  const { related } = getRelationshipDescriptorByKey(model, key);

  const document: Type = NestApiEntitiesResponseDocument(related());

  return applyDecorators(
    ApiExtraModels(document),
    ApiResponse({
      status: 200,
      type: document,
      ...options,
    }),
  );
};

export const NestApiRelationshipResponse = <
  TEntity extends Entity,
  TKey extends Extract<keyof TEntity, string>,
>(
  model: Type<TEntity>,
  key: TKey,
  options?: ApiResponseOptions,
): MethodDecorator => {
  const descriptor: RelationshipDescriptor<any> =
    getRelationshipDescriptorByKey(model, key);

  const type: Type = descriptor.related();
  const nonNullable: boolean =
    descriptor.kind === 'toOne' ? !!descriptor.nonNullable : false;

  const document: Type = NestApiRelationshipResponseDocument(type, {
    nonNullable,
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

export const NestApiRelationshipsResponse = <
  TEntity extends Entity,
  TKey extends Extract<keyof TEntity, string>,
>(
  model: Type<TEntity>,
  key: TKey,
  options?: ApiResponseOptions,
): MethodDecorator => {
  const { related } = getRelationshipDescriptorByKey(model, key);

  const document: Type = NestApiRelationshipsResponseDocument(related());

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
