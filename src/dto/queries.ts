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
import { ResourceRelationshipKey } from '../modules';

// TODO: typing based on function input
export interface IQueryResourceDto<
  TResource,
  TInclude extends ResourceRelationshipKey<TResource> = never,
> {
  readonly include?: TInclude[];
}

export function QueryResourceDto<
  TResource,
  TInclude extends ResourceRelationshipKey<TResource> = never,
>(
  type: Type<TResource>,
  {
    include,
  }: {
    include?: readonly TInclude[];
  },
): Type<IQueryResourceDto<TResource, TInclude>> {
  const queryTypes: Type[] = [];

  if (isNotNullOrUndefined(include)) {
    const values: TInclude[] = [...include];

    class QueryResourceWithInclude {
      @NestApiQueryParameter({
        options: {
          style: 'form',
          explode: false,
          enumName: `${type.name}ResourceIncludeDto`,
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
    queryTypes.push(QueryResourceWithInclude);
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

  return QueryDto as Type<IQueryResourceDto<TResource, TInclude>>;
}

export type SortDefinition<
  TResource,
  TSort extends Extract<keyof TResource, string>,
> = {
  key: TSort;
  asc: boolean;
  desc: boolean;
};

function parseSortDefinitions<
  TResource,
  TSort extends Extract<keyof TResource, string>,
>(definitions: readonly SortDefinition<TResource, TSort>[]): string[] {
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
export interface IQueryResourcesDto<
  TResource,
  TFilter = never,
  TInclude extends ResourceRelationshipKey<TResource> = never,
> {
  readonly filter?: TFilter;
  readonly sort?: string[];
  readonly include?: TInclude[];
  readonly page: PageDto;
}

export function QueryResourcesDto<
  TResource,
  TFilter = never,
  TSort extends Extract<keyof TResource, string> = never,
  TInclude extends ResourceRelationshipKey<TResource> = never,
>(
  type: Type<TResource>,
  {
    filter,
    sort,
    include,
  }: {
    filter?: Type<TFilter>;
    sort?: readonly SortDefinition<TResource, TSort>[];
    include?: readonly TInclude[];
  },
): Type<IQueryResourcesDto<TResource, TFilter, TInclude>> {
  const queryTypes: Type[] = [];

  if (isNotNullOrUndefined(filter)) {
    const type: Type<TFilter> = filter;

    class QueryResourcesWithFilter {
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
    queryTypes.push(QueryResourcesWithFilter);
  }

  if (isNotNullOrUndefined(sort)) {
    const values: string[] = parseSortDefinitions(sort);

    class QueryResourcesWithSort {
      @NestApiQueryParameter({
        options: {
          style: 'form',
          explode: false,
          enumName: `${type.name}ResourcesSortDto`,
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
    queryTypes.push(QueryResourcesWithSort);
  }

  if (isNotNullOrUndefined(include)) {
    const values: TInclude[] = [...include];

    class QueryResourceWithInclude {
      @NestApiQueryParameter({
        options: {
          style: 'form',
          explode: false,
          enumName: `${type.name}ResourcesIncludeDto`,
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
    queryTypes.push(QueryResourceWithInclude);
  }

  class QueryResourcesWithPage {
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
  queryTypes.push(QueryResourcesWithPage);

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

  return QueryDto as Type<IQueryResourcesDto<TResource, TFilter, TInclude>>;
}

// TODO: typing based on function input
export interface IQueryRelationshipsDto<TFilter = never> {
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
