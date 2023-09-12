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

export class QueryDtoPage {
  public static DEFAULT_OFFSET: number = 0;
  public static DEFAULT_LIMIT: number = 100;

  @ApiProperty({
    required: false,
    minimum: 0,
    default: QueryDtoPage.DEFAULT_OFFSET,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @TransformType(() => Number)
  public readonly offset: number = QueryDtoPage.DEFAULT_OFFSET;

  @ApiProperty({
    required: false,
    minimum: 0,
    default: QueryDtoPage.DEFAULT_LIMIT,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @TransformType(() => Number)
  public readonly limit: number = QueryDtoPage.DEFAULT_LIMIT;
}

// TODO: type filter better
export interface IQueryDto<TModel, TFilter> {
  readonly filter: TFilter;
  readonly sort: string[];
  readonly page: QueryDtoPage;
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
  TSort extends Extract<keyof TModel, string>,
>(
  type: Type<TModel>,
  filter: Type<TFilter>,
  sort: readonly SortDefinition<TModel, TSort>[],
): Type<IQueryDto<TModel, TFilter>> {
  class QueryDtoClass implements IQueryDto<TModel, TFilter> {
    @IsOptional()
    @IsObject()
    @ValidateNested()
    @TransformType(() => filter)
    public readonly filter: TFilter = {} as TFilter;

    @IsOptional()
    @IsString({ each: true })
    @IsIn(parseSortDefinitions(sort), { each: true })
    @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
    // TODO: type sort somehow
    public readonly sort: string[] = [];

    @IsOptional()
    @ValidateNested()
    @TransformType(() => QueryDtoPage)
    public readonly page: QueryDtoPage = new QueryDtoPage();
  }

  return QueryDtoClass;
}
