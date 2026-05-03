import { BadRequestException, ValidationError } from '@nestjs/common';

function firstConstraintMessage(error: ValidationError): string | null {
  if (error.constraints) {
    const messages = Object.values(error.constraints).filter(
      (v): v is string => typeof v === 'string' && v.length > 0,
    );
    if (messages.length > 0) return messages[0];
  }
  if (error.children && error.children.length > 0) {
    for (const child of error.children) {
      const nested = firstConstraintMessage(child);
      if (nested) return nested;
    }
  }
  return null;
}

export function validationExceptionFactory(errors: ValidationError[]): BadRequestException {
  for (const error of errors) {
    const message = firstConstraintMessage(error);
    if (message) {
      return new BadRequestException({ error: message });
    }
  }
  return new BadRequestException({ error: 'שדות חסרים או לא חוקיים' });
}
