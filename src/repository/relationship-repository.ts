import { Observable } from 'rxjs';

import { Entity, Relationship } from '../core';

export abstract class RelationshipRepository<TRelated extends Entity = Entity> {
  public abstract count(id1: string, id2set?: string[]): Observable<number>;

  public abstract find(
    id1: string,
    id2set?: string[],
  ): Observable<Relationship[]>;
  public abstract findRelated(
    id1: string,
    id2set?: string[],
  ): Observable<TRelated[]>;

  public abstract create(
    id1: string,
    id2set: string[],
    createdBy: string,
  ): Observable<Relationship[]>;

  public abstract update(
    id1: string,
    id2set: string[],
    createdBy: string,
  ): Observable<Relationship[]>;

  public abstract delete(id1: string, id2set?: string[]): Observable<void>;
}
