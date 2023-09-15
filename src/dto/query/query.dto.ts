import { Type } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
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

export interface IQueryDto<
  TModel,
  TFilter,
  TInclude extends Extract<keyof TModel, string>,
> {
  readonly filter: TFilter;
  readonly sort: string[];
  readonly include: TInclude[];
  readonly page: PageDto;
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

export function QueryDto<
  TModel,
  TFilter,
  TSort extends Extract<keyof TModel, string> = never,
  TInclude extends Extract<keyof TModel, string> = never,
>(
  type: Type<TModel>,
  filter: Type<TFilter>,
  sort: readonly SortDefinition<TModel, TSort>[] = [],
  include: readonly TInclude[] = [],
): Type<IQueryDto<TModel, TFilter, TInclude>> {
  const sortOptions: string[] = parseSortDefinitions(sort);

  class QueryDtoClass implements IQueryDto<TModel, TFilter, TInclude> {
    @IsOptional()
    @IsObject()
    @ValidateNested()
    @TransformType(() => filter)
    public readonly filter: TFilter = {} as TFilter;

    @IsOptional()
    @IsString({ each: true })
    @IsIn(sortOptions, { each: true })
    @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
    public readonly sort: string[] = [];

    @IsOptional()
    @IsString({ each: true })
    @IsIn(include, { each: true })
    @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
    public readonly include: TInclude[] = [];

    @IsOptional()
    @ValidateNested()
    @TransformType(() => PageDto)
    public readonly page: PageDto = new PageDto();
  }

  return QueryDtoClass;
}
