import { Inject, Type } from '@nestjs/common';

import { getRepositoryToken } from './utils';

export const InjectRepository = (
  type: Type,
): ((
  target: object,
  key: string | symbol | undefined,
  index?: number,
) => void) => Inject(getRepositoryToken(type));
