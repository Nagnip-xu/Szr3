import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: '请输入有效邮箱' })
  email: string;

  @IsString()
  @MinLength(6, { message: '密码至少 6 位' })
  password: string;
}

export class RegisterDto {
  @IsEmail({}, { message: '请输入有效邮箱' })
  email: string;

  @IsString()
  @MinLength(6, { message: '密码至少 6 位' })
  password: string;

  @IsString()
  @MinLength(2, { message: '姓名至少 2 个字符' })
  name: string;

  @IsString()
  @MinLength(2, { message: '企业名称至少 2 个字符' })
  organizationName: string;

  @IsString()
  @MinLength(6, { message: '请输入有效注册码' })
  registrationCode: string;
}

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  name?: string;
}
