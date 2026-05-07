import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { json, urlencoded } from 'express';
import cookieParser from 'cookie-parser';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/exception-filter';
import { validationExceptionFactory } from './common/validation.factory';

const BODY_LIMIT = '10mb';

async function bootstrap() {
  const rawPort = process.env.PORT;
  if (!rawPort) {
    throw new Error('PORT environment variable is required but was not provided.');
  }
  const port = Number(rawPort);
  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    cors: { origin: true, credentials: true },
  });

  app.use(json({ limit: BODY_LIMIT }));
  app.use(urlencoded({ extended: true, limit: BODY_LIMIT }));
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: validationExceptionFactory,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('GradeFlow API')
    .setDescription(
      'REST API for the GradeFlow grading management platform.\n\n' +
        '**Authentication:** Call `POST /api/auth/login` first. The server issues an ' +
        'httpOnly cookie (`gradeflow_token`) that is automatically sent on subsequent ' +
        'requests from a browser or any cookie-aware HTTP client.\n\n' +
        '**First admin account:** Create it through the secure first-boot seed ' +
        'environment variables, then use the Users admin screen to add lecturers and graders.\n\n' +
        '**Error envelope:** All errors are returned as `{ "error": "<message>" }`.',
    )
    .setVersion('1.0')
    .addCookieAuth('gradeflow_token', {
      type: 'apiKey',
      in: 'cookie',
      name: 'gradeflow_token',
      description: 'Session cookie issued by POST /api/auth/login (httpOnly, 30-day TTL)',
    })
    .addTag('Auth', 'Login, logout, password management, and session control')
    .addTag('Courses', 'Course CRUD, archiving, enrollment management, and gradebook')
    .addTag('Students', 'Student registry, profile editing, and grade history')
    .addTag('Assignments', 'Assignment CRUD and open/close lifecycle')
    .addTag('Assignment Files', 'File attachments for assignment instructions and guides')
    .addTag('Submissions', 'Per-student submission grading and file attachments')
    .addTag('Rubrics', 'Rubric criteria definition and per-submission scoring')
    .addTag('Feedback Templates', 'Reusable comment snippets for graders')
    .addTag('Dashboard', 'Aggregate statistics and recent grading activity')
    .addTag('Users', 'Admin-only user management (create, update, reset password)')
    .addTag('Import', 'Bulk student import via CSV')
    .addTag('Export', 'CSV grade exports for courses and assignments')
    .addTag('Storage', 'Pre-signed upload URLs and document preview proxy')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
    },
    customSiteTitle: 'GradeFlow API Docs',
  });

  await app.listen(port, '0.0.0.0');
  Logger.log(`Server listening on port ${port}`, 'Bootstrap');
  Logger.log(`Swagger docs → /api/docs (port ${port})`, 'Bootstrap');
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to bootstrap application', err);
  process.exit(1);
});
