import { Type } from '@nestjs/common';
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
  public static DEFAULT_LIMIT: number = 100;
  public static DEFAULT_OFFSET: number = 0;

  @IsOptional()
  @IsInt()
  @Min(0)
  @TransformType(() => Number)
  public readonly limit: number = PageDto.DEFAULT_LIMIT;

  @IsOptional()
  @IsInt()
  @Min(0)
  @TransformType(() => Number)
  public readonly offset: number = PageDto.DEFAULT_OFFSET;
}

export interface IQueryDto<
  TModel,
  TFilter,
  TExpand extends Extract<keyof TModel, string>,
> {
  readonly page: PageDto;
  readonly filter: TFilter;
  readonly expand: TExpand[];
  readonly sort: string[];
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
  TExpand extends Extract<keyof TModel, string>,
  TSort extends Extract<keyof TModel, string>,
>(
  type: Type<TModel>,
  filter: Type<TFilter>,
  expand: readonly TExpand[],
  sort: readonly SortDefinition<TModel, TSort>[],
): Type<IQueryDto<TModel, TFilter, TExpand>> {
  class QueryDtoClass implements IQueryDto<TModel, TFilter, TExpand> {
    @IsOptional()
    @ValidateNested()
    @TransformType(() => PageDto)
    public readonly page: PageDto = new PageDto();

    @IsOptional()
    @IsObject()
    @ValidateNested()
    @TransformType(() => filter)
    public readonly filter: TFilter = {} as TFilter;

    @IsOptional()
    @IsString({ each: true })
    @IsIn(expand, { each: true })
    @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
    public readonly expand: TExpand[] = [];

    @IsOptional()
    @IsString({ each: true })
    @IsIn(parseSortDefinitions(sort), { each: true })
    @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
    // TODO: type sort somehow
    public readonly sort: string[] = [];
  }

  return QueryDtoClass;
}
