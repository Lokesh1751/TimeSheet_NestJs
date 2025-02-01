import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiResponse } from '@nestjs/swagger';

@ApiTags('cats')
@Controller('cats')
export class AppController {
  constructor(private readonly appService: AppService) {}
}
