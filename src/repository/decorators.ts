import { Inject, Type } from '@nestjs/common';

import {
  getEntityRepositoryToken,
  getRelationshipRepositoryToken,
} from './utils';

export const InjectEntityRepository = (
  type: Type,
): ((
  target: object,
  key: string | symbol | undefined,
  index?: number,
) => void) => Inject(getEntityRepositoryToken(type));

export const InjectRelationshipRepository = (
  name: string,
): ((
  target: object,
  key: string | symbol | undefined,
  index?: number,
) => void) => Inject(getRelationshipRepositoryToken(name));
