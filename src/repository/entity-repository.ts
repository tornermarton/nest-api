import { Observable } from 'rxjs';

import { Entity, Timestamped } from '../core';
import { IQueryDto } from '../query';

export type EntityAutoGeneratedColumns = 'id' | keyof Timestamped;
export type EntityCreateDto<T extends Entity> = Omit<
  T,
  EntityAutoGeneratedColumns
>;
export type EntityUpdateDto<T extends Entity> = Partial<
  Omit<T, EntityAutoGeneratedColumns | 'createdBy'>
> &
  Pick<T, 'updatedBy'>;

export abstract class EntityRepository<TModel extends Entity> {
  public abstract count<TFilter, TExpand extends Extract<keyof TModel, string>>(
    query: IQueryDto<TModel, TFilter, TExpand>,
  ): Observable<number>;

  public abstract find<TFilter, TExpand extends Extract<keyof TModel, string>>(
    query: IQueryDto<TModel, TFilter, TExpand>,
  ): Observable<TModel[]>;

  public abstract create(dto: EntityCreateDto<TModel>): Observable<TModel>;

  public abstract read(id: string): Observable<TModel | null>;

  public abstract update(
    id: string,
    dto: EntityUpdateDto<TModel>,
  ): Observable<TModel | null>;

  public abstract delete(id: string): Observable<void>;
}
