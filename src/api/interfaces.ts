export type NestApiResourceIdentifierInterface = {
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
  readonly data: NestApiResourceIdentifierInterface | null;
  readonly links: NestApiResourceRelationshipToOneLinksInterface;
};

export type NestApiResourceRelationshipToManyLinksInterface =
  NestApiCommonResourceRelationshipLinksInterface &
    NestApiPaginationLinksInterface;

export type NestApiResourceRelationshipToManyInterface = {
  readonly data: NestApiResourceIdentifierInterface[];
  readonly links: NestApiResourceRelationshipToManyLinksInterface;
};

export type NestApiResourceRelationshipInterface =
  | NestApiResourceRelationshipToOneInterface
  | NestApiResourceRelationshipToManyInterface;

export type NestApiResourceLinksInterface = {
  readonly self: string;
};

export type NestApiResourceInterface = NestApiResourceIdentifierInterface & {
  readonly attributes?: Record<string, unknown>;
  readonly relationships?: Record<string, NestApiResourceRelationshipInterface>;
  readonly meta?: Record<string, unknown>;
  readonly links: NestApiResourceLinksInterface;
};

export type NestApiDocumentMetaInterface = {
  readonly status: number;
  readonly reason?: string;
};

type NestApiCommonDocumentInterface = {
  readonly meta: NestApiDocumentMetaInterface;
};

export type NestApiEmptyDocumentInterface = NestApiCommonDocumentInterface;

export type NestApiCommonDocumentLinksInterface = {
  readonly self: string;
};

export type NestApiEntityDocumentLinksInterface =
  NestApiCommonDocumentLinksInterface;

export type NestApiEntityDocumentInterface = NestApiCommonDocumentInterface & {
  readonly data: NestApiResourceInterface;
  readonly links: NestApiEntityDocumentLinksInterface;
};

export type NestApiEntitiesDocumentLinksInterface =
  NestApiCommonDocumentLinksInterface & NestApiPaginationLinksInterface;

export type NestApiEntitiesDocumentInterface =
  NestApiCommonDocumentInterface & {
    readonly data: NestApiResourceInterface[];
    readonly links: NestApiEntitiesDocumentLinksInterface;
  };

export type NestApiRelationshipRequestDocumentInterface = {
  readonly data: NestApiResourceIdentifierInterface | null;
};

export type NestApiRelationshipResponseDocumentLinksInterface =
  NestApiCommonDocumentLinksInterface & {
    readonly related: string;
  };

export type NestApiRelationshipResponseDocumentInterface =
  NestApiCommonDocumentInterface & {
    readonly data: NestApiResourceIdentifierInterface | null;
    readonly links: NestApiRelationshipResponseDocumentLinksInterface;
  };

export type NestApiRelationshipsRequestDocumentInterface = {
  readonly data: NestApiResourceIdentifierInterface[];
};

export type NestApiRelationshipsResponseDocumentLinksInterface =
  NestApiCommonDocumentLinksInterface &
    NestApiPaginationLinksInterface & {
      readonly related: string;
    };

export type NestApiRelationshipsResponseDocumentInterface =
  NestApiCommonDocumentInterface & {
    readonly data: NestApiResourceIdentifierInterface[];
    readonly links: NestApiRelationshipsResponseDocumentLinksInterface;
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
  | NestApiRelationshipRequestDocumentInterface
  | NestApiRelationshipsRequestDocumentInterface;

export type NestApiResponseDocumentInterface =
  | NestApiEmptyDocumentInterface
  | NestApiEntityDocumentInterface
  | NestApiEntitiesDocumentInterface
  | NestApiErrorDocumentInterface;
