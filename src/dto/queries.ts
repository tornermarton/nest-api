import { Type } from '@nestjs/common';
import { ApiProperty, getSchemaPath, IntersectionType } from '@nestjs/swagger';
import { Transform, Type as TransformType } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

import {
  getQueryMetadata,
  NestApiQueryMetadata,
  NestApiQueryParameter,
  setQueryMetadata,
} from '../api';
import { isNotNullOrUndefined } from '../core';

// TODO: typing based on function input
export interface IQueryEntityDto<
  TModel,
  TInclude extends Extract<keyof TModel, string>,
> {
  readonly include?: TInclude[];
}

export function QueryEntityDto<
  TModel,
  TInclude extends Extract<keyof TModel, string> = never,
>(
  type: Type<TModel>,
  {
    include,
  }: {
    include?: readonly TInclude[];
  },
): Type<IQueryEntityDto<TModel, TInclude>> {
  const queryTypes: Type[] = [];

  if (isNotNullOrUndefined(include)) {
    const values: TInclude[] = [...include];

    class QueryEntityWithInclude {
      @NestApiQueryParameter({
        options: {
          style: 'form',
          explode: false,
          enumName: `${type.name}EntityIncludeDto`,
          // TODO: this is a hack since NestJS Swagger handles enums incorrectly
          schema: {
            type: 'string',
            items: {
              type: 'string',
              enum: values,
            },
          },
          isArray: true,
        },
      })
      @IsOptional()
      @IsString({ each: true })
      @IsIn(values, { each: true })
      @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
      public readonly include?: TInclude[];
    }
    queryTypes.push(QueryEntityWithInclude);
  }

  class QueryDto extends IntersectionType(...queryTypes) {}

  const metadata: NestApiQueryMetadata = queryTypes
    .map((t) => getQueryMetadata(t.prototype))
    .reduce(
      (acc, metadata) => ({
        parameters: [...acc.parameters, ...metadata.parameters],
      }),
      { parameters: [] },
    );
  setQueryMetadata(QueryDto.prototype, metadata);

  return QueryDto as Type<IQueryEntityDto<TModel, TInclude>>;
}

export type SortDefinition<
  TModel,
  TSort extends Extract<keyof TModel, string>,
> = {
  key: TSort;
  asc: boolean;
  desc: boolean;
};

function parseSortDefinitions<
  TModel,
  TSort extends Extract<keyof TModel, string>,
>(definitions: readonly SortDefinition<TModel, TSort>[]): string[] {
  // TODO: maybe this can be done better, but this is good for now
  return definitions
    .map((d) => {
      const values: string[] = [];
      if (d.asc) {
        values.push(d.key);
      }

      if (d.desc) {
        values.push(`-${d.key.toString()}`);
      }

      return values;
    })
    .flat();
}

export class PageDto {
  public static DEFAULT_OFFSET: number = 0;
  public static DEFAULT_LIMIT: number = 100;

