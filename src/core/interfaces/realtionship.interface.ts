import { Owned } from './owned.interface';
import { Timestamped } from './timestamped.interface';

export interface Relationship extends Owned, Timestamped {
  readonly id1: string;

  readonly id2: string;
}
