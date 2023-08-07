import { Type } from '@nestjs/common';

export function getModelToken(name: string): string {
  return `${name}Model`;
}

export function getEntityRepositoryToken<T>(type: Type<T>): string {
  const name: string = type.name;

  return `${name}EntityRepository`;
}

export function getRelationshipRepositoryToken(name: string): string {
  return `${name}RelationshipRepository`;
}
