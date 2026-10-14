import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ResponseTransformInterceptor } from '../common/interceptors/response-transform.interceptor.js';
import { UsersService } from './users.service.js';

@Controller('users')
@UseInterceptors(ResponseTransformInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }
}
