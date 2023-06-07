import { Inject } from '@nestjs/common';

export function getRepositoryToken(name: string): string {
  return `${name}Repository`;
}

export const InjectRepository = (name: string) =>
  Inject(getRepositoryToken(name));
