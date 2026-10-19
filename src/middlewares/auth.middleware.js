import { createHash } from "node:crypto";
import userModel from "../models/user.model.js";
import ApiError from "../utils/api-error.js";
import asyncHandler from "../utils/async-handler.js";

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.session;
  if (!token) throw new ApiError(401, "Authentication required");

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const session = await userModel.findSession(tokenHash);
  if (!session) throw new ApiError(401, "Authentication required");

  req.user = session.user;
  next();
});
