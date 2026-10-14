import {
  Controller,
  Get,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ResponseTransformInterceptor } from '../common/interceptors/response-transform.interceptor.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard, type AuthenticatedRequest } from './jwt-auth.guard.js';
import type { PublicUser } from './auth.service.js';

@Controller()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ResponseTransformInterceptor)
export class MeController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  getMe(@Req() request: AuthenticatedRequest): Promise<PublicUser> {
    return this.authService.findById(request.authUser.sub);
  }
}
