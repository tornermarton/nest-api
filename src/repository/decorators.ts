import { Inject } from '@nestjs/common';

import { getRepositoryToken } from './utils';

export const InjectRepository = (name: string) =>
  Inject(getRepositoryToken(name));
