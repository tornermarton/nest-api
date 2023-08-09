import { Type } from '@nestjs/common';

export function getEntityManagerToken<T>(type: Type<T>): string {
  const name: string = type.name;

  return `${name}EntityManager`;
}
