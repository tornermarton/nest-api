import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { Passport } from './interfaces';

export const NestApiPassport = createParamDecorator(
  (_: string, context: ExecutionContext): Passport => {
    const { user } = context.switchToHttp().getRequest();

    return user;
  },
);
