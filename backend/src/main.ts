import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors({
    origin: (
      process.env.FRONTEND_ORIGIN ||
      "http://localhost:3000,http://127.0.0.1:3000"
    )
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableShutdownHooks();
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("BUK Smart Campus API")
      .setVersion("1.0")
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup("docs", app, document);
  const port = Number(process.env.PORT || 4000);
  const host = process.env.HOST?.trim();
  // Without HOST, Node binds dual-stack so localhost, 127.0.0.1 and ::1 all
  // reach the API. Set HOST to pin one interface (e.g. 127.0.0.1).
  if (host) await app.listen(port, host);
  else await app.listen(port);
  console.log(
    `API listening on http://localhost:${port}/api (host: ${host || "all"})`,
  );
}
bootstrap().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
