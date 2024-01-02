import { Inject, Type } from '@nestjs/common';

import { getResourceManagerToken } from './utils';

export const InjectResourceManager = (
  type: Type,
): ((
  target: object,
  key: string | symbol | undefined,
  index?: number,
) => void) => Inject(getResourceManagerToken(type));
