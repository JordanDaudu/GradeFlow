import { Prisma } from '@prisma/client';

export function toNum(d: Prisma.Decimal | number | null | undefined): number | null {
  if (d === null || d === undefined) return null;
  return typeof d === 'number' ? d : Number(d.toString());
}
