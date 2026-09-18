import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Module,
  Param,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, AuthRequest } from "../auth/auth.module";
import { Database } from "../../common/database.module";
@Controller("checklist")
@UseGuards(AuthGuard)
class ChecklistController {
  constructor(private db: Database) {}
  @Get() list(@Req() req: AuthRequest) {
    return this.db.checklistProgress.findMany({
      where: { userId: req.user.id },
    });
  }
  @Put(":taskId") async complete(
    @Param("taskId") taskId: string,
    @Req() req: AuthRequest,
  ) {
    if (
      ![
        "prepare",
        "registration",
        "faculty",
        "courses",
        "library",
        "safety",
      ].includes(taskId)
    )
      throw new BadRequestException("Unknown checklist task.");
    return this.db.checklistProgress.upsert({
      where: { userId_taskId: { userId: req.user.id, taskId } },
      create: { userId: req.user.id, taskId },
      update: {},
    });
  }
  @Delete(":taskId") async clear(
    @Param("taskId") taskId: string,
    @Req() req: AuthRequest,
  ) {
    await this.db.checklistProgress.deleteMany({
      where: { userId: req.user.id, taskId },
    });
    return { deleted: true };
  }
}
@Module({ controllers: [ChecklistController] })
export class ChecklistModule {}
