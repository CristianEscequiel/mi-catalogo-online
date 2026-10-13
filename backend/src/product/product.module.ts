import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductService } from './services/product.service';
import { CategoryService } from './services/category.service';
import { ProductController } from './controllers/product.controller';
import { CategoryController } from './controllers/category.controller';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { FilesModule } from 'src/files/files.module';
import { AiModule } from 'src/ai/ai.module';
import { AI_THROTTLER_NAME } from 'src/ai/ai-throttler.guard';
import { readPositiveInt } from 'src/ai/ai-rate-limit.config';

const DEFAULT_AI_RATE_LIMIT = 20;
const DEFAULT_AI_RATE_TTL_SECONDS = 3600;

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Category]),
    FilesModule,
    AiModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('AiRateLimit');
        const limit = readPositiveInt(config.get('AI_RATE_LIMIT'), DEFAULT_AI_RATE_LIMIT);
        const ttlSeconds = readPositiveInt(config.get('AI_RATE_TTL_SECONDS'), DEFAULT_AI_RATE_TTL_SECONDS);
        if (!limit.valid) {
          logger.warn(`AI_RATE_LIMIT inválida; se usa ${DEFAULT_AI_RATE_LIMIT}`);
        }
        if (!ttlSeconds.valid) {
          logger.warn(`AI_RATE_TTL_SECONDS inválida; se usa ${DEFAULT_AI_RATE_TTL_SECONDS}`);
        }
        return {
          // En @nestjs/throttler v6 el ttl va en milisegundos.
          throttlers: [{ name: AI_THROTTLER_NAME, ttl: ttlSeconds.value * 1000, limit: limit.value }],
          errorMessage: 'Llegaste al límite de usos de la IA. Probá de nuevo más tarde.',
        };
      },
    }),
  ],
  controllers: [ProductController, CategoryController],
  providers: [ProductService, CategoryService],
  exports: [ProductService, CategoryService],
})
export class ProductModule {}
