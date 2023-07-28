import { Type } from '@nestjs/common';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { Model } from 'mongoose';
import { combineLatest, concatAll, from, Observable, toArray } from 'rxjs';
import { map } from 'rxjs/operators';

import { IQueryDto } from '../../query';
import { Repository } from '../../repository';
import { PagedResource } from '../../response';

function sortDtoToQuery(sort: string[]): Record<string, 1 | -1> {
  return sort.reduce((acc, curr) => {
    if (curr.startsWith('-')) {
      acc[curr.substring(1)] = -1;
    } else {
      acc[curr] = 1;
    }
    return acc;
  }, {});
}

function expandDtoToQuery(expand: string[]): { path: string }[] {
  return expand.map((e) => ({ path: e }));
}

export class MongooseRepository<TModel> extends Repository<TModel> {
  constructor(
    private readonly _type: Type<TModel>,
    private readonly _model: Model<TModel>,
  ) {
    super();
  }

  public find<
    TFilter,
    TExpand extends Extract<keyof TModel, string>,
    TQueryDto extends IQueryDto<TModel, TFilter, TExpand>,
  >(query: TQueryDto): Observable<PagedResource<TModel>> {
    const filter = instanceToPlain(query.filter);
    const sort = sortDtoToQuery(query.sort);
    const expand = expandDtoToQuery(query.expand);

    const req = this._model
      .find(filter)
      .skip(query.page.offset * query.page.limit)
      .limit(query.page.limit)
      .sort(sort)
      .populate(expand);

    const cnt = this._model.find(filter);

    const items$ = from(req.exec()).pipe(
      concatAll(),
      map((model) => plainToInstance(this._type, model['_doc'])),
      toArray(),
    );
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
    return from(this._model.findById(id).exec()).pipe(
      map((model) => plainToInstance(this._type, model['_doc'])),
    );
  }

  public update<TUpdateDto extends Partial<TModel>>(
    id: string,
    dto: TUpdateDto,
  ): Observable<TModel> {
    return from(
      this._model
        .findByIdAndUpdate(id, dto, {
          new: true,
        })
        .exec(),
    ).pipe(map((model) => plainToInstance(this._type, model['_doc'])));
  }

  public delete(id: string): Observable<void> {
    return from(this._model.findByIdAndDelete(id).exec()).pipe(
      map((): void => void 0),
    );
  }
}
