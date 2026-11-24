import * as ai from '../services/ai.service.js';
import { ok } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const recommendBuild = asyncHandler(async (req, res) => {
  ok(res, await ai.recommendBuild(req.body));
});