import {
  applyDecorators,
  Body,
  createParamDecorator,
  ExecutionContext,
  Param,
  Type,
} from '@nestjs/common';
import {
  ApiBody,
  ApiBodyOptions,
  ApiExtraModels,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';

import { Entity, isNotNullOrUndefined, isNullOrUndefined } from '../../core';
import { RelationshipDescriptor } from '../../repository';
import {
  NestApiEntityRequestBodyTransformationPipe,
  NestApiRelationshipRequestBodyTransformationPipe,
  NestApiRelationshipsRequestBodyTransformationPipe,
  NestApiRequestBodyDataTransformationPipe,
  NestApiRequestBodyValidationPipe,
  NestApiRequestIdPipe,
  NestApiRequestQueryValidationPipe,
} from '../../request';
import {
  getQueryMetadata,
  getRelationshipDescriptorByKey,
  NestApiQueryMetadata,
} from '../metadata';
import {
  NestApiEntityRequestDocument,
  NestApiRelationshipRequestDocument,
  NestApiRelationshipsRequestDocument,
} from '../models';

export const NestApiRequestId = (): ParameterDecorator =>
  Param('id', NestApiRequestIdPipe);

const SilentQuery = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request: Request = ctx.switchToHttp().getRequest();
    if (data) {
      return request.query[data];
    } else {
      return request.query;
    }
  },
);

export const NestApiRequestQuery = (): ParameterDecorator => {
  return (
    target: object,
    propertyKey: string | symbol,
    parameterIndex: number,
  ) => {
    const descriptor: PropertyDescriptor | undefined =
      Object.getOwnPropertyDescriptor(target, propertyKey);

    if (isNullOrUndefined(descriptor)) {
      // TODO: proper error
      throw new Error('Could not get property descriptor');
    }

    const key: string = 'design:paramtypes';
    // TODO: fix typing
    const paramMetadata: any = Reflect.getMetadata(key, target, propertyKey);
    const model: Type = paramMetadata[parameterIndex];

    const metadata: NestApiQueryMetadata = getQueryMetadata(model.prototype);
    metadata.parameters.forEach(({ type, openapi }) => {
      ApiQuery(openapi)(target, propertyKey, descriptor);

      if (isNotNullOrUndefined(type)) {
        ApiExtraModels(type)(target, propertyKey, descriptor);
      }
    });

    SilentQuery(NestApiRequestQueryValidationPipe)(
      target,
      propertyKey,
      parameterIndex,
    );
  };
};

export const NestApiEntityRequestBody = (): ParameterDecorator => {
  return (
    target: object,
    propertyKey: string | symbol,
    parameterIndex: number,
  ) => {
    const key: string = 'design:paramtypes';
    // TODO: fix typing
    const paramMetadata: any = Reflect.getMetadata(key, target, propertyKey);
    const model: Type = paramMetadata[parameterIndex];
    const document: Type = NestApiEntityRequestDocument(model);

    Body(
      new NestApiRequestBodyValidationPipe(document),
      new NestApiRequestBodyDataTransformationPipe(),
      new NestApiEntityRequestBodyTransformationPipe(model),
    )(target, propertyKey, parameterIndex);
  };
};

export const NestApiRelationshipRequestBody = <
  TEntity extends Entity,
  TKey extends Extract<keyof TEntity, string>,
>(
  model: Type<TEntity>,
  key: TKey,
): ParameterDecorator => {
  return (
    target: object,
    propertyKey: string | symbol,
    parameterIndex: number,
  ) => {
    const descriptor: RelationshipDescriptor<any> =
      getRelationshipDescriptorByKey(model, key);

    const type: Type = descriptor.related();
    const nonNullable: boolean =
      descriptor.kind === 'toOne' ? !!descriptor.nonNullable : false;

    const document: Type = NestApiRelationshipRequestDocument(type, {
      nonNullable,
    });

    Body(
      new NestApiRequestBodyValidationPipe(document),
      new NestApiRequestBodyDataTransformationPipe(),
      new NestApiRelationshipRequestBodyTransformationPipe(),
    )(target, propertyKey, parameterIndex);
  };
};

export const NestApiRelationshipsRequestBody = <
  TEntity extends Entity,
  TKey extends Extract<keyof TEntity, string>,
>(
  model: Type<TEntity>,
  key: TKey,
): ParameterDecorator => {
  return (
    target: object,
    propertyKey: string | symbol,
    parameterIndex: number,
  ) => {
    const { related } = getRelationshipDescriptorByKey(model, key);

    const document: Type = NestApiRelationshipsRequestDocument(related());

    Body(
      new NestApiRequestBodyValidationPipe(document),
      new NestApiRequestBodyDataTransformationPipe(),
      new NestApiRelationshipsRequestBodyTransformationPipe(),
    )(target, propertyKey, parameterIndex);
  };
};

export const NestApiEntityRequest = <TModel extends Type>(
  model: TModel,
  options?: ApiBodyOptions,
): MethodDecorator => {
  const document: Type = NestApiEntityRequestDocument(model);

  return applyDecorators(
    ApiExtraModels(document),
    ApiBody({
      type: document,
      ...options,
    }),
  );
};

export const NestApiRelationshipRequest = <
  TEntity extends Entity,
  TKey extends Extract<keyof TEntity, string>,
>(
  model: Type<TEntity>,
  key: TKey,
  options?: ApiBodyOptions,
): MethodDecorator => {
  const descriptor: RelationshipDescriptor<any> =
    getRelationshipDescriptorByKey(model, key);

  const type: Type = descriptor.related();
  const nonNullable: boolean =
    descriptor.kind === 'toOne' ? !!descriptor.nonNullable : false;

  const document: Type = NestApiRelationshipRequestDocument(type, {
    nonNullable,
  });

  return applyDecorators(
    ApiExtraModels(document),
    ApiBody({
      type: document,
      ...options,
    }),
  );
};

export const NestApiRelationshipsRequest = <
  TEntity extends Entity,
  TKey extends Extract<keyof TEntity, string>,
>(
  model: Type<TEntity>,
  key: TKey,
  options?: ApiBodyOptions,
): MethodDecorator => {
  const { related } = getRelationshipDescriptorByKey(model, key);

  const document: Type = NestApiRelationshipsRequestDocument(related());

  return applyDecorators(
    ApiExtraModels(document),
    ApiBody({
      type: document,
      ...options,
    }),
  );
};
