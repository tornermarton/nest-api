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
  getSchemaPath,
} from '@nestjs/swagger';
import { ParameterObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { Request } from 'express';

import { QueryDtoPage } from '../../dto';
import {
  NestApiRelationshipRequestBodyTransformationPipe,
  NestApiRelationshipsRequestBodyTransformationPipe,
  NestApiRequestBodyDataTransformationPipe,
  NestApiRequestBodyValidationPipe,
  NestApiRequestIdPipe,
  NestApiRequestQueryValidationPipe,
} from '../../request';
import { SWAGGER_API_PARAMETERS_METADATA_KEY } from '../constants';
import {
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

function createQueryParameterObjects(filterType: Type): ParameterObject[] {
  return [
    {
      name: 'page',
      in: 'query',
      required: false,
      style: 'deepObject',
      schema: {
        properties: {
          limit: { type: 'number', default: QueryDtoPage.DEFAULT_LIMIT },
          offset: { type: 'number', default: QueryDtoPage.DEFAULT_OFFSET },
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
        $ref: getSchemaPath(filterType),
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
}

export const NestApiRequestQuery = <TModel extends Type>(
  model: TModel,
): ParameterDecorator => {
  return (
    target: object,
    propertyKey: string | symbol,
    parameterIndex: number,
  ) => {
    const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);

    ApiExtraModels(model)(target, propertyKey, descriptor);
    SilentQuery(NestApiRequestQueryValidationPipe)(
      target,
      propertyKey,
      parameterIndex,
    );

    const parameters: ParameterObject[] | undefined = Reflect.getMetadata(
      SWAGGER_API_PARAMETERS_METADATA_KEY,
      descriptor?.value,
    );

    const query: ParameterObject[] = createQueryParameterObjects(model);

    Reflect.defineMetadata(
      SWAGGER_API_PARAMETERS_METADATA_KEY,
      [...(parameters ?? []), ...query],
      descriptor?.value,
    );
  };
};

export const NestApiRelationshipRequestBody = <TModel extends Type>(
  model: TModel,
): ParameterDecorator => {
  return (
    target: object,
    propertyKey: string | symbol,
    parameterIndex: number,
  ) => {
    const document: Type = NestApiRelationshipRequestDocument(model);

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

export const NestApiRelationshipRequest = <TModel extends Type>(
  model: TModel,
  options?: ApiBodyOptions,
): MethodDecorator => {
  const document: Type = NestApiRelationshipRequestDocument(model);

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