  @ApiProperty({
    required: false,
    minimum: 0,
    default: PageDto.DEFAULT_OFFSET,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @TransformType(() => Number)
  public readonly offset: number = PageDto.DEFAULT_OFFSET;

  @ApiProperty({
    required: false,
    minimum: 0,
    default: PageDto.DEFAULT_LIMIT,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @TransformType(() => Number)
  public readonly limit: number = PageDto.DEFAULT_LIMIT;
}

// TODO: typing based on function input
export interface IQueryEntitiesDto<
  TModel,
  TFilter,
  TInclude extends Extract<keyof TModel, string>,
> {
  readonly filter?: TFilter;
  readonly sort?: string[];
  readonly include?: TInclude[];
  readonly page: PageDto;
}

export function QueryEntitiesDto<
  TModel,
  TFilter = never,
  TSort extends Extract<keyof TModel, string> = never,
  TInclude extends Extract<keyof TModel, string> = never,
>(
  type: Type<TModel>,
  {
    filter,
    sort,
    include,
  }: {
    filter?: Type<TFilter>;
    sort?: readonly SortDefinition<TModel, TSort>[];
    include?: readonly TInclude[];
  },
): Type<IQueryEntitiesDto<TModel, TFilter, TInclude>> {
  const queryTypes: Type[] = [];

  if (isNotNullOrUndefined(filter)) {
    const type: Type<TFilter> = filter;

    class QueryEntitiesWithFilter {
      @NestApiQueryParameter({
        type: filter,
        options: {
          style: 'deepObject',
          schema: {
            $ref: getSchemaPath(type),
          },
        },
      })
      @IsOptional()
      @IsObject()
      @ValidateNested()
      @TransformType(() => type)
      public readonly filter?: TFilter;
    }
    queryTypes.push(QueryEntitiesWithFilter);
  }

  if (isNotNullOrUndefined(sort)) {
    const values: string[] = parseSortDefinitions(sort);

    class QueryEntitiesWithSort {
      @NestApiQueryParameter({
        options: {
          style: 'form',
          explode: false,
          enumName: `${type.name}EntitiesSortDto`,
          // TODO: this is a hack since NestJS Swagger handles enums incorrectly
          schema: {
            type: 'string',
            items: {
              type: 'string',
              enum: values,
            },
          },
          isArray: true,
        },
      })
      @IsOptional()
      @IsString({ each: true })
      @IsIn(values, { each: true })
      @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
      public readonly sort?: string[];
    }
    queryTypes.push(QueryEntitiesWithSort);
  }

  if (isNotNullOrUndefined(include)) {
    const values: TInclude[] = [...include];

    class QueryEntityWithInclude {
      @NestApiQueryParameter({
        options: {
          style: 'form',
          explode: false,
          enumName: `${type.name}EntitiesIncludeDto`,
          // TODO: this is a hack since NestJS Swagger handles enums incorrectly
          schema: {
            type: 'string',
            items: {
              type: 'string',
              enum: values,
            },
          },
          isArray: true,
        },
      })
      @IsOptional()
      @IsString({ each: true })
      @IsIn(values, { each: true })
      @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
      public readonly include?: TInclude[];
    }
    queryTypes.push(QueryEntityWithInclude);
  }

  class QueryEntitiesWithPage {
    @NestApiQueryParameter({
      type: PageDto,
      options: {
        style: 'deepObject',
        schema: {
          $ref: getSchemaPath(PageDto),
        },
      },
    })
    @IsOptional()
    @ValidateNested()
    @TransformType(() => PageDto)
    public readonly page: PageDto = new PageDto();
  }
  queryTypes.push(QueryEntitiesWithPage);

  class QueryDto extends IntersectionType(...queryTypes) {}

  const metadata: NestApiQueryMetadata = queryTypes
    .map((t) => getQueryMetadata(t.prototype))
    .reduce(
      (acc, metadata) => ({
        parameters: [...acc.parameters, ...metadata.parameters],
      }),
      { parameters: [] },
    );
  setQueryMetadata(QueryDto.prototype, metadata);

  return QueryDto as Type<IQueryEntitiesDto<TModel, TFilter, TInclude>>;
}

// TODO: typing based on function input
export interface IQueryRelationshipsDto<TFilter> {
  readonly filter?: TFilter;
  readonly page: PageDto;
}

export function QueryRelationshipsDto<TFilter = never>({
  filter,
}: {
  filter?: Type<TFilter>;
}): Type<IQueryRelationshipsDto<TFilter>> {
  const queryTypes: Type[] = [];

  if (isNotNullOrUndefined(filter)) {
    const type: Type<TFilter> = filter;

    class QueryRelatedWithFilter {
      @NestApiQueryParameter({
        type: filter,
        options: {
          style: 'deepObject',
          schema: {
            $ref: getSchemaPath(type),
          },
        },
      })
      @IsOptional()
      @IsObject()
      @ValidateNested()
      @TransformType(() => type)
      public readonly filter?: TFilter;
    }
    queryTypes.push(QueryRelatedWithFilter);
  }

  class QueryRelatedWithPage {
    @NestApiQueryParameter({
      type: PageDto,
      options: {
        style: 'deepObject',
        schema: {
          $ref: getSchemaPath(PageDto),
        },
      },
    })
    @IsOptional()
    @ValidateNested()
    @TransformType(() => PageDto)
    public readonly page: PageDto = new PageDto();
  }
  queryTypes.push(QueryRelatedWithPage);

  class QueryDto extends IntersectionType(...queryTypes) {}

  const metadata: NestApiQueryMetadata = queryTypes
    .map((t) => getQueryMetadata(t.prototype))
    .reduce(
      (acc, metadata) => ({
        parameters: [...acc.parameters, ...metadata.parameters],
      }),
      { parameters: [] },
    );
  setQueryMetadata(QueryDto.prototype, metadata);

  return QueryDto as Type<IQueryRelationshipsDto<TFilter>>;
}
