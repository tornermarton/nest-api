import { Type } from '@nestjs/common';

export function getResourceManagerToken<T>(type: Type<T>): string {
  const name: string = type.name;

  return `${name}ResourceManager`;
}
