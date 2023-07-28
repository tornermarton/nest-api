import { Type } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type as TransformType } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export interface RegexFilterInterface {
  readonly $regex?: string;
}

export function RegexFilter(options?: {
  caseInsensitive: boolean;
}): Type<RegexFilterInterface> {
  class RegexFilterClass implements RegexFilterInterface {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    public readonly $regex?: string;

    // public readonly $options = options?.caseInsensitive ? 'i' : '';
  }

  return RegexFilterClass;
}

export interface GteFilterInterface<T> {
  readonly $gte?: T;
}

export function GteFilter<T>(type: Type<T>): Type<GteFilterInterface<T>> {
  class GteFilterClass implements GteFilterInterface<T> {
    @ApiPropertyOptional({ type })
    @IsOptional()
    @TransformType(() => type)
    public readonly $gte?: T;
  }

  return GteFilterClass;
}

export interface LteFilterInterface<T> {
  readonly $lte?: T;
}

export function LteFilter<T>(type: Type<T>): Type<LteFilterInterface<T>> {
  class LteFilterClass implements LteFilterInterface<T> {
    @ApiPropertyOptional({ type })
    @IsOptional()
    @TransformType(() => type)
    public readonly $lte?: T;
  }

  return LteFilterClass;
}

export interface IntervalFilterInterface<T> {
  readonly $gte?: T;
  readonly $lte?: T;
}

export function IntervalFilter<T>(
  type: Type<T>,
): Type<IntervalFilterInterface<T>> {
  class IntervalFilterClass implements IntervalFilterInterface<T> {
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
