import { Module } from '@nestjs/common';
import { MailSender } from './mail-sender.port';
import { MailService } from './mail.service';

@Module({
  providers: [{ provide: MailSender, useClass: MailService }],
  exports: [MailSender],
})
export class MailModule {}
