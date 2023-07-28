import { Type } from '@nestjs/common';

export function getRepositoryToken(type: Type): string {
  return `${type.name}Repository`;
}
