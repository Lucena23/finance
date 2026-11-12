"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const helmet_1 = __importDefault(require("helmet"));
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use('/api/payments/webhook', (req, _res, next) => {
        const qIdx = req.originalUrl.indexOf('?');
        const qs = qIdx >= 0 ? req.originalUrl.slice(qIdx) : '';
        req.url = `/api/v1/plan/webhook${qs}`;
        next();
    });
    app.setGlobalPrefix('api/v1');
    app.use((0, helmet_1.default)());
    const corsOrigins = process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
        : '*';
    app.enableCors({
        origin: corsOrigins,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    const port = Number(process.env.PORT) || 3000;
    await app.listen(port);
}
void bootstrap();
//# sourceMappingURL=main.js.map