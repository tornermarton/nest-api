import { Observable } from 'rxjs';

import { IQueryDto } from '../query';
import { PagedResource } from '../response';

export abstract class Repository<TModel> {
  public abstract find<
    TFilter,
    TExpand extends Extract<keyof TModel, string>,
    TQueryDto extends IQueryDto<TModel, TFilter, TExpand>,
  >(query: TQueryDto): Observable<PagedResource<TModel>>;

  public abstract create<TCreateDto extends Partial<TModel>>(
    dto: TCreateDto,
  ): Observable<TModel>;
  public abstract read(id: string): Observable<TModel>;
  public abstract update<TUpdateDto extends Partial<TModel>>(
    id: string,
    dto: TUpdateDto,
  ): Observable<TModel>;
  public abstract delete(id: string): Observable<void>;
}
