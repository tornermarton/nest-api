import { IsInt, IsOptional, Min, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { NotImplementedException } from '@nestjs/common';

export class PageDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  readonly limit: number = 0;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  readonly offset: number = 0;
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
    // TODO: parse string expression to filter expression
    throw new NotImplementedException();
  }

  return Object.keys(s).reduce((acc, curr) => {
    acc[curr] = s[curr].split(',');

    return acc;
  }, {} as FilterDto);
}

export class QueryDto {
  @IsOptional()
  @Type(() => PageDto)
  @ValidateNested()
  readonly page: PageDto = new PageDto();

  @IsOptional()
  @Transform(({ value }) => transformSortDto(value))
  readonly sort: SortDto = {};

  @IsOptional()
  @Transform(({ value }) => transformFilterDto(value))
  readonly filter: FilterDto = {};
}
