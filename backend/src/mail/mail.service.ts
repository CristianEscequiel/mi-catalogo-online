import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly from: string;
  private readonly frontendUrl: string;
  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    this.resend = new Resend(apiKey);
    this.from = this.configService.get<string>('MAIL_FROM') ?? 'no-reply@example.com';
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:4200';
  }
  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const verifyUrl = `${this.frontendUrl}/auth/verify-email?token=${token}`;

    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject: 'Verifica tu cuenta',
      html: `
        <div style="font-family: Arial, sans-serif; line-height:1.5;">
          <h2>Verifica tu cuenta</h2>
          <p>Gracias por registrarte.</p>
          <p>Haz click en el siguiente botón para verificar tu email:</p>
          <p>
            <a href="${verifyUrl}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">
              Verificar email
            </a>
          </p>
          <p>Este enlace expira en 15 minutos.</p>
        </div>
      `,
      text: `Verifica tu cuenta: ${verifyUrl}`,
    });

    if (error) {
      throw new InternalServerErrorException('Error sending verification email');
    }
  }
  async sendResetPasswordMail(to: string, subject: string, resetToken: string): Promise<void> {
    const verifyUrl = `${this.frontendUrl}/auth/reset-password?token=${resetToken}`;
    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject: `${subject}`,
      html: ` <div style="font-family: Arial, sans-serif; line-height:1.5;">
      <h2>Reset password</h2>
      <p>Haz click en el siguiente botón para resetear tu contraseña:</p>
      <p>
        <a href="${verifyUrl}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">
          Resetear contraseña
        </a>
      </p>
      <p>Este enlace expira en 15 minutos.</p>
    </div>`,
    });

    if (error) {
      throw new InternalServerErrorException('Error sending email');
    }
  }
}
