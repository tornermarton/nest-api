import { NestApiDocumentPaging } from './models';

export type NestApiResourceIdentifierDataInterface = {
  readonly id: string;
  readonly type: string;
};

export type NestApiPaginationLinksInterface = {
  readonly first?: string;
  readonly prev?: string;
  readonly next?: string;
  readonly last?: string;
};

type NestApiCommonResourceRelationshipLinksInterface = {
  readonly self: string;
  readonly related: string;
};

export type NestApiResourceRelationshipToOneLinksInterface =
  NestApiCommonResourceRelationshipLinksInterface;

export type NestApiResourceRelationshipToOneInterface = {
  readonly data: NestApiResourceIdentifierDataInterface | null;
  readonly links: NestApiResourceRelationshipToOneLinksInterface;
};

export type NestApiResourceRelationshipToManyLinksInterface =
  NestApiCommonResourceRelationshipLinksInterface &
    NestApiPaginationLinksInterface;

export type NestApiResourceRelationshipToManyInterface = {
  readonly data: NestApiResourceIdentifierDataInterface[];
  readonly links: NestApiResourceRelationshipToManyLinksInterface;
};

export type NestApiResourceRelationshipInterface =
  | NestApiResourceRelationshipToOneInterface
  | NestApiResourceRelationshipToManyInterface;

export type NestApiResourceLinksInterface = {
  readonly self: string;
};

export type NestApiResourceDataInterface =
  NestApiResourceIdentifierDataInterface & {
    readonly attributes?: Record<string, unknown>;
    readonly relationships?: Record<
      string,
      NestApiResourceRelationshipInterface
    >;
    readonly meta?: Record<string, unknown>;
    readonly links: NestApiResourceLinksInterface;
  };

export type NestApiDocumentMetaInterface = {
  readonly status: number;
  readonly timestamp: Date;
  readonly reason?: string;
};

type NestApiCommonDocumentInterface = {
  readonly meta: NestApiDocumentMetaInterface;
};

export type NestApiEmptyDocumentInterface = NestApiCommonDocumentInterface;

export type NestApiCommonDocumentLinksInterface = {
  readonly self: string;
};

export type NestApiEntityRequestDocumentInterface = {
  readonly data: NestApiResourceDataInterface;
};

export type NestApiEntityResponseDocumentLinksInterface =
  NestApiCommonDocumentLinksInterface;

export type NestApiEntityResponseDocumentInterface =
  NestApiCommonDocumentInterface & {
    readonly data: NestApiResourceDataInterface | null;
    readonly links: NestApiEntityResponseDocumentLinksInterface;
    readonly included?: unknown[];
  };

export type NestApiEntitiesResponseDocumentLinksInterface =
  NestApiCommonDocumentLinksInterface & NestApiPaginationLinksInterface;

export type NestApiEntitiesResponseDocumentInterface =
  NestApiCommonDocumentInterface & {
    readonly data: NestApiResourceDataInterface[];
    readonly links: NestApiEntitiesResponseDocumentLinksInterface;
    readonly paging: NestApiDocumentPaging;
    readonly included?: unknown[];
  };

export type NestApiRelationshipRequestDocumentInterface = {
  readonly data: NestApiResourceIdentifierDataInterface | null;
};

export type NestApiRelationshipResponseDocumentLinksInterface =
  NestApiCommonDocumentLinksInterface & {
    readonly related: string;
  };

export type NestApiRelationshipResponseDocumentInterface =
  NestApiCommonDocumentInterface & {
    readonly data: NestApiResourceIdentifierDataInterface | null;
    readonly links: NestApiRelationshipResponseDocumentLinksInterface;
  };

export type NestApiRelationshipsRequestDocumentInterface = {
  readonly data: NestApiResourceIdentifierDataInterface[];
};

export type NestApiRelationshipsResponseDocumentLinksInterface =
  NestApiCommonDocumentLinksInterface &
    NestApiPaginationLinksInterface & {
      readonly related: string;
    };

export type NestApiRelationshipsResponseDocumentInterface =
  NestApiCommonDocumentInterface & {
    readonly data: NestApiResourceIdentifierDataInterface[];
    readonly links: NestApiRelationshipsResponseDocumentLinksInterface;
    readonly paging: NestApiDocumentPaging;
  };

type NestApiCommonErrorInterface = {
  readonly status: number;
  readonly title: string;
  readonly detail?: string;
};

export type NestApiGenericErrorInterface = NestApiCommonErrorInterface;

export type NestApiHeaderErrorSourceInterface = {
  readonly header: string;
};
export type NestApiHeaderErrorInterface = NestApiCommonErrorInterface & {
  readonly source: NestApiHeaderErrorSourceInterface;
};

export type NestApiQueryErrorSourceInterface = {
  readonly parameter: string;
};
export type NestApiQueryErrorInterface = NestApiCommonErrorInterface & {
  readonly source: NestApiQueryErrorSourceInterface;
};

export type NestApiBodyErrorSourceInterface = {
  readonly pointer: string;
};
export type NestApiBodyErrorInterface = NestApiCommonErrorInterface & {
  readonly source: NestApiBodyErrorSourceInterface;
};

export type NestApiErrorInterface =
  | NestApiGenericErrorInterface
  | NestApiHeaderErrorInterface
  | NestApiQueryErrorInterface
  | NestApiBodyErrorInterface;

export type NestApiErrorDocumentLinksInterface =
  NestApiCommonDocumentLinksInterface;

export type NestApiErrorDocumentInterface = NestApiCommonDocumentInterface & {
  readonly errors: NestApiErrorInterface[];
  readonly links: NestApiErrorDocumentLinksInterface;
};

export type NestApiRequestDocumentInterface =
  | NestApiEntityRequestDocumentInterface
  | NestApiRelationshipRequestDocumentInterface
  | NestApiRelationshipsRequestDocumentInterface;

export type NestApiResponseDocumentInterface =
  | NestApiEmptyDocumentInterface
  | NestApiEntityResponseDocumentInterface
  | NestApiEntitiesResponseDocumentInterface
  | NestApiRelationshipResponseDocumentInterface
  | NestApiRelationshipsResponseDocumentInterface
  | NestApiErrorDocumentInterface;
