export interface ContactMessageInput {
  to: string;
  name: string;
  email: string;
  message: string;
}

// Puerto de envío de correo. Es una clase abstracta para que sirva de token de inyección de Nest
// (los consumidores piden `MailSender`, no el proveedor concreto). El adaptador actual es `MailService` (Resend).
export abstract class MailSender {
  abstract sendVerificationEmail(to: string, token: string): Promise<void>;
  abstract sendResetPasswordMail(to: string, subject: string, resetToken: string): Promise<void>;
  abstract sendContactMessage(input: ContactMessageInput): Promise<void>;
}
