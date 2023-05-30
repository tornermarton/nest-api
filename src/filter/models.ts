export type RegexFilter = {
  $regex: string;
  $options: string;
};

export type GteFilter<T> = {
  $gte: T;
};

export type LteFilter<T> = {
  $lte: T;
};

export type BetweenFilter<T> = {
  $gte: T;
  $lte: T;
};

export type IntervalFilter<T> = {
  $gte?: T;
  $lte?: T;
};
