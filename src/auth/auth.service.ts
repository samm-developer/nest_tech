import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, compare } from 'bcryptjs';
import { DatabaseService } from '../database/database.service.js';
import type { LoginDto, RegisterDto } from './auth.dto.js';

interface AuthUser {
  id: number;
  name: string;
  username: string;
  password_hash: string | null;
}

export interface PublicUser {
  id: number;
  name: string;
  username: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: RegisterDto): Promise<PublicUser> {
    if (Buffer.byteLength(input.password, 'utf8') > 72) {
      throw new BadRequestException('Password exceeds the supported length');
    }

    const passwordHash = await hash(input.password, 12);
    try {
      const result = await this.databaseService.query<PublicUser>(
        `INSERT INTO users (name, username, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, name, username`,
        [input.name, input.username, passwordHash],
      );
      const user = result.rows[0];
      if (!user) {
        throw new InternalServerErrorException(
          'Database did not return the created user',
        );
      }
      return user;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Username is already registered');
      }
      throw error;
    }
  }

  async login(
    input: LoginDto,
  ): Promise<{ accessToken: string; user: PublicUser }> {
    const result = await this.databaseService.query<AuthUser>(
      `SELECT id, name, username, password_hash
       FROM users
       WHERE LOWER(username) = $1
       LIMIT 1`,
      [input.username],
    );
    const user = result.rows[0];

    if (
      !user?.password_hash ||
      !(await compare(input.password, user.password_hash))
    ) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const publicUser = {
      id: user.id,
      name: user.name,
      username: user.username,
    };
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      username: user.username,
    });

    return { accessToken, user: publicUser };
  }
}

function isUniqueViolation(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  );
}
