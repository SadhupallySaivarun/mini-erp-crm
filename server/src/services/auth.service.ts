import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { userRepository } from "../repositories/user.repository";
import { ApiError } from "../utils/ApiError";
import { env } from "../config/env";
import { LoginInput } from "../validators/auth.validator";

const SALT_ROUNDS = 10;

export const authService = {
  async login({ email, password }: LoginInput) {
    const user = await userRepository.findByEmail(email);

    if (!user || !user.isActive) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    } as jwt.SignOptions);

    return { token, user: payload };
  },

  async hashPassword(plain: string) {
    return bcrypt.hash(plain, SALT_ROUNDS);
  },

  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw ApiError.notFound("User not found");
    const { passwordHash, ...safe } = user;
    return safe;
  },
};
