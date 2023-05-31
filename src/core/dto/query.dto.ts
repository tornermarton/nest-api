import 'reflect-metadata';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

import { ApiQueryPropertyOptional } from '../../decorators';

export class PageDto {
  public static DEFAULT_LIMIT = 100;
  public static DEFAULT_OFFSET = 0;

  @ApiQueryPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  public readonly limit: number = PageDto.DEFAULT_LIMIT;

  @ApiQueryPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  public readonly offset: number = PageDto.DEFAULT_OFFSET;
}

export type SortDto = { [key: string]: 1 | -1 };
function transformSortDto(sort: string[]): SortDto {
  return sort.reduce((acc, curr) => {
    if (curr.startsWith('-')) {
      acc[curr.substring(1)] = -1;
    } else {
      acc[curr] = 1;
    }
    return acc;
  }, {} as SortDto);
}

export class QueryDto<T> {
  public static DEFAULT_SORT: string[] = [];
  public static DEFAULT_FILTER: Record<any, string[]> = {};
  public static DEFAULT_EXPAND: string[] = [];

  @IsOptional()
  @Type(() => PageDto)
  @ValidateNested()
  public readonly page?: PageDto = new PageDto();

  @IsOptional()
  @IsString({ each: true })
  public readonly sort?: string[] = QueryDto.DEFAULT_SORT;

  @IsOptional()
  @IsObject()
  public readonly filter?: Record<keyof T, string[]> = QueryDto.DEFAULT_FILTER;

  @IsOptional()
  @IsString({ each: true })
  public readonly expand?: string[] = QueryDto.DEFAULT_EXPAND;
}
