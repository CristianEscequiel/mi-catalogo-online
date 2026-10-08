import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isEmail } from 'class-validator';
import { MailService } from '../mail/mail.service';
import { CreateContactDto } from './dto/create-contact.dto';

export const CONTACT_SUCCESS_MESSAGE = 'Mensaje enviado correctamente.';
export const CONTACT_FAILURE_MESSAGE = 'No pudimos enviar tu mensaje. Intentá de nuevo más tarde.';
export const CONTACT_SEND_TIMEOUT_MS = 10_000;

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);
  private readonly to: string;

  constructor(
    config: ConfigService,
    private readonly mail: MailService,
  ) {
    const to = config.get<string>('CONTACT_TO_EMAIL');
    if (!to || !isEmail(to)) {
      throw new Error('CONTACT_TO_EMAIL is not configured or is not a valid email');
    }
    this.to = to;
  }

  async submit(dto: CreateContactDto): Promise<{ message: string }> {
    if (dto.website) {
      // Honeypot: mismo cuerpo que un envío real para que el bot no distinga. Sin contenido en el log.
      this.logger.warn('Honeypot activado en POST /contact');
      return { message: CONTACT_SUCCESS_MESSAGE };
    }

    try {
      await this.withTimeout(
        this.mail.sendContactMessage({
          to: this.to,
          name: dto.name,
          email: dto.email,
          message: dto.message,
        }),
        CONTACT_SEND_TIMEOUT_MS,
      );
    } catch (error) {
      // Solo el error: nunca el contenido del mensaje del visitante.
      this.logger.error('No se pudo enviar el mensaje de contacto', error instanceof Error ? error.stack : String(error));
      throw new ServiceUnavailableException(CONTACT_FAILURE_MESSAGE);
    }

    return { message: CONTACT_SUCCESS_MESSAGE };
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Timeout de ${ms} ms enviando mail de contacto`)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }
}
