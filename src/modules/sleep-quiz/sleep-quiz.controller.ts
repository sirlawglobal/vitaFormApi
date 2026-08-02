import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SleepQuizService } from './sleep-quiz.service';
import { SubmitSleepQuizDto } from './dto/submit-sleep-quiz.dto';
import { Public } from '../../common/decorators/public.decorator';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { AuthenticatedRequest } from '../../common/types/session.types';

@ApiTags('Sleep Quiz')
@Controller('sleep-quiz')
export class SleepQuizController {
  constructor(private readonly sleepQuizService: SleepQuizService) {}

  @Public()
  @Get('questions')
  @ApiOperation({ summary: 'Get questionnaire structure and options' })
  @ApiResponse({ status: 200, description: 'Questionnaire schema' })
  getQuestions() {
    return this.sleepQuizService.getQuestions();
  }

  @Public()
  @Post('submit')
  @ApiOperation({ summary: 'Submit answers for AI processing' })
  @ApiResponse({ status: 202, description: 'Quiz queued for background AI processing' })
  async submitQuiz(
    @Body() dto: SubmitSleepQuizDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.session?.userId;
    return this.sleepQuizService.submitQuiz(dto, userId);
  }

  @Public()
  @Get('result/:id')
  @ApiOperation({ summary: 'Get quiz results and AI mattress recommendation' })
  @ApiResponse({ status: 200, description: 'Quiz processing result' })
  async getResult(@Param('id') id: string) {
    return this.sleepQuizService.getResult(id);
  }

  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  @Get('my-latest')
  @ApiOperation({ summary: 'Get latest quiz result for logged-in user' })
  @ApiResponse({ status: 200, description: 'Latest user recommendation' })
  async getMyLatest(@Req() req: AuthenticatedRequest) {
    return this.sleepQuizService.getLatestResultForUser(req.session.userId);
  }

  // --- Admin Routes: Questions ---
  
  @Post('admin/questions')
  @UseGuards(SessionAuthGuard)
  // Assume RolesGuard is handled globally or add here
  async createQuestion(@Body() dto: any) {
    return this.sleepQuizService.createQuestion(dto);
  }

  @Patch('admin/questions/:id')
  @UseGuards(SessionAuthGuard)
  async updateQuestion(@Param('id') id: string, @Body() dto: any) {
    return this.sleepQuizService.updateQuestion(id, dto);
  }

  @Delete('admin/questions/:id')
  @UseGuards(SessionAuthGuard)
  async deleteQuestion(@Param('id') id: string) {
    await this.sleepQuizService.deleteQuestion(id);
    return { message: 'Question deleted successfully' };
  }

  // --- Admin Routes: Rules ---
  
  @Get('admin/rules')
  @UseGuards(SessionAuthGuard)
  async getRules() {
    return this.sleepQuizService.getRules();
  }

  @Post('admin/rules')
  @UseGuards(SessionAuthGuard)
  async createRule(@Body() dto: any) {
    return this.sleepQuizService.createRule(dto);
  }

  @Patch('admin/rules/:id')
  @UseGuards(SessionAuthGuard)
  async updateRule(@Param('id') id: string, @Body() dto: any) {
    return this.sleepQuizService.updateRule(id, dto);
  }

  @Delete('admin/rules/:id')
  @UseGuards(SessionAuthGuard)
  async deleteRule(@Param('id') id: string) {
    await this.sleepQuizService.deleteRule(id);
    return { message: 'Rule deleted successfully' };
  }
}
