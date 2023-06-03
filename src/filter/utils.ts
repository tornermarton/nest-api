import { isEmpty } from 'lodash';

export function ifExists<V, T>(value: V, then: T): T | undefined {
  return !isEmpty(value) && then;
}

// export function like(value: string, caseInsensitive = true): RegexFilter {
//   const options = caseInsensitive ? 'i' : '';
//   return { $regex: `.*${value}.*`, $options: options };
// }

// export function gte<T>(value: T): GteFilter<T> {
//   return { $gte: value };
// }

// export function gteIfExists<T>(value: T): GteFilter<T> | undefined {
//   return ifExists(value, gte(value));
// }

// export function lte<T>(value: T): LteFilter<T> | undefined {
//   return { $lte: value };
// }

// export function lteIfExists<T>(value: T): LteFilter<T> | undefined {
//   return ifExists(value, lte(value));
// }

// export function between<T>(start: T, end: T): BetweenFilter<T> {
//   return { ...gte(start), ...lte(end) };
// }

// export function interval<T>(start: T, end: T): IntervalFilter<T> {
//   return { ...gteIfExists(start), ...lteIfExists(end) };
// }
