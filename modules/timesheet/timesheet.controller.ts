import { Controller, Post, Get, Put, Body, Param } from '@nestjs/common';
import { TimesheetService } from './timesheet.service';
import { CreateTimesheetDto } from './create-timesheet-dto';
import { ApiBody } from '@nestjs/swagger';
import { UpdateTimesheetEntryDto } from './update-timesheet-dto';
import { BulkUpdateTimesheetDto } from './update-bulk-dto';

@Controller('timesheet')
export class TimesheetController {
  constructor(private readonly timesheetService: TimesheetService) {}

  @Post()
  async addTimesheet(@Body() data: CreateTimesheetDto) {
    return this.timesheetService.addTimesheet(data);
  }

  @Get()
  async getAllTimesheets() {
    return this.timesheetService.getAllTimesheets();
  }

  @Put('/day/:date')
  @ApiBody({ type: UpdateTimesheetEntryDto })
  async updateTimesheetDay(
    @Param('date') date: string,
    @Body() updateData: UpdateTimesheetEntryDto,
  ) {
    return this.timesheetService.updateTimesheetDay(date, updateData);
  }

  @Put('/bulk-update')
  @ApiBody({ type: BulkUpdateTimesheetDto })
  async bulkUpdateTimesheetDays(@Body() bulkUpdateDto: BulkUpdateTimesheetDto) {
    return this.timesheetService.bulkUpdateTimesheetDays(bulkUpdateDto.updates);
  }
}
