"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
const fs_1 = require("fs");
const path_1 = require("path");
async function bootstrap() {
    const dataDir = (0, path_1.join)(process.cwd(), 'data');
    (0, fs_1.mkdirSync)(dataDir, { recursive: true });
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors();
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true }));
    const config = new swagger_1.DocumentBuilder()
        .setTitle('售后备件领用异常回执状态机 API')
        .setDescription('售后备件领用异常回执状态机服务 API 文档')
        .setVersion('1.0')
        .addApiKey({ type: 'apiKey', name: 'x-user-id', in: 'header' }, 'x-user-id')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api', app, document);
    await app.listen(3000);
    console.log('Server is running on http://localhost:3000');
    console.log('API docs: http://localhost:3000/api');
}
bootstrap();
//# sourceMappingURL=main.js.map