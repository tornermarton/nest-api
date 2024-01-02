import { Type } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Entity } from '../../core';
import { getResourceMetadata } from '../metadata';

type NestApiControllerOptions = {
  auth: boolean;
};

export const NestApiController = <TEntity extends Entity>(
  entity: Type<TEntity>,
  options?: NestApiControllerOptions,
): ClassDecorator => {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (target: Function): void => {
    const metadata = getResourceMetadata(entity.prototype);
    const { name } = metadata;

    ApiTags(name)(target);

    if (options?.auth) {
      ApiBearerAuth()(target);
    }
  };
};
