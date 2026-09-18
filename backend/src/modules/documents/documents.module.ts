import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { Database } from "../../common/database.module";
import { institution } from "../../common/config";
import { AuthGuard, AdminGuard, AuthRequest } from "../auth/auth.module";
import { AiService } from "../ai/ai.service";
import { chunks, rank } from "../ai/retrieval";
import { ContentService } from "../content/content.service";
import { extract } from "./extract";
const upload = FileInterceptor("file", {
  limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 4 },
});
class DocumentTaskDto {
  @ApiProperty({
    enum: [
      "summary",
      "short",
      "points",
      "explain",
      "revision",
      "questions",
      "concepts",
      "ask",
    ],
  })
  @IsIn([
    "summary",
    "short",
    "points",
    "explain",
    "revision",
    "questions",
    "concepts",
    "ask",
  ])
  task!: string;
  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  question?: string;
}
@Injectable()
class DocumentsService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  constructor(
    private db: Database,
    private ai: AiService,
  ) {}
  async purge() {
    await this.db.document.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
  }
  async onModuleInit() {
    await this.purge();
    this.timer = setInterval(
      () => void this.purge().catch(() => undefined),
      60000,
    );
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  async owned(id: string, ownerId: string) {
    const doc = await this.db.document.findFirst({
      where: {
        id,
        ownerId,
        institutionId: institution(),
        expiresAt: { gt: new Date() },
      },
    });
    if (!doc) throw new NotFoundException("Document not found or expired.");
    return doc;
  }
  async list(ownerId: string) {
    return this.db.document.findMany({
      where: {
        ownerId,
        institutionId: institution(),
        expiresAt: { gt: new Date() },
      },
      select: { id: true, name: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
    });
  }
  async create(file: Express.Multer.File, ownerId: string) {
    if ((await this.list(ownerId)).length >= 10)
      throw new BadRequestException(
        "You can keep up to 10 documents. Delete one before uploading another.",
      );
    const data = await extract(file);
    return this.db.document.create({
      data: {
        ...data,
        ownerId,
        institutionId: institution(),
        expiresAt: new Date(
          Date.now() +
            Number(process.env.DOCUMENT_RETENTION_HOURS || 24) * 3600000,
        ),
      },
      select: { id: true, name: true, createdAt: true, expiresAt: true },
    });
  }
  async ask(id: string, ownerId: string, dto: DocumentTaskDto) {
    const doc = await this.owned(id, ownerId);
    const parts = chunks(doc.text).map((body, i) => ({
      title: `Excerpt ${i + 1}`,
      body,
    }));
    const focused = ["ask", "explain"].includes(dto.task);
    if (focused && !dto.question?.trim())
      throw new BadRequestException(
        "Enter a question or a section to explain.",
      );
    const selected = focused ? rank(dto.question!, parts) : parts;
    if (!selected.length)
      return {
        answer:
          "I could not find supporting text for that question in this document.",
        mode: "insufficient-evidence",
        sources: [],
      };
    const prompts: Record<string, string> = {
      summary: "Write a complete summary of all supplied excerpts.",
      short: "Write a short summary in three sentences.",
      points: "Extract the important points.",
      explain: "Explain the requested section using this document.",
      revision: "Create structured revision notes.",
      questions:
        "Generate five practice questions with answers based on these excerpts.",
      concepts: "Identify and explain key concepts.",
      ask: "Answer the question only from these excerpts.",
    };
    // Map-reduce for long documents: every chunk is included before final synthesis.
    let context = selected.map((p) => `${p.title}: ${p.body}`).join("\n\n");
    if (context.length > 18000 && process.env.OPENAI_API_KEY) {
      const summaries: string[] = [];
      for (let i = 0; i < context.length; i += 16000)
        summaries.push(
          (
            await this.ai.generate(
              "Summarize this portion, preserving important concepts and facts.",
              context.slice(i, i + 16000),
              context.slice(i, i + 2000),
            )
          ).answer,
        );
      context = summaries.join("\n\n");
    }
    const fallback = `Source excerpts from ${doc.name} (AI generation is not configured or unavailable; these are not a generated ${dto.task}):\n\n${selected
      .slice(0, dto.task === "short" ? 2 : 8)
      .map((p) => p.body)
      .join(
        "\n\n",
      )}${selected.length > 8 ? "\n\nMore text is available in the document viewer." : ""}`;
    return {
      ...(await this.ai.generate(
        `${prompts[dto.task]} ${dto.question || ""}`,
        context,
        fallback,
      )),
      sources: [{ title: doc.name, id: doc.id }],
      scope: "personal-document",
    };
  }
  async remove(id: string, ownerId: string) {
    await this.owned(id, ownerId);
    await this.db.document.delete({ where: { id } });
    return { deleted: true };
  }
}
@ApiTags("Private documents")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("documents")
class DocumentsController {
  constructor(private service: DocumentsService) {}
  @Get() list(@Req() req: AuthRequest) {
    return this.service.list(req.user.id);
  }
  @Post()
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file"],
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @UseInterceptors(upload)
  upload(@UploadedFile() file: Express.Multer.File, @Req() req: AuthRequest) {
    return this.service.create(file, req.user.id);
  }
  @Get(":id") one(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.service.owned(id, req.user.id);
  }
  @Post(":id/ask") ask(
    @Param("id") id: string,
    @Req() req: AuthRequest,
    @Body() dto: DocumentTaskDto,
  ) {
    return this.service.ask(id, req.user.id, dto);
  }
  @Delete(":id") remove(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.service.remove(id, req.user.id);
  }
}
@ApiTags("Administration")
@ApiBearerAuth()
@UseGuards(AuthGuard, AdminGuard)
@Controller("admin/documents")
class OfficialDocumentsController {
  constructor(private content: ContentService) {}
  @Post()
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file"],
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @UseInterceptors(upload)
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthRequest,
  ) {
    const doc = await extract(file);
    if (doc.text.length > 80000)
      throw new BadRequestException(
        "Split institutional documents into sections under 80,000 characters.",
      );
    return this.content.save(
      {
        title: doc.name,
        body: doc.text,
        kind: "knowledge",
        campus: "all",
        category: "Institutional document",
        status: "draft",
        verified: false,
      },
      req.user.id,
    );
  }
}
@Module({
  controllers: [DocumentsController, OfficialDocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
