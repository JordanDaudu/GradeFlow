import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { Role } from '../auth/dto';

const TEMP_PASSWORD_LENGTH = 12;

function generateTempPassword(): string {
  // URL-safe random string. base64url alphabet keeps things easy to share.
  return crypto.randomBytes(12).toString('base64url').slice(0, TEMP_PASSWORD_LENGTH);
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  async create(input: {
    email: string;
    name: string;
    role: Role;
    password?: string;
  }) {
    const email = input.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException({ error: 'משתמש עם אימייל זה כבר קיים' });
    }
    const generated = !input.password;
    const tempPassword = input.password ?? generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const user = await this.prisma.user.create({
      data: { email, name: input.name, role: input.role, passwordHash },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
    return { user, generatedPassword: generated ? tempPassword : null };
  }

  async update(id: number, patch: { name?: string; role?: Role }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException({ error: 'משתמש לא נמצא' });
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.role !== undefined ? { role: patch.role } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async remove(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException({ error: 'משתמש לא נמצא' });
    await this.prisma.user.delete({ where: { id } });
    return { ok: true };
  }

  async adminResetPassword(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException({ error: 'משתמש לא נמצא' });
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      }),
      this.prisma.passwordResetToken.updateMany({
        where: { userId: id, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);
    return { temporaryPassword: tempPassword };
  }
}
