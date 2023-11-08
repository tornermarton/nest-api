import { parse } from 'qs';

export const queryParser = (q: string): object =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-return
  parse(q, {
    ignoreQueryPrefix: true,
    comma: true,
  });
