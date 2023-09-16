import { Type } from '@nestjs/common';
import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
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

import { NestApiQueryParameter } from '../../api';

export interface IQueryEntityDto<
  TModel,
  TInclude extends Extract<keyof TModel, string>,
> {
  readonly include: TInclude[];
}

// TODO: remove optional omitted elements from API
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
  class EntityQueryDtoClass implements IQueryEntityDto<TModel, TInclude> {
    @NestApiQueryParameter({
      options: {
        style: 'form',
        explode: false,
        schema: {
          type: 'array',
          items: {
            type: 'string',
            enum: [...(include ?? [])],
          },
        },
      },
    })
    @IsOptional()
    @IsString({ each: true })
    @IsIn(include ?? [], { each: true })
    @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
    public readonly include: TInclude[] = [];
  }

  return EntityQueryDtoClass;
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

export interface IQueryEntitiesDto<
  TModel,
  TFilter,
  TInclude extends Extract<keyof TModel, string>,
> {
  readonly filter: TFilter;
  readonly sort: string[];
  readonly include: TInclude[];
  readonly page: PageDto;
}

// TODO: remove optional omitted elements from API
export function QueryEntitiesDto<
  TModel,
  TFilter,
  TSort extends Extract<keyof TModel, string> = never,
  TInclude extends Extract<keyof TModel, string> = never,
>(
  type: Type<TModel>,
  {
    filter,
    sort,
    include,
  }: {
    filter: Type<TFilter>;
    sort?: readonly SortDefinition<TModel, TSort>[];
    include?: readonly TInclude[];
  },
): Type<IQueryEntitiesDto<TModel, TFilter, TInclude>> {
  const sortOptions: string[] = parseSortDefinitions(sort ?? []);

  class EntitiesQueryDtoClass
    implements IQueryEntitiesDto<TModel, TFilter, TInclude>
  {
    @NestApiQueryParameter({
      type: filter,
      options: {
        style: 'deepObject',
        schema: {
          $ref: getSchemaPath(filter),
        },
      },
    })
    @IsOptional()
    @IsObject()
    @ValidateNested()
    @TransformType(() => filter)
    public readonly filter: TFilter = {} as TFilter;

    @NestApiQueryParameter({
      options: {
        style: 'form',
        explode: false,
        schema: {
          type: 'array',
          items: {
            type: 'string',
            enum: sortOptions,
          },
        },
      },
    })
    @IsOptional()
    @IsString({ each: true })
    @IsIn(sortOptions, { each: true })
    @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
    public readonly sort: string[] = [];

    @NestApiQueryParameter({
      options: {
        style: 'form',
        explode: false,
        schema: {
          type: 'array',
          items: {
            type: 'string',
            enum: [...(include ?? [])],
          },
        },
      },
    })
    @IsOptional()
    @IsString({ each: true })
    @IsIn(include ?? [], { each: true })
    @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
    public readonly include: TInclude[] = [];

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

  return EntitiesQueryDtoClass;
}
