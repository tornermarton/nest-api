import 'reflect-metadata';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, Min, ValidateNested } from 'class-validator';

export class PageDto {
  public static DEFAULT_LIMIT = 100;
  public static DEFAULT_OFFSET = 0;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  public readonly limit: number = PageDto.DEFAULT_LIMIT;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  public readonly offset: number = PageDto.DEFAULT_OFFSET;
}

export type SortDto = { [key: string]: 1 | -1 };

function transformSortDto(s: string): SortDto {
  return s.split(',').reduce((acc, curr) => {
    if (curr.startsWith('-')) {
      acc[curr.substring(1)] = -1;
    } else {
      acc[curr] = 1;
    }
    return acc;
  }, {} as SortDto);
}

export type FilterDto = { [key: string]: string[] };

function transformFilterDto(s: object | string): FilterDto {
  if (typeof s === 'string') {
    return { filter: [s] };
  }

  return Object.keys(s).reduce((acc, curr) => {
    acc[curr] = s[curr].split(',');

    return acc;
  }, {} as FilterDto);
}

export class QueryDto {
  public static DEFAULT_SORT: SortDto = {};
  public static DEFAULT_FILTER: FilterDto = {};
  public static DEFAULT_EXPAND: string[] = [];

  @IsOptional()
  @Type(() => PageDto)
  @ValidateNested()
  public readonly page: PageDto = new PageDto();

  @IsOptional()
  @Transform(({ value }) => transformSortDto(value))
  public readonly sort: SortDto = QueryDto.DEFAULT_SORT;

  @IsOptional()
  @Transform(({ value }) => transformFilterDto(value))
  public readonly filter: FilterDto = QueryDto.DEFAULT_FILTER;

  @IsOptional()
  @Transform(({ value }) => value.split(','))
  public readonly expand: string[] = QueryDto.DEFAULT_EXPAND;
}
