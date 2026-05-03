import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { AUTH_COOKIE_NAME } from './auth.types';
import { Public } from './public.decorator';
import { CurrentUser } from './current-user.decorator';
import type { AuthUser } from './auth.types';
import {
  ChangePasswordDto,
  LoginDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
} from './dto';

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: '/',
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @HttpCode(200)
  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, user } = await this.auth.login(body.email, body.password);
    res.cookie(AUTH_COOKIE_NAME, token, COOKIE_OPTS);
    return user;
  }

  @Public()
  @HttpCode(200)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  @HttpCode(200)
  @Post('change-password')
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() body: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token } = await this.auth.changePassword(
      user.id,
      body.currentPassword,
      body.newPassword,
    );
    res.cookie(AUTH_COOKIE_NAME, token, COOKIE_OPTS);
    return { ok: true };
  }

  @HttpCode(200)
  @Post('revoke-sessions')
  async revokeSessions(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.revokeSessions(user.id);
    res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
    return { ok: true };
  }

  @Public()
  @HttpCode(200)
  @Post('request-password-reset')
  async requestPasswordReset(@Body() body: RequestPasswordResetDto) {
    await this.auth.requestPasswordReset(body.email);
    return { ok: true };
  }

  @Public()
  @HttpCode(200)
  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    await this.auth.resetPassword(body.token, body.newPassword);
    return { ok: true };
  }
}
