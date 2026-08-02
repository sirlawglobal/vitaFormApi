import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsDateString,
} from 'class-validator';
import { Role } from '../../../common/enums/role.enum';

export class CreateUserByAdminDto {
  @ApiProperty({ example: 'staff.agent@vitafoam.com.ng', description: 'Email address of the staff member' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Password123!', description: 'Initial password for account', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Sarah', description: 'First name' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Okonkwo', description: 'Last name' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ example: '+2348012345678', description: 'Phone number' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ enum: Role, example: Role.SUPPORT, description: 'Role assigned to the new user' })
  @IsEnum(Role)
  role!: Role;
}

export class UpdateUserRoleDto {
  @ApiProperty({ enum: Role, example: Role.ADMIN, description: 'New role to assign' })
  @IsEnum(Role)
  role!: Role;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional({ example: 'Vitafoam Nigeria', description: 'Brand App Name' })
  @IsOptional()
  @IsString()
  appName?: string;

  @ApiPropertyOptional({ example: 'support@vitafoam.com.ng', description: 'Support Email' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ example: '+234700VITAFOAM', description: 'Support Phone' })
  @IsOptional()
  @IsString()
  supportPhone?: string;

  @ApiPropertyOptional({ example: 'https://vitafoam.com.ng/privacy', description: 'Privacy Policy URL' })
  @IsOptional()
  @IsString()
  privacyPolicyUrl?: string;

  @ApiPropertyOptional({ example: 'https://vitafoam.com.ng/terms', description: 'Terms of Service URL' })
  @IsOptional()
  @IsString()
  termsOfServiceUrl?: string;

  @ApiPropertyOptional({ example: false, description: 'Enable system maintenance mode' })
  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;
}

export class CreateBannerDto {
  @ApiProperty({ example: 'Mega Black Friday Sale', description: 'Banner title' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/vitaform/banner.png', description: 'Cloudinary image URL' })
  @IsString()
  @IsNotEmpty()
  imageUrl!: string;

  @ApiPropertyOptional({ example: '/category/mattresses', description: 'Target app navigation route' })
  @IsOptional()
  @IsString()
  targetUrl?: string;

  @ApiPropertyOptional({ example: 1, description: 'Display priority order' })
  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @ApiPropertyOptional({ example: true, description: 'Is banner visible' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Up to 30% OFF Orthopedic Mattresses', description: 'Subtitle text' })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional({ example: 'Shop Now', description: 'CTA button text' })
  @IsOptional()
  @IsString()
  buttonText?: string;

  @ApiPropertyOptional({ example: '2026-08-01T00:00:00.000Z', description: 'When the banner should start showing' })
  @IsOptional()
  @IsDateString()
  scheduledStartDate?: string;

  @ApiPropertyOptional({ example: '2026-08-31T23:59:59.000Z', description: 'When the banner should stop showing' })
  @IsOptional()
  @IsDateString()
  scheduledEndDate?: string;
}

export class UpdateBannerDto {
  @ApiPropertyOptional({ example: 'Updated Banner Title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/vitaform/banner_new.png' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: '/category/pillows' })
  @IsOptional()
  @IsString()
  targetUrl?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Limited Time' })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional({ example: 'Buy Today' })
  @IsOptional()
  @IsString()
  buttonText?: string;

  @ApiPropertyOptional({ example: '2026-08-01T00:00:00.000Z', description: 'When the banner should start showing' })
  @IsOptional()
  @IsDateString()
  scheduledStartDate?: string;

  @ApiPropertyOptional({ example: '2026-08-31T23:59:59.000Z', description: 'When the banner should stop showing' })
  @IsOptional()
  @IsDateString()
  scheduledEndDate?: string;
}

export class ResetUserPasswordDto {
  @ApiProperty({ example: 'NewPassw0rd!', description: 'New password for the user', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}
