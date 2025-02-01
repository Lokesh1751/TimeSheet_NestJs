// src/modules/timesheet/dto/create-timesheet.dto.ts
import { IsArray, IsNumber, IsString } from 'class-validator';

export class CreateTimesheetDto {
  @IsNumber()
  year: number;

  @IsArray()
  days: {

    date: string;

    date_type: string; // "working", "sick", "vacation"

    working_hour: number;
  }[];
}