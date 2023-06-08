import { parse } from 'qs';
import { v4 as uuidv4 } from 'uuid';

export function isNull<T>(value: T | null): value is null {
  return value === null;
}

export function isNotNull<T>(value: T | null): value is T {
  return !isNull(value);
}

export function isUndefined<T>(value: T | undefined): value is undefined {
  return value === undefined;
}

export function isNotUndefined<T>(value: T | undefined): value is T {
  return !isUndefined(value);
}

export function isNullOrUndefined<T>(
  value: T | null | undefined,
): value is null | undefined {
  return isNull(value) || isUndefined(value);
}

export function isNotNullOrUndefined<T>(
  value: T | null | undefined,
): value is T {
  return !isNullOrUndefined(value);
}

export function createGlobalApiPrefix(name: string, version: string): string {
  return `/api/rest/${name}/v${version}`;
}

export function uuid(): string {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  return uuidv4() as string;
}

export const queryParser = (q): object =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-return
  parse(q, {
    ignoreQueryPrefix: true,
    comma: true,
  });
