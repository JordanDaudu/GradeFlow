import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AuthUser } from './auth.types';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly email: EmailService,
  ) {}

  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 10);
  }

  async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  async signTokenFor(user: { id: number; tokenVersion: number }): Promise<string> {
    return this.jwt.signAsync({ sub: user.id, v: user.tokenVersion });
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ token: string; user: AuthUser }> {
    const u = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!u) throw new UnauthorizedException({ error: 'שם משתמש או סיסמה שגויים' });
    const ok = await this.verifyPassword(password, u.passwordHash);
    if (!ok) throw new UnauthorizedException({ error: 'שם משתמש או סיסמה שגויים' });
    const token = await this.signTokenFor(u);
    return {
      token,
      user: { id: u.id, email: u.email, name: u.name, role: u.role },
    };
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ token: string }> {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new UnauthorizedException({ error: 'Unauthorized' });
    const ok = await this.verifyPassword(currentPassword, u.passwordHash);
    if (!ok) throw new BadRequestException({ error: 'הסיסמה הנוכחית שגויה' });
    if (await this.verifyPassword(newPassword, u.passwordHash)) {
      throw new BadRequestException({
        error: 'הסיסמה החדשה זהה לסיסמה הנוכחית',
      });
    }
    const passwordHash = await this.hashPassword(newPassword);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });
    await this.prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
    const token = await this.signTokenFor(updated);
    return { token };
  }

  async revokeSessions(userId: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
  }

  async requestPasswordReset(email: string): Promise<void> {
    // Always do roughly the same amount of work regardless of whether the
    // email matches a registered user — this makes the response shape AND
    // the response timing identical, defeating both account enumeration
    // and unauthenticated account takeover. The reset link is NEVER
    // returned in the HTTP response: it can only be delivered through a
    // trusted side channel (email integration once wired up). When no
    // email integration is configured, admins should use the admin-issued
    // temporary password flow at POST /users/:id/reset-password instead.
    const raw = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    const u = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (u) {
      await this.prisma.passwordResetToken.create({
        data: { userId: u.id, tokenHash, expiresAt },
      });
      await this.email.sendPasswordReset(u.email, raw);
    } else {
      // Equalize the cost of the missing-user branch with one bcrypt round
      // (DB write above costs ~similar) so that response time alone cannot
      // be used to enumerate registered emails.
      await bcrypt.hash(raw, 10);
    }
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException({
        error: 'הקישור לאיפוס הסיסמה אינו תקף או שפג תוקפו',
      });
    }
    const passwordHash = await this.hashPassword(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null, id: { not: record.id } },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  async getUserById(id: number): Promise<AuthUser | null> {
    const u = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true },
    });
    return u ?? null;
  }
}
