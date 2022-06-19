import { isEmpty } from 'lodash';

export type GteFilter<T> = {
  $gte: T;
};

export function gte<T>(value: T): GteFilter<T> {
  return { $gte: value };
}

export type LteFilter<T> = {
  $lte: T;
};

export function lte<T>(value: T): LteFilter<T> | undefined {
  return { $lte: value };
}

export type BetweenFilter<T> = {
  $gte: T;
  $lte: T;
};

export function between<T>(start: T, end: T): BetweenFilter<T> {
  return { ...gte(start), ...lte(end) };
}

export type RegexFilter = {
  $regex: string;
  $options: string;
};

export function like(value: string, caseInsensitive = true): RegexFilter {
  const options = caseInsensitive ? 'i' : '';
  return { $regex: `.*${value}.*`, $options: options };
}

export function ifExists<T>(value: any, then: T): T | undefined {
  return !isEmpty(value) && then;
}

export function gteIfExists<T>(value: T): GteFilter<T> | undefined {
  return ifExists(value, gte(value));
}

export function lteIfExists<T>(value: T): LteFilter<T> | undefined {
  return ifExists(value, lte(value));
}

export type IntervalFilter<T> = {
  $gte?: T;
  $lte?: T;
};

export function interval<T>(start: T, end: T): IntervalFilter<T> {
  return { ...gteIfExists(start), ...lteIfExists(end) };
}
