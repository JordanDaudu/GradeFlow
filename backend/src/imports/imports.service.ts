import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EnrollmentsService } from '../courses/enrollments.service';
import { parseCsv } from '../common/csv.util';

const HEADER_MAP: Record<string, string> = {
  'תעודת זהות': 'externalId',
  'ת.ז': 'externalId',
  'ת.ז.': 'externalId',
  'מספר זיהוי': 'externalId',
  'מספר מזהה': 'externalId',
  'מזהה': 'externalId',
  id: 'externalId',
  external_id: 'externalId',
  'שם הסטודנט': 'fullName',
  'שם סטודנט': 'fullName',
  'שם מלא': 'fullName',
  full_name: 'fullName',
  fullname: 'fullName',
  name: 'fullName',
  'שם פרטי': 'firstName',
  first_name: 'firstName',
  firstname: 'firstName',
  'שם משפחה': 'lastName',
  last_name: 'lastName',
  lastname: 'lastName',
  'דוא\"ל': 'email',
  'דוא״ל': 'email',
  'דואל': 'email',
  'כתובת דוא\"ל': 'email',
  'כתובת דוא״ל': 'email',
  'אימייל': 'email',
  'מייל': 'email',
  email: 'email',
  'טלפון': 'phone',
  phone: 'phone',
  'הערות': 'notes',
  notes: 'notes',
};

function splitFullName(full: string): { firstName: string; lastName: string } {
  const trimmed = full.trim().replace(/\s+/g, ' ');
  if (!trimmed) return { firstName: '', lastName: '' };
  const parts = trimmed.split(' ');
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

@Injectable()
export class ImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollments: EnrollmentsService,
  ) {}

  async importStudents(body: { csv?: unknown; courseId?: unknown }) {
    const csv = body?.csv;
    const courseIdRaw = body?.courseId;
    if (typeof csv !== 'string' || !csv.trim()) {
      throw new BadRequestException({ error: 'CSV ריק' });
    }
    const rows = parseCsv(csv);
    if (rows.length < 2) {
      throw new BadRequestException({ error: 'CSV ללא שורות' });
    }
    const headers = rows[0].map(
      (h) => HEADER_MAP[h.trim().toLowerCase()] ?? HEADER_MAP[h.trim()] ?? h.trim(),
    );
    const data = rows.slice(1);
    let created = 0;
    let updated = 0;
    let enrolled = 0;
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => (obj[h] = (row[idx] ?? '').trim()));
      const externalId = obj.externalId;
      let firstName = obj.firstName;
      let lastName = obj.lastName;
      if ((!firstName || !lastName) && obj.fullName) {
        const split = splitFullName(obj.fullName);
        firstName = firstName || split.firstName;
        lastName = lastName || split.lastName;
      }
      if (!externalId || !firstName) {
        errors.push({ row: i + 2, message: 'חסר תעודת זהות או שם' });
        continue;
      }
      if (!lastName) lastName = '';
      try {
        const existing = await this.prisma.student.findUnique({ where: { externalId } });
        let studentId: number;
        if (existing) {
          studentId = existing.id;
          await this.prisma.student.update({
            where: { id: studentId },
            data: {
              firstName,
              lastName,
              email: obj.email || null,
              phone: obj.phone || null,
              notes: obj.notes || null,
            },
          });
          updated++;
        } else {
          const s = await this.prisma.student.create({
            data: {
              externalId,
              firstName,
              lastName,
              email: obj.email || null,
              phone: obj.phone || null,
              notes: obj.notes || null,
            },
          });
          studentId = s.id;
          created++;
        }
        if (typeof courseIdRaw === 'number') {
          const before = await this.prisma.enrollment.findUnique({
            where: { courseId_studentId: { courseId: courseIdRaw, studentId } },
          });
          if (!before) {
            await this.prisma.enrollment.create({
              data: { courseId: courseIdRaw, studentId },
            });
            enrolled++;
          }
          await this.enrollments.ensureSubmissionsForEnrollment(courseIdRaw, studentId);
        }
      } catch (e) {
        errors.push({ row: i + 2, message: (e as Error).message });
      }
    }
    return { created, updated, enrolled, errors };
  }
}
