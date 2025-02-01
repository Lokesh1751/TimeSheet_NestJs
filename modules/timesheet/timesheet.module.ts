import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Timesheet, TimesheetDay } from './timesheet.entity';
import { TimesheetService } from './timesheet.service';
import { TimesheetController } from './timesheet.controller';
import { TimesheetRepository } from './timesheet.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Timesheet, TimesheetDay])], // Ensure both entities are here
  controllers: [TimesheetController],
  providers: [TimesheetService],
})
export class TimesheetModule {}
