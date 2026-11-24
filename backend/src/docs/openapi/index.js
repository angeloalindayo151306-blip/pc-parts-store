import { info, servers, tags, components } from './components.js';
import { catalogPaths } from './paths.catalog.js';
import { shopPaths } from './paths.shop.js';
import { extraPaths } from './paths.extra.js';

export const openapiSpec = {
  openapi: '3.0.3',
  info,
  servers,
  tags,
  security: [],
  components,
  paths: { ...catalogPaths, ...shopPaths, ...extraPaths },
};