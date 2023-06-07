import { instanceToPlain } from 'class-transformer';
import { Model } from 'mongoose';
import { combineLatest, from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { IQueryDto } from '../core';
import { sortDtoToQuery } from '../mongoose';
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

export class MongooseRepository<TModel> extends Repository<TModel> {
  constructor(private readonly _model: Model<TModel>) {
    super();
  }

  public find<
    TFilter,
    TExpand extends Extract<keyof TModel, string>,
    TQueryDto extends IQueryDto<TModel, TFilter, TExpand>,
  >(query: TQueryDto): Observable<PagedResource<TModel>> {
    const filter = instanceToPlain(query.filter ?? {});
    const sort = sortDtoToQuery(query.sort ?? []);
    const expand = query.expand ?? [];

    let req = this._model.find<TModel>(filter);
    const cnt = this._model.find<TModel>(filter);

    req = req.skip(query.page.offset * query.page.limit);
    req = req.limit(query.page.limit);

    req = req.sort(sort);

    req = req.populate(expand.map((e) => ({ path: e })));

    const items$ = from(req.exec());
    const total$ = from(cnt.count().exec());

    return combineLatest([items$, total$]).pipe(
      map(([items, total]) => new PagedResource<TModel>(items, total)),
    );
  }

  // TODO: typing
  public create<TCreateDto extends Partial<TModel>>(
    dto: TCreateDto,
  ): Observable<TModel> {
    return from(new this._model<TModel>(dto as unknown as TModel).save());
  }

  public read(id: string): Observable<TModel> {
    return from(this._model.findById<TModel>(id).exec());
  }

  // TODO: typing
  public update<TUpdateDto extends Partial<TModel>>(
    id: string,
    dto: TUpdateDto,
  ): Observable<TModel> {
    return from(
      this._model
        .findByIdAndUpdate<TModel>(id, dto, {
          new: true,
        })
        .exec(),
    );
  }

  public delete(id: string): Observable<void> {
    return from(this._model.findByIdAndDelete<TModel>(id).exec()).pipe(
      map((): void => void 0),
    );
  }
}
