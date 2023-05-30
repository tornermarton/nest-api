import { PagedResource } from './models';

export const EMPTY_PAGED_RESOURCE: PagedResource<never> =
  new PagedResource<never>([], 0);
