import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@ApiTags('Root')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'API Monolith Root Welcome Banner' })
  @ApiResponse({ status: 200, description: 'Welcome banner string' })
  getHello(): string {
    return this.appService.getHello();
  }
}
