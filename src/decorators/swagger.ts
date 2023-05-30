import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiResponse,
  ApiResponseOptions,
  getSchemaPath,
} from '@nestjs/swagger';

import { EntityApiResponse, PagedApiResponse } from '../response';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const EntityNestApiResponse = <TModel extends Type>(
  model: TModel,
  options?: ApiResponseOptions,
) => {
  return applyDecorators(
    ApiResponse({
      ...options,
      schema: {
        title: `EntityResponseOf${model.name}`,
        allOf: [
          { $ref: getSchemaPath(EntityApiResponse) },
          {
            properties: {
              data: {
                $ref: getSchemaPath(model),
              },
            },
            required: ['data'],
          },
        ],
      },
    }),
  );
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const PagedNestApiResponse = <TModel extends Type>(
  model: TModel,
  options?: ApiResponseOptions,
) => {
  return applyDecorators(
    ApiResponse({
      ...options,
      schema: {
        title: `PagedResponseOf${model.name}`,
        allOf: [
          { $ref: getSchemaPath(PagedApiResponse) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
            },
            required: ['data'],
          },
        ],
      },
    }),
  );
};
