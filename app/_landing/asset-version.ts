/* Bump in the same pass as any artwork replaced under an existing filename:
   the path is the cache key in the browser, the CDN and Next's image
   optimizer, and all three keep serving the old bytes otherwise. */
export const ASSET_V = '1';

export const asset = (path: string) => `${path}?v=${ASSET_V}`;
