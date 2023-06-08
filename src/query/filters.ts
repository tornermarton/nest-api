import { Type } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type as TransformType } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export interface IRegexFilter {
  readonly $regex?: string;
}

export function RegexFilter(options?: {
  caseInsensitive: boolean;
}): Type<IRegexFilter> {
  class RegexFilterClass implements IRegexFilter {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    public readonly $regex?: string;

    // public readonly $options = options?.caseInsensitive ? 'i' : '';
  }

  return RegexFilterClass;
}

export interface IGteFilter<T> {
  readonly $gte?: T;
}

export function GteFilter<T>(type: Type<T>): Type<IGteFilter<T>> {
  class GteFilterClass implements IGteFilter<T> {
    @ApiPropertyOptional({ type })
    @IsOptional()
    @TransformType(() => type)
    public readonly $gte?: T;
  }

  return GteFilterClass;
}

export interface ILteFilter<T> {
  readonly $lte?: T;
}

export function LteFilter<T>(type: Type<T>): Type<ILteFilter<T>> {
  class LteFilterClass implements ILteFilter<T> {
    @ApiPropertyOptional({ type })
    @IsOptional()
    @TransformType(() => type)
    public readonly $lte?: T;
  }

  return LteFilterClass;
}

export interface IIntervalFilter<T> {
  readonly $gte?: T;
  readonly $lte?: T;
}

export function IntervalFilter<T>(type: Type<T>): Type<IIntervalFilter<T>> {
  class IntervalFilterClass implements IIntervalFilter<T> {
    @ApiPropertyOptional({ type })
    @IsOptional()
    @TransformType(() => type)
    public readonly $gte?: T;

    @ApiPropertyOptional({ type })
    @IsOptional()
    @TransformType(() => type)
    public readonly $lte?: T;
  }

  return IntervalFilterClass;
}
