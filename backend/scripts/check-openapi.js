// Sanity check for the OpenAPI document: counts and broken $ref links.
import { openapiSpec } from '../src/docs/openapi/index.js';

const text = JSON.stringify(openapiSpec);
const missing = new Set();
for (const m of text.matchAll(/"\$ref":"#\/components\/(schemas|responses)\/([^"]+)"/g)) {
  if (!openapiSpec.components[m[1]][m[2]]) missing.add(`${m[1]}/${m[2]}`);
}

const methods = ['get', 'post', 'put', 'patch', 'delete'];
let operations = 0;
for (const item of Object.values(openapiSpec.paths)) {
  operations += methods.filter((m) => item[m]).length;
}

const refs = missing.size ? [...missing].join(',') : 'none';
console.log(
  `${Object.keys(openapiSpec.paths).length} paths, ${operations} operations, missing refs: ${refs}`
);