import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { MailModule } from '../mail/mail.module';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';

const DEFAULT_RATE_LIMIT = 3;
const DEFAULT_RATE_TTL_SECONDS = 600;

@Module({
  imports: [
    MailModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            // En @nestjs/throttler v6 el ttl va en milisegundos.
            ttl: Number(config.get('CONTACT_RATE_TTL_SECONDS') ?? DEFAULT_RATE_TTL_SECONDS) * 1000,
            limit: Number(config.get('CONTACT_RATE_LIMIT') ?? DEFAULT_RATE_LIMIT),
          },
        ],
        errorMessage: 'Demasiados intentos. Probá de nuevo más tarde.',
      }),
    }),
  ],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
