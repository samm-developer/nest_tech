import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ResponseTransformInterceptor } from '../common/interceptors/response-transform.interceptor.js';
import { AuthService } from './auth.service.js';
import { LoginDto, RegisterDto } from './auth.dto.js';
import type { PublicUser } from './auth.service.js';

@Controller('auth')
@UseInterceptors(ResponseTransformInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() input: RegisterDto): Promise<PublicUser> {
    return this.authService.register(input);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(
    @Body() input: LoginDto,
  ): Promise<{ accessToken: string; user: PublicUser }> {
    return this.authService.login(input);
  }
}
