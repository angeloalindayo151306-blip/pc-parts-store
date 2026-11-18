import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import * as users from '../repositories/user.repository.js';

// Compared against when the email doesn't exist, so response time doesn't reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: env.jwtExpiresIn,
  });
}

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

export async function register({ name, email, password }) {
  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const user = await users.create({ name, email, passwordHash });
    return { user: publicUser(user), token: signToken(user) };
  } catch (err) {
    if (err.code === '23505') {
      throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
    }
    throw err;
  }
}

export async function login({ email, password }) {
  const user = await users.findByEmail(email);
  const match = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !match) {
    // Same message for wrong email and wrong password.
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }
  return { user: publicUser(user), token: signToken(user) };
}