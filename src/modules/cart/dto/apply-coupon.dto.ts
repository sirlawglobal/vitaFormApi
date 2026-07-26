import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class ApplyCouponDto {
  @ApiProperty({
    example: 'WELCOME10',
    description: 'Promotional discount coupon code',
  })
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toUpperCase().trim() : value,
  )
  couponCode!: string;
}
