import { Inject, Type } from '@nestjs/common';

import { getEntityManagerToken } from './utils';

export const InjectEntityManager = (
  type: Type,
): ((
  target: object,
  key: string | symbol | undefined,
  index?: number,
) => void) => Inject(getEntityManagerToken(type));
