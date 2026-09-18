import { Controller, Get, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { DatabaseModule } from "./common/database.module";
import { validateConfig } from "./common/config";
import { AuthModule } from "./modules/auth/auth.module";
import { ContentModule } from "./modules/content/content.module";
import { AiModule } from "./modules/ai/ai.module";
import { DocumentsModule } from "./modules/documents/documents.module";
import { ChecklistModule } from "./modules/checklist/checklist.module";
@Controller("health")
class HealthController {
  @Get() health() {
    return {
      status: "ok",
      ai: process.env.OPENAI_API_KEY ? "configured" : "extractive",
    };
  }
}
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateConfig }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    DatabaseModule,
    AuthModule,
    ContentModule,
    AiModule,
    DocumentsModule,
    ChecklistModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
