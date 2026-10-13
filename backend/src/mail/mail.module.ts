import { Module } from '@nestjs/common';
import { MailSender } from './mail-sender.port';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';

@Module({
  providers: [{ provide: MailSender, useClass: MailService }],
  exports: [MailSender],
  controllers: [MailController],
})
export class MailModule {}
