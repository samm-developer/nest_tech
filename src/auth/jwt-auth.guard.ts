import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export interface AccessTokenPayload {
  sub: number;
  username: string;
}

export interface AuthenticatedRequest extends Request {
  authUser: AccessTokenPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const match = authorization?.match(/^Bearer\s+(\S+)$/i);
    if (!match) {
      throw new UnauthorizedException('Bearer token is required');
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(match[1]);
    } catch (error) {
      if (isJwtVerificationError(error)) {
        throw new UnauthorizedException('Invalid or expired token');
      }
      throw error;
    }

    if (
      !Number.isSafeInteger(payload.sub) ||
      payload.sub <= 0 ||
      typeof payload.username !== 'string'
    ) {
      throw new UnauthorizedException('Invalid token payload');
    }

    request.authUser = payload;
    return true;
  }
}

function isJwtVerificationError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('name' in error)) {
    return false;
  }
  return (
    error.name === 'JsonWebTokenError' ||
    error.name === 'TokenExpiredError' ||
    error.name === 'NotBeforeError'
  );
}
