import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Env } from './env.model';
import { ProductModule } from './product/product.module';
import { AuthModule } from './auth/auth.module';
import { FavoritesModule } from './favorites/favorites.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService<Env>) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', { infer: true }) ?? configService.get('POSTGRES_HOST', { infer: true }),
        port: configService.get('DB_PORT', { infer: true }) ?? configService.get('POSTGRES_PORT', { infer: true }),
        username: configService.get('DB_USER', { infer: true }) ?? configService.get('POSTGRES_USER', { infer: true }),
        password: configService.get('DB_PASSWORD', { infer: true }) ?? configService.get('POSTGRES_PASSWORD', { infer: true }),
        database: configService.get('DB_NAME', { infer: true }) ?? configService.get('POSTGRES_DB', { infer: true }),
        autoLoadEntities: true,
        synchronize: false,
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    ProductModule,
    AuthModule,
    FavoritesModule,
    CartModule,
    OrdersModule,
  ],
})
export class AppModule {}
