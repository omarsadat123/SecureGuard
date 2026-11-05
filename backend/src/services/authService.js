import bcrypt from 'bcrypt';
import { AppError } from '../lib/errors.js';

const HASH_ROUNDS = 12;
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.5Y6V9n2t6jRcYIs5Qz3MZJxJb3eRk6q';

export class AuthService {
  constructor(users) {
    this.users = users;
  }
  async register({ email, password }) {
    const normalizedEmail = email.trim().toLowerCase();
    if (await this.users.findByEmail(normalizedEmail))
      throw new AppError(409, 'ACCOUNT_EXISTS', 'Unable to create account');
    const passwordHash = await bcrypt.hash(password, HASH_ROUNDS);
    try {
      return await this.users.create({ email: normalizedEmail, passwordHash, role: 'USER' });
    } catch (error) {
      if (error.code === 'P2002')
        throw new AppError(409, 'ACCOUNT_EXISTS', 'Unable to create account');
      throw error;
    }
  }
  async authenticate({ email, password }) {
    const user = await this.users.findByEmail(email.trim().toLowerCase());
    const matches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !matches)
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    return user;
  }
}
