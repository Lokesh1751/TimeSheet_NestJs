import { IsDateString, IsOptional, IsString, IsNumber } from 'class-validator';

export class UpdateTimesheetEntryDto {
  @IsDateString()
  date: string;  // Now, date is a required string (not null)

  @IsOptional()
  @IsString()
  date_type?: string; // "working", "sick", "vacation"

  @IsOptional()
  @IsNumber()
  working_hour?: number;
}
