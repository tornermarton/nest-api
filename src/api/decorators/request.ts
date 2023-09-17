import {
  applyDecorators,
  Body,
  createParamDecorator,
  ExecutionContext,
  Param,
  Type,
} from '@nestjs/common';
import { ApiBody, ApiBodyOptions, ApiExtraModels } from '@nestjs/swagger';
import { ParameterObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { Request } from 'express';

import { isNotNullOrUndefined } from '../../core';
import {
  NestApiEntityRequestBodyTransformationPipe,
  NestApiRelationshipRequestBodyTransformationPipe,
  NestApiRelationshipsRequestBodyTransformationPipe,
  NestApiRequestBodyDataTransformationPipe,
  NestApiRequestBodyValidationPipe,
  NestApiRequestIdPipe,
  NestApiRequestQueryValidationPipe,
} from '../../request';
import { SWAGGER_API_PARAMETERS_METADATA_KEY } from '../constants';
import { getQueryMetadata, NestApiQueryMetadata } from '../metadata';
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

export const NestApiRequestQuery = <TModel extends Type>(
  model: TModel,
): ParameterDecorator => {
  return (
    target: object,
    propertyKey: string | symbol,
    parameterIndex: number,
  ) => {
    const descriptor: PropertyDescriptor | undefined =
      Object.getOwnPropertyDescriptor(target, propertyKey);

    const parameters: ParameterObject[] =
      Reflect.getMetadata(
        SWAGGER_API_PARAMETERS_METADATA_KEY,
        descriptor?.value,
      ) ?? [];

    const metadata: NestApiQueryMetadata = getQueryMetadata(model.prototype);
    const metadataParameters: ParameterObject[] = metadata.parameters.map(
      ({ openapi }) => openapi,
    );
    const metadataModels: Type[] = metadata.parameters
      .map(({ type }) => type)
      .filter(isNotNullOrUndefined);

    Reflect.defineMetadata(
      SWAGGER_API_PARAMETERS_METADATA_KEY,
      [...parameters, ...metadataParameters],
      descriptor?.value,
    );

    ApiExtraModels(...metadataModels)(target, propertyKey, descriptor);
    SilentQuery(NestApiRequestQueryValidationPipe)(
      target,
      propertyKey,
      parameterIndex,
    );
  };
};

export const NestApiEntityRequestBody = <TModel extends Type>(
  model: TModel,
): ParameterDecorator => {
  return (
    target: object,
    propertyKey: string | symbol,
    parameterIndex: number,
  ) => {
    const document: Type = NestApiEntityRequestDocument(model);

    Body(
      new NestApiRequestBodyValidationPipe(document),
      new NestApiRequestBodyDataTransformationPipe(),
      new NestApiEntityRequestBodyTransformationPipe(model),
    )(target, propertyKey, parameterIndex);
  };
};

export const NestApiRelationshipRequestBody = <TModel extends Type>(
  model: TModel,
  options?: { nonNullable?: boolean },
): ParameterDecorator => {
  return (
    target: object,
    propertyKey: string | symbol,
    parameterIndex: number,
  ) => {
    const document: Type = NestApiRelationshipRequestDocument(model, {
      nonNullable: options?.nonNullable,
    });

    Body(
      new NestApiRequestBodyValidationPipe(document),
      new NestApiRequestBodyDataTransformationPipe(),
      new NestApiRelationshipRequestBodyTransformationPipe(),
    )(target, propertyKey, parameterIndex);
  };
};

export const NestApiRelationshipsRequestBody = <TModel extends Type>(
  model: TModel,
): ParameterDecorator => {
  return (
    target: object,
    propertyKey: string | symbol,
    parameterIndex: number,
  ) => {
    const document: Type = NestApiRelationshipsRequestDocument(model);

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

export const NestApiRelationshipRequest = <TModel extends Type>(
  model: TModel,
  options?: ApiBodyOptions & { nonNullable?: boolean },
): MethodDecorator => {
  const document: Type = NestApiRelationshipRequestDocument(model, {
    nonNullable: options?.nonNullable,
  });

  return applyDecorators(
    ApiExtraModels(document),
    ApiBody({
      type: document,
      ...options,
    }),
  );
};

export const NestApiRelationshipsRequest = <TModel extends Type>(
  model: TModel,
  options?: ApiBodyOptions,
): MethodDecorator => {
  const document: Type = NestApiRelationshipsRequestDocument(model);

  return applyDecorators(
    ApiExtraModels(document),
    ApiBody({
      type: document,
      ...options,
    }),
  );
};
