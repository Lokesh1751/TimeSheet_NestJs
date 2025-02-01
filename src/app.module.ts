import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TimesheetController } from 'modules/timesheet/timesheet.controller';
import { TimesheetService } from 'modules/timesheet/timesheet.service';
import { TimesheetModule } from 'modules/timesheet/timesheet.module';
import { typeOrmConfig } from './config/typeorm.config';

@Module({
  imports: [TypeOrmModule.forRoot(typeOrmConfig),TimesheetModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
