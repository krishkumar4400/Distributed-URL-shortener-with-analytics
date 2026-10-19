import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "node:crypto";
import userModel from "../models/user.model.js";
import ApiError from "../utils/api-error.js";
import ApiResponse from "../utils/api-response.js";
import asyncHandler from "../utils/async-handler.js";

const SESSION_COOKIE = "session";
const SESSION_TTL_DAYS = 7;
const BCRYPT_ROUNDS = 12;

const hashToken = (token) => createHash("sha256").update(token).digest("hex");

const setSessionCookie = (res, token) => {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
};

const clearSessionCookie = (res) => {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
};

const readRegistration = (body) => {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const errors = [];

  if (name.length < 1 || name.length > 100)
    errors.push("Name must be 1 to 100 characters");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("A valid email address is required");
  }
  if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    errors.push(
      "Password must be at least 12 characters and no more than 72 bytes",
    );
  }

  if (errors.length)
    throw new ApiError(400, "Invalid registration details", errors);
  return { name, email, password };
};

const readCredentials = (body) => {
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (
    !email ||
    !password ||
    email.length > 254 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    throw new ApiError(400, "Email and password are required");
  }
  return { email, password };
};

const createSession = async (res, userId) => {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  );
  await userModel.createSession({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  });
  setSessionCookie(res, token);
};

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = readRegistration(req.body);
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  let user;
  try {
    user = await userModel.create({ name, email, passwordHash });
  } catch (error) {
    if (error.code === "23505")
      throw new ApiError(409, "An account with this email already exists");
    throw error;
  }

  await createSession(res, user.id);
  res.status(201).json(new ApiResponse(201, "Account created", { user }));
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = readCredentials(req.body);
  const userWithPassword = await userModel.findByEmail(email);

  if (
    !userWithPassword ||
    !(await bcrypt.compare(password, userWithPassword.passwordHash))
  ) {
    throw new ApiError(401, "Invalid email or password");
  }

  await createSession(res, userWithPassword.id);
  res
    .status(200)
    .json(new ApiResponse(200, "Logged in", { user: userWithPassword.user }));
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) await userModel.deleteSession(hashToken(token));
  clearSessionCookie(res);
  res.status(200).json(new ApiResponse(200, "Logged out", {}));
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  res
    .status(200)
    .json(new ApiResponse(200, "Current user", { user: req.user }));
});
