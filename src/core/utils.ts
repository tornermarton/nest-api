import * as process from 'process';

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

export function getEnvironment(
  key: string,
  type: 'string',
  def?: string,
): string;
export function getEnvironment(
  key: string,
  type: 'string',
  def: null,
): string | null;
export function getEnvironment(
  key: string,
  type: 'integer' | 'float',
  def?: number,
): number;
export function getEnvironment(
  key: string,
  type: 'integer' | 'float',
  def: null,
): number | null;
export function getEnvironment(
  key: string,
  type: 'boolean',
  def?: boolean,
): boolean;
export function getEnvironment(
  key: string,
  type: 'boolean',
  def: null,
): boolean | null;
export function getEnvironment(
  key: string,
  type: 'string' | 'integer' | 'float' | 'boolean',
  def: string | number | boolean | null | undefined,
): string | number | boolean | null {
  const value: string | undefined = process.env[key];

  if (isUndefined(value)) {
    if (isUndefined(def)) {
      throw new Error(`Environment variable [${key}] is required.`);
    }

    return def;
  }

  if (type === 'integer') {
    const parsed: number = parseInt(value);

    if (isNaN(parsed)) {
      throw new Error(`Environment variable [${key}] must be a valid integer.`);
    }

    return parsed;
  }

  if (type === 'float') {
    const parsed: number = parseFloat(value);

    if (isNaN(parsed)) {
      throw new Error(`Environment variable [${key}] must be a valid float.`);
    }

    return parsed;
  }

  if (type === 'boolean') {
    if (!['true', '1', 'false', '0'].includes(value)) {
      throw new Error(`Environment variable [${key}] must be a valid boolean.`);
    }

    return ['true', '1'].includes(value);
  }

  return value;
}
