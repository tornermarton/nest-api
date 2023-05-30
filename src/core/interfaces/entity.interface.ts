import { Owned } from './owned.interface';
import { Timestamped } from './timestamped.interface';

export interface Entity extends Owned, Timestamped {
  id: string;
}
