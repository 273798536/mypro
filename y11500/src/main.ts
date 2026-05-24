import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { mkdirSync } from 'fs';
import { join } from 'path';

async function bootstrap() {
  const dataDir = join(process.cwd(), 'data');
  mkdirSync(dataDir, { recursive: true });

  const app = await NestFactory.create(AppModule);
  
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  const config = new DocumentBuilder()
    .setTitle('售后备件领用异常回执状态机 API')
    .setDescription('售后备件领用异常回执状态机服务 API 文档')
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'x-user-id', in: 'header' }, 'x-user-id')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
  console.log('Server is running on http://localhost:3000');
  console.log('API docs: http://localhost:3000/api');
}

bootstrap();
