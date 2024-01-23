import { Inject, Type } from '@nestjs/common';

import {
  getEntityRepositoryToken,
  getRelationshipRepositoryToken,
} from './utils';

export const InjectEntityRepository = (
  type: Type,
): PropertyDecorator & ParameterDecorator =>
  Inject(getEntityRepositoryToken(type));

export const InjectRelationshipRepository = (
  name: string,
): PropertyDecorator & ParameterDecorator =>
  Inject(getRelationshipRepositoryToken(name));
