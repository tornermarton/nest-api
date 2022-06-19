import { Owned } from './owned.interface';
import { Timestamped } from './timestamped.interface';

export interface BaseEntity extends Owned, Timestamped {
  id: string;
}
