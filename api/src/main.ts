import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      process.env.CORS_ORIGIN ?? 'http://localhost:3000',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, "0.0.0.0");
  console.log(`Szr3 API running on http://localhost:${port}/api`);
}

bootstrap();
