import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly fromAddress: string;
  private readonly frontendBaseUrl: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.fromAddress =
      process.env.RESEND_FROM_EMAIL ?? 'GradeFlow <noreply@gradeflow.app>';
    this.frontendBaseUrl = this.resolveBaseUrl();

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Email service initialised (Resend)');
    } else {
      this.resend = null;
      this.logger.warn(
        'RESEND_API_KEY is not set — password-reset emails will not be sent. ' +
          'Admins can issue temporary passwords via POST /users/:id/reset-password.',
      );
    }
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    return `${local.slice(0, 2)}***@${domain}`;
  }

  async sendPasswordReset(toEmail: string, rawToken: string): Promise<void> {
    if (!this.resend) {
      this.logger.warn(
        `Password-reset email not sent to ${this.maskEmail(toEmail)} (no email provider configured).`,
      );
      return;
    }

    const resetUrl = `${this.frontendBaseUrl}/reset-password?token=${rawToken}`;

    const plainText = [
      'שלום,',
      '',
      'קיבלנו בקשה לאיפוס הסיסמה שלך ב-GradeFlow.',
      'לחץ על הקישור הבא לבחירת סיסמה חדשה:',
      '',
      resetUrl,
      '',
      'הקישור תקף לשעה אחת ויפסיק לפעול לאחר שימוש.',
      'אם לא ביקשת איפוס סיסמה, ניתן להתעלם מהודעה זו.',
      '',
      'צוות GradeFlow',
    ].join('\n');

    const htmlBody = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>איפוס סיסמה – GradeFlow</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);max-width:560px;width:100%;">
          <!-- Header -->
          <tr>
            <td align="center" style="background-color:#4f46e5;padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">GradeFlow</h1>
              <p style="margin:6px 0 0;color:#c7d2fe;font-size:13px;">מערכת ניהול ציונים</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 12px;font-size:22px;color:#1e1b4b;font-weight:600;">איפוס סיסמה</h2>
              <p style="margin:0 0 8px;color:#374151;font-size:15px;line-height:1.7;">שלום,</p>
              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.7;">
                קיבלנו בקשה לאיפוס הסיסמה שלך ב-GradeFlow.<br/>
                לחץ על הכפתור הבא לבחירת סיסמה חדשה:
              </p>
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <a href="${resetUrl}"
                       style="display:inline-block;background-color:#4f46e5;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 40px;border-radius:8px;letter-spacing:0.3px;">
                      אפס סיסמה
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;line-height:1.6;">
                הקישור תקף לשעה אחת ויפסיק לפעול לאחר שימוש.
              </p>
              <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
                אם לא ביקשת איפוס סיסמה, ניתן להתעלם מהודעה זו.
              </p>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0;" />
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 40px;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">צוות GradeFlow &nbsp;|&nbsp; הודעה אוטומטית — אנא אל תשיב למייל זה</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    try {
      await this.resend.emails.send({
        from: this.fromAddress,
        to: toEmail,
        subject: 'GradeFlow — איפוס סיסמה',
        html: htmlBody,
        text: plainText,
      });
      this.logger.log(`Password-reset email sent to ${this.maskEmail(toEmail)}`);
    } catch (err) {
      this.logger.error(`Failed to send password-reset email to ${this.maskEmail(toEmail)}`, err);
    }
  }

  private resolveBaseUrl(): string {
    if (process.env.FRONTEND_BASE_URL) {
      return process.env.FRONTEND_BASE_URL.replace(/\/$/, '');
    }
    const replitDomains = process.env.REPLIT_DOMAINS;
    if (replitDomains) {
      const first = replitDomains.split(',')[0].trim();
      return `https://${first}`;
    }
    const devDomain = process.env.REPLIT_DEV_DOMAIN;
    if (devDomain) {
      return `https://${devDomain}`;
    }
    return 'http://localhost:5173';
  }
}
