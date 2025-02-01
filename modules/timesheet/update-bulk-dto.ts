import { IsArray } from 'class-validator';
import { UpdateTimesheetEntryDto } from './update-timesheet-dto';

export class BulkUpdateTimesheetDto {
  @IsArray()
  updates: UpdateTimesheetEntryDto[];
}
