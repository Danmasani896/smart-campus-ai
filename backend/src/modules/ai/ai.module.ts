import { Body, Controller, Global, Module, Post } from "@nestjs/common";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from "class-validator";
import { ApiTags, ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AiService } from "./ai.service";
class ChatDto {
  @ApiProperty({
    example: "How do I complete course registration?",
    minLength: 2,
    maxLength: 2000,
  })
  @IsString()
  @Length(2, 2000)
  message!: string;
  @ApiProperty({ enum: ["all", "new", "old"], default: "all" })
  @IsIn(["all", "new", "old"])
  campus!: string;
  @ApiPropertyOptional({ type: [String], maxItems: 6 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @MaxLength(2000, { each: true })
  previousQuestions?: string[];
}
@ApiTags("Campus AI")
@Controller("chat")
class AiController {
  constructor(private service: AiService) {}
  @Post()
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  chat(@Body() dto: ChatDto) {
    return this.service.chat(dto.message, dto.campus, dto.previousQuestions);
  }
}
@Global()
@Module({
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
