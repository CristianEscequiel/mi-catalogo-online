import { Module } from '@nestjs/common';
import { AiContentGenerator } from './ai-content-generator.port';
import { OpenaiService } from './service/openai.service';

@Module({
  providers: [{ provide: AiContentGenerator, useClass: OpenaiService }],
  exports: [AiContentGenerator],
})
export class AiModule {}
