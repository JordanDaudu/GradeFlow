import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { AUTH_COOKIE_NAME, AuthUser, getJwtSecret } from './auth.types';
import { PrismaService } from '../prisma/prisma.service';

function cookieExtractor(req: Request): string | null {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  return cookies?.[AUTH_COOKIE_NAME] ?? null;
}

interface JwtPayload {
  sub: number;
  v: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (!payload?.sub || typeof payload.v !== 'number') {
      throw new UnauthorizedException({ error: 'Unauthorized' });
    }
    const u = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true, tokenVersion: true },
    });
    if (!u || u.tokenVersion !== payload.v) {
      throw new UnauthorizedException({ error: 'Unauthorized' });
    }
    return { id: u.id, email: u.email, name: u.name, role: u.role };
  }
}
