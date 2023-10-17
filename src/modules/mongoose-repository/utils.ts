import { instanceToPlain } from 'class-transformer';

export function filterDtoToQuery<T>(filter: T): Record<string, unknown> {
  return instanceToPlain(filter);
}

export function sortDtoToQuery(sort: string[]): Record<string, 1 | -1> {
  return sort.reduce((acc, curr) => {
    if (curr.startsWith('-')) {
      acc[curr.substring(1)] = -1;
    } else {
      acc[curr] = 1;
    }
    return acc;
  }, {});
}
