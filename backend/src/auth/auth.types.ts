export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

export const AUTH_COOKIE_NAME = 'gradeflow_token';

export function getJwtSecret(): string {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable must be set in production');
  }
  return 'gradeflow-dev-secret-change-in-prod';
}
