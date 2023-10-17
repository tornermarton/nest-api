import { Observable } from 'rxjs';

import { Entity, Relationship } from '../core';
import { IQueryRelationshipsDto } from '../dto';

export abstract class RelationshipRepository<TRelated extends Entity = Entity> {
  public abstract count<TFilter>(
    id1: string,
    query: IQueryRelationshipsDto<TFilter>,
  ): Observable<number>;
  public abstract find<TFilter>(
    id1: string,
    query: IQueryRelationshipsDto<TFilter>,
  ): Observable<Relationship[]>;

  public abstract countRelated<TFilter>(
    id1: string,
    query: IQueryRelationshipsDto<TFilter>,
  ): Observable<number>;
  public abstract findRelated<TFilter>(
    id1: string,
    query: IQueryRelationshipsDto<TFilter>,
  ): Observable<TRelated[]>;

  public abstract create(
    id1: string,
    id2set: string[],
    createdBy: string,
  ): Observable<Relationship[]>;

  public abstract read(
    id1: string,
    id2set?: string[],
  ): Observable<Relationship[]>;
  public abstract readRelated(
    id1: string,
    id2set?: string[],
  ): Observable<TRelated[]>;

  public abstract update(
    id1: string,
    id2set: string[],
    createdBy: string,
  ): Observable<Relationship[]>;

  public abstract delete(id1: string, id2set?: string[]): Observable<void>;
}
