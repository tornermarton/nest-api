import { Schema as MongooseSchema } from '@nestjs/mongoose';

import { createTransform } from './utils';

export function Schema(): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (target: Function): void => {
    MongooseSchema({
      timestamps: true,
      toObject: { transform: createTransform(target as any) },
      toJSON: { transform: createTransform(target as any) },
    })(target);
  };
}
