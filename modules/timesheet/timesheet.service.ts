import { 
  Injectable, 
  NotFoundException, 
  HttpException, 
  HttpStatus 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Timesheet, TimesheetDay } from './timesheet.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TimesheetService {
  constructor(
    @InjectRepository(Timesheet)
    private readonly timesheetRepo: Repository<Timesheet>,
    @InjectRepository(TimesheetDay)
    private readonly timesheetDayRepo: Repository<TimesheetDay>,
  ) {}

  async addTimesheet(data: { year: number; days: any[] }) {
    const { year, days } = data;

    let timesheet = await this.timesheetRepo.findOne({
      where: { year },
      relations: ['days'],
    });

    let totalVacation = 0;
    let totalSick = 0;
    let totalWorkingHours = 0;

    const timesheetDays = days.map((day) => {
      if (day.date_type === 'vacation') totalVacation++;
      if (day.date_type === 'sick') totalSick++;
      if (day.date_type === 'working') totalWorkingHours += day.working_hour;

      return this.timesheetDayRepo.create({
        date: day.date,
        date_type: day.date_type,
        working_hour: day.working_hour,
      });
    });

    if (timesheet) {
      timesheet.total_vacation_leaves += totalVacation;
      timesheet.total_sick_leaves += totalSick;
      timesheet.total_working_hours += totalWorkingHours;
      timesheet.days.push(...timesheetDays);
    } else {
      timesheet = this.timesheetRepo.create({
        year,
        total_vacation_leaves: totalVacation,
        total_sick_leaves: totalSick,
        total_working_hours: totalWorkingHours,
        days: timesheetDays,
      });
    }

    await this.timesheetRepo.save(timesheet);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Timesheet added successfully',
      data: timesheet,
    };
  }

  async getAllTimesheets() {
    const timesheets = await this.timesheetRepo.find({
      relations: ['days'],
    });

    if (!timesheets.length) {
      throw new HttpException(
        { statusCode: HttpStatus.NOT_FOUND, message: 'No timesheets found' },
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      statusCode: HttpStatus.OK,
      message: 'Timesheets retrieved successfully',
      data: timesheets,
    };
  }

  async updateTimesheetDay(date: string, updateData: { date: string; date_type?: string; working_hour?: number }) {
    const day = await this.timesheetDayRepo.findOne({ where: { date }, relations: ['timesheet'] });

    if (!day) {
      throw new HttpException(
        { statusCode: HttpStatus.NOT_FOUND, message: `Timesheet entry for date ${date} not found` },
        HttpStatus.NOT_FOUND,
      );
    }

    const timesheet = day.timesheet;
    if (!timesheet) {
      throw new HttpException(
        { statusCode: HttpStatus.NOT_FOUND, message: 'Timesheet not found for the given day' },
        HttpStatus.NOT_FOUND,
      );
    }

    // Adjust previous values
    if (day.date_type === 'working') timesheet.total_working_hours -= day.working_hour;
    if (day.date_type === 'vacation') timesheet.total_vacation_leaves--;
    if (day.date_type === 'sick') timesheet.total_sick_leaves--;

    // Update new values
    if (updateData.date_type) day.date_type = updateData.date_type;
    if (updateData.working_hour !== undefined) day.working_hour = updateData.working_hour;

    if (day.date_type === 'working') timesheet.total_working_hours += day.working_hour;
    if (day.date_type === 'vacation') timesheet.total_vacation_leaves++;
    if (day.date_type === 'sick') timesheet.total_sick_leaves++;

    await this.timesheetDayRepo.save(day);
    await this.timesheetRepo.save(timesheet);

    return {
      statusCode: HttpStatus.OK,
      message: `Timesheet entry for ${date} updated successfully`,
      data: day,
    };
  }

  async bulkUpdateTimesheetDays(updates: { date: string; date_type?: string; working_hour?: number }[]) {
    const updatedDays: TimesheetDay[] = [];
    const timesheetUpdates = new Map<number, Timesheet>();

    for (const updateData of updates) {
      const day = await this.timesheetDayRepo.findOne({ where: { date: updateData.date }, relations: ['timesheet'] });

      if (!day) {
        throw new HttpException(
          { statusCode: HttpStatus.NOT_FOUND, message: `Timesheet entry for date ${updateData.date} not found` },
          HttpStatus.NOT_FOUND,
        );
      }

      const timesheet = day.timesheet;
      if (!timesheet) {
        throw new HttpException(
          { statusCode: HttpStatus.NOT_FOUND, message: 'Timesheet not found for the given day' },
          HttpStatus.NOT_FOUND,
        );
      }

      if (!timesheetUpdates.has(timesheet.id)) {
        timesheetUpdates.set(timesheet.id, timesheet);
      }

      // Adjust previous values
      if (day.date_type === 'working') timesheet.total_working_hours -= day.working_hour;
      if (day.date_type === 'vacation') timesheet.total_vacation_leaves--;
      if (day.date_type === 'sick') timesheet.total_sick_leaves--;

      // Update new values
      if (updateData.date_type) day.date_type = updateData.date_type;
      if (updateData.working_hour !== undefined) day.working_hour = updateData.working_hour;

      if (day.date_type === 'working') timesheet.total_working_hours += day.working_hour;
      if (day.date_type === 'vacation') timesheet.total_vacation_leaves++;
      if (day.date_type === 'sick') timesheet.total_sick_leaves++;

      updatedDays.push(day);
    }

    await this.timesheetDayRepo.save(updatedDays);
    await this.timesheetRepo.save(Array.from(timesheetUpdates.values()));

    return {
      statusCode: HttpStatus.OK,
      message: 'Timesheet days updated successfully',
      updatedEntries: updatedDays.length,
    };
  }
}
