import { Observable } from 'rxjs';

import { Entity, Timestamped } from '../core';
import { IEntitiesQueryDto } from '../dto';

export type EntityAutoGeneratedColumns = 'id' | keyof Timestamped;
export type EntityCreateDto<T extends Entity> = Omit<
  T,
  EntityAutoGeneratedColumns
>;
export type EntityUpdateDto<T extends Entity> = Partial<
  Omit<T, EntityAutoGeneratedColumns | 'createdBy'>
> &
  Pick<T, 'updatedBy'>;

export abstract class EntityRepository<TEntity extends Entity> {
  public abstract count<TFilter>(
    query: Omit<IEntitiesQueryDto<TEntity, TFilter, never>, 'include'>,
  ): Observable<number>;

  public abstract find<TFilter>(
    query: Omit<IEntitiesQueryDto<TEntity, TFilter, never>, 'include'>,
  ): Observable<TEntity[]>;

  public abstract create(dto: EntityCreateDto<TEntity>): Observable<TEntity>;

  public abstract read(id: string): Observable<TEntity | null>;

  public abstract update(
    id: string,
    dto: EntityUpdateDto<TEntity>,
  ): Observable<TEntity | null>;

  public abstract delete(id: string): Observable<void>;
}
