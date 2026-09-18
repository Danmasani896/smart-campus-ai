import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
export const KINDS = [
  "knowledge",
  "faq",
  "location",
  "event",
  "announcement",
  "emergency",
  "guide",
  "faculty",
  "department",
  "campus",
] as const;
export class ContentDto {
  @ApiProperty({ enum: KINDS })
  @IsIn(KINDS)
  kind!: string;
  @ApiProperty({ minLength: 3, maxLength: 160 })
  @IsString()
  @Length(3, 160)
  title!: string;
  @ApiProperty({ minLength: 10, maxLength: 80000 })
  @IsString()
  @Length(10, 80000)
  body!: string;
  @ApiProperty({ enum: ["all", "new", "old"] })
  @IsIn(["all", "new", "old"])
  campus!: string;
  @ApiProperty()
  @IsString()
  @Length(2, 60)
  category!: string;
  @ApiProperty({ enum: ["draft", "published", "archived"] })
  @IsIn(["draft", "published", "archived"])
  status!: string;
  @ApiProperty({ default: false })
  @IsBoolean()
  verified!: boolean;
  @ApiPropertyOptional({
    description: "HTTPS university source; required for publishing",
  })
  @IsOptional()
  @IsUrl({ protocols: ["https"], require_protocol: true })
  sourceUrl?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  sourceLabel?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\+?[0-9 ()-]{3,24}$/)
  phone?: string;
  @ApiPropertyOptional({ format: "date-time" })
  @IsOptional()
  @IsDateString()
  startsAt?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  venue?: string;
}
