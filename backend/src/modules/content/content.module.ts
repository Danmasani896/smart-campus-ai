import {
  Body,
  Controller,
  Delete,
  Get,
  Global,
  Module,
  Param,
  Post,
  Put,
  Req,
  Sse,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { interval, map, merge } from "rxjs";
import { AuthGuard, AdminGuard, AuthRequest } from "../auth/auth.module";
import { ContentDto } from "./content.dto";
import { ContentService } from "./content.service";
@ApiTags("Campus content")
@Controller("content")
class ContentController {
  constructor(private service: ContentService) {}
  @Get() list() {
    return this.service.list();
  }
  @Sse("stream")
  @SkipThrottle()
  stream() {
    return merge(
      this.service.changes,
      interval(25000).pipe(
        map(() => ({ type: "heartbeat", data: { alive: true } })),
      ),
    );
  }
  @Get(":id") one(@Param("id") id: string) {
    return this.service.one(id);
  }
}
@ApiTags("Administration")
@ApiBearerAuth()
@UseGuards(AuthGuard, AdminGuard)
@Controller("admin/content")
class AdminContentController {
  constructor(private service: ContentService) {}
  @Get() list() {
    return this.service.list(true);
  }
  @Post() create(@Body() dto: ContentDto, @Req() req: AuthRequest) {
    return this.service.save(dto, req.user.id);
  }
  @Put(":id") update(
    @Param("id") id: string,
    @Body() dto: ContentDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.save(dto, req.user.id, id);
  }
  @Delete(":id") remove(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.service.remove(id, req.user.id);
  }
}
@Global()
@Module({
  controllers: [ContentController, AdminContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
