import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { parseCsv } from '../src/common/csv.util';

type MoodleStudentRow = {
  firstName: string;
  lastName: string;
  externalId: string;
  email: string | null;
};

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) continue;

    const index = trimmed.indexOf('=');
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function prepareDatabaseUrl() {
  loadEnvFile(path.resolve(process.cwd(), '.env'));
  loadEnvFile(path.resolve(process.cwd(), '..', '.env'));

  if (process.env.IMPORT_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.IMPORT_DATABASE_URL;
    return;
  }

  const localPostgresPort = process.env.POSTGRES_PORT || '5433';

  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL =
      `postgresql://gradeflow:gradeflow_password@localhost:${localPostgresPort}/gradeflow`;
    return;
  }

  try {
    const url = new URL(process.env.DATABASE_URL);

    // docker-compose uses host "db" inside containers.
    // Local import scripts run from the Mac/PC host, so they need localhost.
    if (url.hostname === 'db' || url.hostname === 'postgres') {
      url.hostname = 'localhost';
      url.port = localPostgresPort;
      process.env.DATABASE_URL = url.toString();
    }
  } catch {
    // Keep original DATABASE_URL if parsing fails.
  }
}

function printDatabaseTarget() {
  try {
    const databaseUrl = process.env.DATABASE_URL ?? '';
    const url = new URL(databaseUrl);

    console.log(
      `Database target: ${url.username}@${url.hostname}:${url.port || '5432'}${url.pathname}`,
    );
  } catch {
    console.log('Database target: could not parse DATABASE_URL');
  }
}

function getArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}


function resolveInputFilePath(filePath: string): string {
  if (path.isAbsolute(filePath) && fs.existsSync(filePath)) {
    return filePath;
  }

  const candidates = [
    path.resolve(process.cwd(), filePath),
    path.resolve(process.cwd(), '..', filePath),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `File not found. Tried:\n${candidates.map((candidate) => `- ${candidate}`).join('\n')}`,
  );
}

function normalizeHeader(header: string): string {
  return header.replace(/^\uFEFF/, '').trim();
}

function isStudentEmail(email: string | null): boolean {
  if (!email) return false;

  const normalized = email.trim().toLowerCase();

  // SCE student emails in the Moodle export use ac.sce.ac.il.
  // Teacher/staff rows in the sample use sce.ac.il and should be skipped.
  return normalized.endsWith('@ac.sce.ac.il');
}

function parseMoodleCsv(csvContent: string): {
  students: MoodleStudentRow[];
  skippedRows: number;
  invalidRows: Array<{ row: number; message: string }>;
} {
  const rows = parseCsv(csvContent);

  if (rows.length < 2) {
    throw new Error('CSV file has no data rows.');
  }

  const headers = rows[0].map(normalizeHeader);

  const firstNameIndex = headers.indexOf('שם פרטי');
  const lastNameIndex = headers.indexOf('שם משפחה');
  const externalIdIndex = headers.indexOf('מספר זיהוי');
  const emailIndex = headers.indexOf('דוא"ל');

  const missingHeaders = [
    ['שם פרטי', firstNameIndex],
    ['שם משפחה', lastNameIndex],
    ['מספר זיהוי', externalIdIndex],
    ['דוא"ל', emailIndex],
  ].filter(([, index]) => index === -1);

  if (missingHeaders.length > 0) {
    throw new Error(
      `Missing required CSV headers: ${missingHeaders.map(([name]) => name).join(', ')}`,
    );
  }

  const students: MoodleStudentRow[] = [];
  const invalidRows: Array<{ row: number; message: string }> = [];
  let skippedRows = 0;

  for (let i = 1; i < rows.length; i++) {
    const rowNumber = i + 1;
    const row = rows[i];

    const firstName = (row[firstNameIndex] ?? '').trim();
    const lastName = (row[lastNameIndex] ?? '').trim();
    const externalId = (row[externalIdIndex] ?? '').trim();
    const email = (row[emailIndex] ?? '').trim() || null;

    // Skip teachers/staff/non-students.
    if (!isStudentEmail(email)) {
      skippedRows++;
      continue;
    }

    if (!firstName || !lastName || !externalId) {
      invalidRows.push({
        row: rowNumber,
        message: 'Missing first name, last name, or student ID.',
      });
      continue;
    }

    students.push({
      firstName,
      lastName,
      externalId,
      email,
    });
  }

  return { students, skippedRows, invalidRows };
}

