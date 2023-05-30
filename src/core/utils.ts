import { v4 as uuidv4 } from 'uuid';

export function createGlobalApiPrefix(name: string, version: string): string {
  return `/api/rest/${name}/v${version}`;
}

export function uuid(): string {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  return uuidv4() as string;
}
