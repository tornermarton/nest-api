import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PagedResource<T = any> {
  constructor(public readonly items: T[], public readonly total?: number) {}
}

export class ResponseErrorSource {
  @ApiPropertyOptional()
  public readonly pointer?: string;
  @ApiPropertyOptional()
  public readonly parameter?: string;
  @ApiPropertyOptional()
  public readonly header?: string;
}

export class ResponseError {
  @ApiProperty()
  public readonly status: number;
  @ApiProperty()
  public readonly title: string;
  @ApiPropertyOptional()
  public readonly detail?: string;
  @ApiPropertyOptional()
  public readonly source?: ResponseErrorSource;
}

export class ResponseMeta {
  @ApiProperty()
  public readonly status: number;
  @ApiPropertyOptional()
  public readonly reason?: string;
}

export class CommonResponseLinks {
  @ApiProperty()
  public readonly self: string;
}

export class PagedResponseLinks extends CommonResponseLinks {
  @ApiPropertyOptional()
  public readonly first?: string;
  @ApiPropertyOptional()
  public readonly next?: string;
  @ApiPropertyOptional()
  public readonly prev?: string;
  @ApiPropertyOptional()
  public readonly last?: string;
}

export class Paging {
  @ApiProperty()
  public readonly limit: number;
  @ApiProperty()
  public readonly offset: number;
  @ApiPropertyOptional()
  public readonly total?: number;
}

export class CommonApiResponse {
  @ApiProperty()
  public readonly meta: ResponseMeta;
}

export class ErrorApiResponse extends CommonApiResponse {
  @ApiProperty({ type: ResponseError, isArray: true })
  public readonly errors: ResponseError[];
  @ApiProperty()
  public readonly links: CommonResponseLinks;
}

export class EntityApiResponse<T> extends CommonApiResponse {
  public readonly data: T;
  @ApiProperty()
  public readonly links: CommonResponseLinks;
}

export class PagedApiResponse<T> extends CommonApiResponse {
  public readonly data: T[];
  @ApiProperty()
  public readonly links: PagedResponseLinks;
  @ApiProperty()
  public readonly paging: Paging;
}

export type ApiResponse<T> =
  | ErrorApiResponse
  | EntityApiResponse<T>
  | PagedApiResponse<T>;
