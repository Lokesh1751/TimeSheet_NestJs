import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Body, 
  Param, 
  HttpStatus 
} from '@nestjs/common';
import { TimesheetService } from './timesheet.service';
import { CreateTimesheetDto } from './create-timesheet-dto';
import { UpdateTimesheetEntryDto } from './update-timesheet-dto';
import { BulkUpdateTimesheetDto } from './update-bulk-dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';

@ApiTags('Timesheet')
@Controller('timesheet')
export class TimesheetController {
  constructor(private readonly timesheetService: TimesheetService) {}

  @Post()
  @ApiOperation({ summary: 'Add a new timesheet for a year' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Timesheet added successfully' })
  @ApiBody({
    type: CreateTimesheetDto,
    examples: {
      example1: {
        summary: 'Sample payload for adding a timesheet',
        value: {
          year: 2024,
          days: [
            { date: '2024-01-01', date_type: 'working', working_hour: 8 },
            { date: '2024-01-02', date_type: 'vacation', working_hour: 0 }
          ]
        }
      }
    }
  })
  async addTimesheet(@Body() data: CreateTimesheetDto) {
    return this.timesheetService.addTimesheet(data);
  }

  // @Get()
  // @ApiOperation({ summary: 'Get all timesheets' })
  // @ApiResponse({ status: HttpStatus.OK, description: 'List of all timesheets retrieved successfully' })
  // async getAllTimesheets() {
  //   return this.timesheetService.getAllTimesheets();
  // }

  @Get(':year')
  @ApiOperation({ summary: 'Get timesheet for a specific year' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Timesheet for the specified year retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Timesheet for the specified year not found' })
  @ApiParam({ name: 'year', example: '2024', description: 'Year of the timesheet to retrieve' })
  async getTimesheetByYear(@Param('year') year: number) {
    return this.timesheetService.getTimesheetByYear(year);
  }

  // @Put('/day/:date')
  // @ApiOperation({ summary: 'Update a specific timesheet day' })
  // @ApiResponse({ status: HttpStatus.OK, description: 'Timesheet day updated successfully' })
  // @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Timesheet entry for given date not found' })
  // @ApiBody({
  //   type: UpdateTimesheetEntryDto,
  //   examples: {
  //     example1: {
  //       summary: 'Update a timesheet day',
  //       value: {
  //         date_type: 'sick',
  //         working_hour: 0
  //       }
  //     }
  //   }
  // })
  // @ApiParam({ name: 'date', example: '2024-01-01', description: 'Date of the timesheet entry to update' })
  // async updateTimesheetDay(
  //   @Param('date') date: string,
  //   @Body() updateData: UpdateTimesheetEntryDto,
  // ) {
  //   return this.timesheetService.updateTimesheetDay(date, updateData);
  // }

  @Put('/bulk-update')
  @ApiOperation({ summary: 'Bulk update multiple timesheet days' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Timesheet days updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Some dates not found in the timesheet' })
  @ApiBody({
    type: BulkUpdateTimesheetDto,
    examples: {
      example1: {
        summary: 'Bulk update timesheet days',
        value: {
          updates: [
            { date: '2024-01-01', date_type: 'working', working_hour: 7 },
            { date: '2024-01-02', date_type: 'sick', working_hour: 0 }
          ]
        }
      }
    }
  })
  async bulkUpdateTimesheetDays(@Body() bulkUpdateDto: BulkUpdateTimesheetDto) {
    return this.timesheetService.bulkUpdateTimesheetDays(bulkUpdateDto.updates);
  }
}