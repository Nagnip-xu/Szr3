import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateRegistrationCodesDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  count?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}