async function main() {
  prepareDatabaseUrl();
  printDatabaseTarget();

  const filePath = getArg('--file');
  const courseIdRaw = getArg('--course-id');
  const dryRun = hasFlag('--dry-run');

  if (!filePath) {
    console.error('');
    console.error('Usage:');
    console.error(
      '  pnpm --filter @workspace/api-server run import:moodle-students -- --file ../imports/moodle-students.csv --course-id 1',
    );
    console.error('');
    console.error('Options:');
    console.error('  --file       Path to Moodle CSV export');
    console.error('  --course-id  Optional GradeFlow course id to enroll students into');
    console.error('  --dry-run    Parse and validate only, without writing to the database');
    console.error('');
    process.exit(1);
  }

  const resolvedFilePath = resolveInputFilePath(filePath);

  const courseId =
    courseIdRaw !== undefined && courseIdRaw !== ''
      ? Number.parseInt(courseIdRaw, 10)
      : undefined;

  if (courseIdRaw !== undefined && (!Number.isInteger(courseId) || courseId <= 0)) {
    throw new Error('--course-id must be a positive integer.');
  }

  const csvContent = fs.readFileSync(resolvedFilePath, 'utf8');
  const { students, skippedRows, invalidRows } = parseMoodleCsv(csvContent);

  console.log('');
  console.log('Moodle student import');
  console.log('=====================');
  console.log(`File: ${resolvedFilePath}`);
  console.log(`Parsed students: ${students.length}`);
  console.log(`Skipped non-student rows: ${skippedRows}`);
  console.log(`Invalid rows: ${invalidRows.length}`);
  console.log(`Course ID: ${courseId ?? 'none'}`);
  console.log(`Dry run: ${dryRun ? 'yes' : 'no'}`);
  console.log('');

  if (invalidRows.length > 0) {
    console.log('Invalid rows:');
    for (const error of invalidRows) {
      console.log(`- Row ${error.row}: ${error.message}`);
    }
    console.log('');
  }

  if (dryRun) {
    console.log('Dry run complete. No database changes were made.');
    return;
  }

  const prisma = new PrismaClient();

  let created = 0;
  let updated = 0;
  let enrolled = 0;
  let submissionsCreated = 0;

  try {
    if (courseId !== undefined) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true, code: true, name: true, term: true, year: true },
      });

      if (!course) {
        throw new Error(`Course not found with id ${courseId}.`);
      }

      console.log(
        `Target course: #${course.id} | ${course.code} | ${course.name} | ${course.term} ${course.year}`,
      );
    }

    for (const student of students) {
      const existing = await prisma.student.findUnique({
        where: { externalId: student.externalId },
        select: { id: true },
      });

      const savedStudent = existing
        ? await prisma.student.update({
            where: { id: existing.id },
            data: {
              firstName: student.firstName,
              lastName: student.lastName,
              email: student.email,
            },
          })
        : await prisma.student.create({
            data: {
              externalId: student.externalId,
              firstName: student.firstName,
              lastName: student.lastName,
              email: student.email,
            },
          });

      if (existing) {
        updated++;
      } else {
        created++;
      }

      if (courseId !== undefined) {
        const existingEnrollment = await prisma.enrollment.findUnique({
          where: {
            courseId_studentId: {
              courseId,
              studentId: savedStudent.id,
            },
          },
        });

        if (!existingEnrollment) {
          await prisma.enrollment.create({
            data: {
              courseId,
              studentId: savedStudent.id,
            },
          });
          enrolled++;
        }

        const assignments = await prisma.assignment.findMany({
          where: { courseId },
          select: { id: true },
        });

        if (assignments.length > 0) {
          const result = await prisma.submission.createMany({
            data: assignments.map((assignment) => ({
              assignmentId: assignment.id,
              studentId: savedStudent.id,
            })),
            skipDuplicates: true,
          });

          submissionsCreated += result.count;
        }
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log('');
  console.log('Import completed successfully.');
  console.log(`Created students: ${created}`);
  console.log(`Updated students: ${updated}`);
  console.log(`Enrolled students: ${enrolled}`);
  console.log(`Created submission placeholders: ${submissionsCreated}`);
}

main().catch((error) => {
  console.error('');
  console.error('Import failed:');
  console.error(error instanceof Error ? error.message : error);
  console.error('');
  process.exit(1);
});