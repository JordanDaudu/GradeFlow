import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import type { AuthUser } from '../auth/auth.types';
import { CreateUserDto, UpdateUserDto } from './dto';

@ApiTags('Users')
@ApiCookieAuth('gradeflow_token')
@Roles('admin')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list() {
    return this.users.list();
  }

  @Post()
  create(@Body() body: CreateUserDto) {
    return this.users.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateUserDto,
    @CurrentUser() current: AuthUser,
  ) {
    if (id === current.id && body.role && body.role !== current.role) {
      throw new BadRequestException({
        error: 'לא ניתן לשנות את התפקיד של החשבון שלך',
      });
    }
    return this.users.update(id, body);
  }

  @Post(':id/reset-password')
  @HttpCode(200)
  reset(@Param('id', ParseIntPipe) id: number) {
    return this.users.adminResetPassword(id);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() current: AuthUser,
  ) {
    if (id === current.id) {
      throw new BadRequestException({
        error: 'לא ניתן למחוק את החשבון של עצמך',
      });
    }
    return this.users.remove(id);
  }
}
