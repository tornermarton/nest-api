import { Type } from '@nestjs/common';
import { ApiQueryOptions } from '@nestjs/swagger';
import { ParameterObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

import {
  getQueryMetadata,
  NestApiQueryMetadata,
  setQueryMetadata,
} from '../metadata';

export function NestApiQueryParameter<T>({
  type,
  options,
}: {
  type?: Type<T>;
  // TODO: should remove name and required since they get overwritten
  options?: ApiQueryOptions;
}): PropertyDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (target: Object, propertyKey: string | symbol): void => {
    const openapi: ParameterObject = {
      ...options,
      name: propertyKey as string,
      in: 'query',
      required: false,
    };

    const metadata: NestApiQueryMetadata = getQueryMetadata(target);
    setQueryMetadata(target, {
      ...metadata,
      parameters: [...metadata.parameters, { type: type, openapi: openapi }],
    });
  };
}
