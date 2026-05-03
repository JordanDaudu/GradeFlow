import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding GradeFlow…');

  const seedUsers = [
    { email: 'admin@gradeflow.app', password: 'admin123', name: 'מנהל מערכת', role: 'admin' },
    { email: 'lecturer@gradeflow.app', password: 'lecturer123', name: 'דר׳ רחל אבני', role: 'lecturer' },
    { email: 'grader@gradeflow.app', password: 'grader123', name: 'אורי המתרגל', role: 'grader' },
  ];
  for (const u of seedUsers) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          email: u.email,
          passwordHash: await bcrypt.hash(u.password, 10),
          name: u.name,
          role: u.role,
        },
      });
      console.log(`Created seed user (${u.role}): ${u.email}`);
    }
  }

  const courseCount = await prisma.course.count();
  if (courseCount > 0) {
    console.log('Already seeded — skipping demo data.');
    return;
  }

  const c1 = await prisma.course.create({
    data: { code: 'CS101', name: 'מבוא למדעי המחשב', term: 'סתיו', year: 2026 },
  });
  const c2 = await prisma.course.create({
    data: { code: 'MATH201', name: 'אלגברה לינארית', term: 'סתיו', year: 2026 },
  });

  const studentSeeds = [
    { externalId: '200000001', firstName: 'נועה', lastName: 'כהן', email: 'noa.cohen@example.com' },
    { externalId: '200000002', firstName: 'איתי', lastName: 'לוי', email: 'itay.levi@example.com' },
    { externalId: '200000003', firstName: 'מאיה', lastName: 'פרץ', email: 'maya.peretz@example.com' },
    { externalId: '200000004', firstName: 'יונתן', lastName: 'מזרחי', email: 'yonatan.m@example.com' },
    { externalId: '200000005', firstName: 'שירה', lastName: 'אברהם', email: 'shira.a@example.com' },
    { externalId: '200000006', firstName: 'דניאל', lastName: 'בן דוד', email: 'daniel.bd@example.com' },
    { externalId: '200000007', firstName: 'תמר', lastName: 'סבן', email: 'tamar.s@example.com' },
    { externalId: '200000008', firstName: 'אורי', lastName: 'חזן', email: 'uri.h@example.com' },
  ];
  const students = [];
  for (const s of studentSeeds) {
    students.push(await prisma.student.create({ data: s }));
  }

  await prisma.enrollment.createMany({
    data: students.map((s) => ({ courseId: c1.id, studentId: s.id })),
  });
  await prisma.enrollment.createMany({
    data: students.slice(0, 5).map((s) => ({ courseId: c2.id, studentId: s.id })),
  });

  const a1 = await prisma.assignment.create({
    data: {
      courseId: c1.id,
      name: 'תרגיל 1 — משתנים ולולאות',
      description: 'פתרון 5 שאלות בסיסיות בלולאות',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      maxScore: '100',
      weight: '1',
      gradingScale: 'numeric',
    },
  });
  const a2 = await prisma.assignment.create({
    data: {
      courseId: c1.id,
      name: 'מבחן אמצע',
      description: 'מבחן בכיתה — 90 דקות',
      dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      maxScore: '100',
      weight: '2',
      gradingScale: 'numeric',
    },
  });
  const a3 = await prisma.assignment.create({
    data: {
      courseId: c2.id,
      name: 'תרגיל 1 — מטריצות',
      description: 'תרגיל בית בנושא מטריצות הופכיות',
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      maxScore: '100',
      weight: '1',
      gradingScale: 'numeric',
    },
  });

  for (const a of [a1, a2]) {
    await prisma.submission.createMany({
      data: students.map((s) => ({ assignmentId: a.id, studentId: s.id })),
    });
  }
  await prisma.submission.createMany({
    data: students.slice(0, 5).map((s) => ({ assignmentId: a3.id, studentId: s.id })),
  });

  const a1Subs = await prisma.submission.findMany({ where: { assignmentId: a1.id } });
  for (let i = 0; i < Math.min(4, a1Subs.length); i++) {
    const s = a1Subs[i];
    await prisma.submission.update({
      where: { id: s.id },
      data: {
        status: i < 3 ? 'graded' : 'returned',
        score: String(75 + i * 5),
        feedback: 'עבודה טובה. שים לב למבנה הקוד ולבחירת שמות המשתנים.',
        gradedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      },
    });
  }

  await prisma.rubricCriterion.createMany({
    data: [
      {
        assignmentId: a1.id,
        name: 'נכונות הפתרון',
        description: 'האם הקוד מחזיר את התוצאה הנכונה לכל המקרים',
        maxPoints: '40',
        weight: '1',
        orderIndex: 0,
      },
      {
        assignmentId: a1.id,
        name: 'איכות הקוד',
        description: 'קריאות, שמות משתנים, חלוקה לפונקציות',
        maxPoints: '30',
        weight: '1',
        orderIndex: 1,
      },
      {
        assignmentId: a1.id,
        name: 'יעילות',
        description: 'שימוש מושכל במבני נתונים וסיבוכיות סבירה',
        maxPoints: '20',
        weight: '1',
        orderIndex: 2,
      },
      {
        assignmentId: a1.id,
        name: 'תיעוד',
        description: 'הערות והסברים בקוד',
        maxPoints: '10',
        weight: '1',
        orderIndex: 3,
      },
    ],
  });

  await prisma.feedbackTemplate.createMany({
    data: [
      {
        title: 'עבודה מצוינת',
        body: 'עבודה מצוינת! פתרון נכון, קוד נקי וברור. המשך כך.',
        category: 'חיובי',
      },
      {
        title: 'פתרון נכון אך דורש שיפור בקריאות',
        body:
          'הפתרון נכון, אך כדאי לשפר את קריאות הקוד: בחירת שמות משתנים משמעותיים יותר וחלוקה לפונקציות קטנות.',
        category: 'בינוני',
      },
      {
        title: 'חסר תיעוד',
        body: 'נא להוסיף הערות הסבר לחלקים המורכבים בקוד, כדי שהקריאה תהיה ברורה יותר.',
        category: 'תיעוד',
      },
      {
        title: 'טעות בלוגיקה',
        body: 'הקוד מתקמפל, אך יש טעות לוגית במקרה הקצה. מומלץ להוסיף בדיקות יחידה ולבחון מקרי קצה.',
        category: 'שלילי',
      },
      {
        title: 'איחור בהגשה',
        body: 'התקבלה הגשה באיחור. שים לב למועדי ההגשה — איחור עלול להוריד מהציון.',
        category: 'מנהלי',
      },
    ],
  });

  console.log('Seed complete.');
}

main()
  .then(() => prisma.$disconnect())
  .then(() => process.exit(0))
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
