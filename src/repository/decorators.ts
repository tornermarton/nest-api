import { Inject } from '@nestjs/common';

import { getRepositoryToken } from './utils';

export const InjectRepository = (
  name: string,
): ((
  target: object,
  key: string | symbol | undefined,
  index?: number,
) => void) => Inject(getRepositoryToken(name));
