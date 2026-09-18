import {
  Body,
  CanActivate,
  ConflictException,
  Controller,
  ExecutionContext,
  ForbiddenException,
  Get,
  Global,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { IsEmail, IsIn, IsString, Length, MaxLength } from "class-validator";
import { ApiBearerAuth, ApiProperty, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Database } from "../../common/database.module";
import { institution } from "../../common/config";
import { checkPassword, hashPassword } from "./password";
import type { Request } from "express";
export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  institutionId: string;
};
export type AuthRequest = Request & { user: SessionUser };
export class LoginDto {
  @ApiProperty({ format: "email" })
  @IsEmail()
  @MaxLength(254)
  email!: string;
  @ApiProperty({ minLength: 6, maxLength: 128, format: "password" })
  @IsString()
  @Length(6, 128)
  password!: string;
}
export class RegisterDto extends LoginDto {
  @ApiProperty({ minLength: 2, maxLength: 80 })
  @IsString()
  @Length(2, 80)
  name!: string;
}
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwt: JwtService,
    private db: Database,
  ) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new UnauthorizedException("Please sign in first.");
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      const user = await this.db.user.findFirst({
        where: { id: payload.sub, institutionId: institution() },
      });
      if (!user) throw new Error();
      const { passwordHash: _, ...safe } = user;
      req.user = safe;
      return true;
    } catch {
      throw new UnauthorizedException(
        "Your session has expired. Please sign in again.",
      );
    }
  }
}
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    if (context.switchToHttp().getRequest<AuthRequest>().user?.role !== "admin")
      throw new ForbiddenException("Administrator access required.");
    return true;
  }
}
@ApiTags("Authentication")
@Controller("auth")
class AuthController {
  constructor(
    private db: Database,
    private jwt: JwtService,
  ) {}
  private session(user: SessionUser) {
    return { user, token: this.jwt.sign({ sub: user.id }) };
  }
  @Post("register")
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  async register(@Body() dto: RegisterDto) {
    try {
      const user = await this.db.user.create({
        data: {
          name: dto.name.trim(),
          email: dto.email.toLowerCase().trim(),
          passwordHash: hashPassword(dto.password),
          institutionId: institution(),
        },
      });
      const { passwordHash: _, createdAt: __, ...safe } = user;
      return this.session(safe);
    } catch (error) {
      if ((error as { code?: string }).code === "P2002")
        throw new ConflictException(
          "An account with this email already exists.",
        );
      throw error;
    }
  }
  @Post("login")
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  async login(@Body() dto: LoginDto) {
    const user = await this.db.user.findUnique({
      where: {
        institutionId_email: {
          institutionId: institution(),
          email: dto.email.toLowerCase().trim(),
        },
      },
    });
    if (!user || !checkPassword(dto.password, user.passwordHash))
      throw new UnauthorizedException("Email or password is incorrect.");
    const { passwordHash: _, createdAt: __, ...safe } = user;
    return this.session(safe);
  }
  @Get("me")
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  me(@Req() req: AuthRequest) {
    return req.user;
  }
}
class RoleDto {
  @IsIn(["student", "admin"]) role!: string;
}
@ApiTags("Administration")
@ApiBearerAuth()
@UseGuards(AuthGuard, AdminGuard)
@Controller("admin/users")
class AdminUsersController {
  constructor(private db: Database) {}
  @Get() list() {
    return this.db.user.findMany({
      where: { institutionId: institution() },
      select: { id: true, name: true, email: true, role: true },
      take: 200,
      orderBy: { createdAt: "desc" },
    });
  }
  @Put(":id/role") async role(
    @Param("id") id: string,
    @Body() dto: RoleDto,
    @Req() req: AuthRequest,
  ) {
    if (id === req.user.id)
      throw new ForbiddenException(
        "Ask another administrator to change your own role.",
      );
    if (
      !(await this.db.user.findFirst({
        where: { id, institutionId: institution() },
      }))
    )
      throw new NotFoundException();
    const [user] = await this.db.$transaction([
      this.db.user.update({
        where: { id },
        data: { role: dto.role },
        select: { id: true, name: true, email: true, role: true },
      }),
      this.db.auditLog.create({
        data: {
          institutionId: institution(),
          actorId: req.user.id,
          contentId: id,
          action: `role:${dto.role}`,
        },
      }),
    ]);
    return user;
  }
}
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: "2h",
          issuer: "smart-campus",
          audience: "smart-campus-web",
        },
        verifyOptions: { issuer: "smart-campus", audience: "smart-campus-web" },
      }),
    }),
  ],
  controllers: [AuthController, AdminUsersController],
  providers: [AuthGuard, AdminGuard],
  exports: [AuthGuard, AdminGuard, JwtModule],
})
export class AuthModule {}
