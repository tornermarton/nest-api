import {
  InvalidEnvironmentException,
  MissingEnvironmentException,
} from './exceptions';
import { isUndefined } from './utils';

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
      throw new MissingEnvironmentException(
        `Environment variable [${key}] is required.`,
      );
    }

    return def;
  }

  if (type === 'integer') {
    const parsed: number = parseInt(value);

    if (isNaN(parsed)) {
      throw new InvalidEnvironmentException(
        `Environment variable [${key}] must be a valid integer.`,
      );
    }

    return parsed;
  }

  if (type === 'float') {
    const parsed: number = parseFloat(value);

    if (isNaN(parsed)) {
      throw new InvalidEnvironmentException(
        `Environment variable [${key}] must be a valid float.`,
      );
    }

    return parsed;
  }

  if (type === 'boolean') {
    if (!['true', '1', 'false', '0'].includes(value)) {
      throw new InvalidEnvironmentException(
        `Environment variable [${key}] must be a valid boolean.`,
      );
    }

    return ['true', '1'].includes(value);
  }

  return value;
}
