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
  NestApiResourcesResponseDocument,
  NestApiResourceResponseDocument,
  NestApiErrorDocument,
  NestApiRelatedResourceResponseDocument,
  NestApiRelationshipResponseDocument,
  NestApiRelationshipsResponseDocument,
} from '../models';

export const NestApiResourceResponse = <TResource extends Entity>(
  type: Type<TResource>,
  options?: ApiResponseOptions,
): MethodDecorator => {
  const document: Type = NestApiResourceResponseDocument(type);

  return applyDecorators(
    ApiExtraModels(document),
    ApiResponse({
      status: 200,
      type: document,
      ...options,
    }),
  );
};

export const NestApiResourcesResponse = <TResource extends Entity>(
  type: Type<TResource>,
  options?: ApiResponseOptions,
): MethodDecorator => {
  const document: Type = NestApiResourcesResponseDocument(type);

  return applyDecorators(
    ApiExtraModels(document),
    ApiResponse({
      status: 200,
      type: document,
      ...options,
    }),
  );
};

export const NestApiRelatedResourceResponse = <
  TResource extends Entity,
  TKey extends Extract<keyof TResource, string>,
>(
  type: Type<TResource>,
  key: TKey,
  options?: ApiResponseOptions,
): MethodDecorator => {
  const descriptor: RelationshipDescriptor<any> =
    getRelationshipDescriptorByKey(type, key);

  const relatedType: Type = descriptor.related();
  const nullable: boolean | undefined =
    descriptor.kind === 'toOne' ? descriptor.nullable : true;

  const document: Type = NestApiRelatedResourceResponseDocument(relatedType, {
    nullable,
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

export const NestApiRelatedResourcesResponse = <
  TResource extends Entity,
  TKey extends Extract<keyof TResource, string>,
>(
  type: Type<TResource>,
  key: TKey,
  options?: ApiResponseOptions,
): MethodDecorator => {
  const { related } = getRelationshipDescriptorByKey(type, key);

  const document: Type = NestApiResourcesResponseDocument(related());

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
  TResource extends Entity,
  TKey extends Extract<keyof TResource, string>,
>(
  type: Type<TResource>,
  key: TKey,
  options?: ApiResponseOptions,
): MethodDecorator => {
  const descriptor: RelationshipDescriptor<any> =
    getRelationshipDescriptorByKey(type, key);

  const relatedType: Type = descriptor.related();
  const nullable: boolean | undefined =
    descriptor.kind === 'toOne' ? descriptor.nullable : true;

  const document: Type = NestApiRelationshipResponseDocument(relatedType, {
    nullable,
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
  TResource extends Entity,
  TKey extends Extract<keyof TResource, string>,
>(
  type: Type<TResource>,
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
