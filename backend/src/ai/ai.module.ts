import { Module } from '@nestjs/common';
import { OpenaiService } from './service/openai.service';

@Module({
  providers: [OpenaiService],
  exports: [OpenaiService],
})
export class AiModule {}
