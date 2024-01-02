export class NestApiException extends Error {}

export class MissingEnvironmentException extends NestApiException {}
export class InvalidEnvironmentException extends NestApiException {}

export class UnknownResourceException extends NestApiException {}
export class UnknownRelationshipException extends NestApiException {}
export class MissingIdFieldException extends NestApiException {}

export class UnknownEntityDefinitionException extends NestApiException {}
export class UnknownRelationshipDefinitionException extends NestApiException {}

export class InvalidDecoratedPropertyException extends NestApiException {}

export class InvalidIdSetException extends NestApiException {}
