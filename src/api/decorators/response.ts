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

export const NestApiEntityResponse = <TEntity extends Entity>(
  type: Type<TEntity>,
  options?: ApiResponseOptions,
): MethodDecorator => {
  const document: Type = NestApiEntityResponseDocument(type);

  return applyDecorators(
    ApiExtraModels(document),
    ApiResponse({
      status: 200,
      type: document,
      ...options,
    }),
  );
};

export const NestApiEntitiesResponse = <TEntity extends Entity>(
  type: Type<TEntity>,
  options?: ApiResponseOptions,
): MethodDecorator => {
  const document: Type = NestApiEntitiesResponseDocument(type);

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
  type: Type<TEntity>,
  key: TKey,
  options?: ApiResponseOptions,
): MethodDecorator => {
  const descriptor: RelationshipDescriptor<any> =
    getRelationshipDescriptorByKey(type, key);

  const relatedType: Type = descriptor.related();
  const nonNullable: boolean =
    descriptor.kind === 'toOne' ? !!descriptor.nonNullable : false;

  const document: Type = NestApiRelatedEntityResponseDocument(relatedType, {
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
  type: Type<TEntity>,
  key: TKey,
  options?: ApiResponseOptions,
): MethodDecorator => {
  const { related } = getRelationshipDescriptorByKey(type, key);

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
  type: Type<TEntity>,
  key: TKey,
  options?: ApiResponseOptions,
): MethodDecorator => {
  const descriptor: RelationshipDescriptor<any> =
    getRelationshipDescriptorByKey(type, key);

  const relatedType: Type = descriptor.related();
  const nonNullable: boolean =
    descriptor.kind === 'toOne' ? !!descriptor.nonNullable : false;

  const document: Type = NestApiRelationshipResponseDocument(relatedType, {
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
  type: Type<TEntity>,
  key: TKey,
  options?: ApiResponseOptions,
): MethodDecorator => {
  const { related } = getRelationshipDescriptorByKey(type, key);

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
