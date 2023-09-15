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

import { PageDto } from '../../dto';
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

function createEntityQueryParameterObjects(): ParameterObject[] {
  return [
    {
      name: 'include',
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

function createEntitiesQueryParameterObjects(
  filterType: Type,
): ParameterObject[] {
  return [
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
      name: 'include',
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
      name: 'page',
      in: 'query',
      required: false,
      style: 'deepObject',
      schema: {
        $ref: getSchemaPath(PageDto),
      },
    },
  ];
}

export const NestApiEntityRequestQuery = (): ParameterDecorator => {
  return (
    target: object,
    propertyKey: string | symbol,
    parameterIndex: number,
  ) => {
    const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);

    SilentQuery(NestApiRequestQueryValidationPipe)(
      target,
      propertyKey,
      parameterIndex,
    );

    const parameters: ParameterObject[] | undefined = Reflect.getMetadata(
      SWAGGER_API_PARAMETERS_METADATA_KEY,
      descriptor?.value,
    );

    const query: ParameterObject[] = createEntityQueryParameterObjects();

    Reflect.defineMetadata(
      SWAGGER_API_PARAMETERS_METADATA_KEY,
      [...(parameters ?? []), ...query],
      descriptor?.value,
    );
  };
};

export const NestApiEntitiesRequestQuery = <TModel extends Type>(
  model: TModel,
): ParameterDecorator => {
  return (
    target: object,
    propertyKey: string | symbol,
    parameterIndex: number,
  ) => {
    const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);

    ApiExtraModels(model)(target, propertyKey, descriptor);
    ApiExtraModels(PageDto)(target, propertyKey, descriptor);
    SilentQuery(NestApiRequestQueryValidationPipe)(
      target,
      propertyKey,
      parameterIndex,
    );

    const parameters: ParameterObject[] | undefined = Reflect.getMetadata(
      SWAGGER_API_PARAMETERS_METADATA_KEY,
      descriptor?.value,
    );

    const query: ParameterObject[] = createEntitiesQueryParameterObjects(model);

    Reflect.defineMetadata(
      SWAGGER_API_PARAMETERS_METADATA_KEY,
      [...(parameters ?? []), ...query],
      descriptor?.value,
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
