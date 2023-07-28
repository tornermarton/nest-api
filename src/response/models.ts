import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PagedResource<T = unknown> {
  constructor(public readonly items: T[], public readonly total?: number) {}
}

export class Paging {
  @ApiProperty()
  public readonly limit: number;

  @ApiProperty()
  public readonly offset: number;

  @ApiPropertyOptional()
  public readonly total?: number;
}
