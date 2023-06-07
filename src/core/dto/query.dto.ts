import 'reflect-metadata';

import { Type } from '@nestjs/common';
import { Type as TransformType } from 'class-transformer';
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
  public static DEFAULT_LIMIT = 100;
  public static DEFAULT_OFFSET = 0;

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
  readonly page?: PageDto;
  readonly sort?: string[];
  readonly expand?: TExpand[];
  readonly filter?: TFilter;
}

export type SortDefinition<
  TModel,
  TSort extends Extract<keyof TModel, string>,
> = {
  key: TSort;
  asc: boolean;
  desc: boolean;
};

export function QueryDto<
  TModel,
  TSort extends Extract<keyof TModel, string>,
  TFilter,
  TExpand extends Extract<keyof TModel, string>,
>(
  type: Type<TModel>,
  sort: readonly SortDefinition<TModel, TSort>[],
  filter: Type<TFilter>,
  expand: readonly TExpand[],
): Type<IQueryDto<TModel, TFilter, TExpand>> {
  // TODO: maybe this can be done better, but this is good for now
  const sortValues = sort
    .map((d) => {
      const values = [];
      if (d.asc) {
        values.push(d.key);
      }

      if (d.desc) {
        values.push(`-${d.key.toString()}`);
      }

      return values;
    })
    .flat();

  class QueryDtoClass implements IQueryDto<TModel, TFilter, TExpand> {
    @IsOptional()
    @ValidateNested()
    @TransformType(() => PageDto)
    public readonly page?: PageDto = new PageDto();

    @IsOptional()
    @IsString({ each: true })
    @IsIn(sortValues)
    public readonly sort?: string[];
    // TODO: type sort somehow

    @IsOptional()
    @IsString({ each: true })
    @IsIn(expand)
    public readonly expand?: TExpand[];

    @IsOptional()
    @IsObject()
    @ValidateNested()
    @TransformType(() => filter)
    public readonly filter?: TFilter = {} as TFilter;
  }

  return QueryDtoClass;
}
