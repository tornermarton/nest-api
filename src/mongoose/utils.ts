import { Type } from '@nestjs/common';
import { instanceToPlain, plainToInstance } from 'class-transformer';

export function createTransform<T>(type: Type<T>): (d: T) => object {
  return (d: T): object => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const obj: T = plainToInstance(type, d['_doc']);
    return instanceToPlain(obj, { excludeExtraneousValues: true });
  };
}
