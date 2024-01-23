import { Inject, Type } from '@nestjs/common';

import { getResourceManagerToken } from './utils';

export const InjectResourceManager = (
  type: Type,
): PropertyDecorator & ParameterDecorator =>
  Inject(getResourceManagerToken(type));
