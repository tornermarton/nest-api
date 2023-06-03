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

export interface IQueryDto<TFilter, TExpand> {
  readonly page?: PageDto;
  readonly sort?: string[];
  readonly expand?: TExpand[];
  readonly filter?: TFilter;
}

export function QueryDto<TModel, TFilter, TExpand extends keyof TModel>(
  type: Type<TModel>,
  filter: Type<TFilter>,
  expand: readonly TExpand[],
): Type<IQueryDto<TFilter, TExpand>> {
  class QueryDtoClass implements IQueryDto<TFilter, TExpand> {
    @IsOptional()
    @ValidateNested()
    @TransformType(() => PageDto)
    public readonly page?: PageDto = new PageDto();

    @IsOptional()
    @IsString({ each: true })
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
