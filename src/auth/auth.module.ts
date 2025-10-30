import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtOrHeaderGuard } from '../common/guards/jwt-or-header.guard';
import { OnModuleInit } from '@nestjs/common';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        
        secret: cfg.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [JwtOrHeaderGuard],
  exports: [JwtModule, JwtOrHeaderGuard],
})

export class AuthModule {}
