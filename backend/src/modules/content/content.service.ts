import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Subject } from "rxjs";
import { Database } from "../../common/database.module";
import { institution } from "../../common/config";
import { ContentDto } from "./content.dto";
export function assertPublishable(dto: ContentDto) {
  if (
    dto.status === "published" &&
    (!dto.verified || !dto.sourceUrl || !dto.sourceLabel)
  )
    throw new BadRequestException(
      "Publishing requires verification, a source URL and a source label.",
    );
  if (dto.status === "published" && dto.kind === "emergency" && !dto.phone)
    throw new BadRequestException(
      "A published emergency contact needs a verified telephone number.",
    );
  if (dto.status === "published" && dto.kind === "event" && !dto.startsAt)
    throw new BadRequestException("A published event needs a start date.");
  if ((dto.latitude == null) !== (dto.longitude == null))
    throw new BadRequestException("Provide both latitude and longitude.");
}
@Injectable()
export class ContentService {
  changes = new Subject<{
    type: string;
    data: { id: string; kind: string; action: string };
  }>();
  constructor(private db: Database) {}
  list(admin = false) {
    return this.db.content.findMany({
      where: {
        institutionId: institution(),
        ...(admin ? {} : { status: "published", verified: true }),
      },
      orderBy: { updatedAt: "desc" },
    });
  }
  async one(id: string) {
    const item = await this.db.content.findFirst({
      where: {
        id,
        institutionId: institution(),
        status: "published",
        verified: true,
      },
    });
    if (!item) throw new NotFoundException("Content not found.");
    return item;
  }
  async save(dto: ContentDto, actorId: string, id?: string) {
    assertPublishable(dto);
    const previous = id
      ? await this.db.content.findFirst({
          where: { id, institutionId: institution() },
        })
      : null;
    if (id && !previous) throw new NotFoundException();
    const data = {
      ...dto,
      sourceUrl: dto.sourceUrl || null,
      sourceLabel: dto.sourceLabel || null,
      phone: dto.phone || null,
      venue: dto.venue || null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      verifiedAt: dto.verified ? new Date() : null,
      institutionId: institution(),
    };
    const result = await this.db.$transaction(async (tx) => {
      const row = id
        ? await tx.content.update({ where: { id }, data })
        : await tx.content.create({ data });
      await tx.auditLog.create({
        data: {
          institutionId: institution(),
          actorId,
          contentId: row.id,
          action: id ? "update" : "create",
        },
      });
      return row;
    });
    // Invalidation only: never send unpublished draft titles or bodies to public subscribers.
    if (result.status === "published" || previous?.status === "published")
      this.changes.next({
        type: "content",
        data: { id: result.id, kind: result.kind, action: "refresh" },
      });
    return result;
  }
  async remove(id: string, actorId: string) {
    const row = await this.db.content.findFirst({
      where: { id, institutionId: institution() },
    });
    if (!row) throw new NotFoundException();
    await this.db.$transaction([
      this.db.content.delete({ where: { id } }),
      this.db.auditLog.create({
        data: {
          institutionId: institution(),
          actorId,
          contentId: id,
          action: "delete",
        },
      }),
    ]);
    if (row.status === "published")
      this.changes.next({
        type: "content",
        data: { id, kind: row.kind, action: "refresh" },
      });
    return { deleted: true };
  }
}
