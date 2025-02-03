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

    return timesheets.map(timesheet => {
      const totalVacation = timesheet.total_vacation_leaves;
      const totalSick = timesheet.total_sick_leaves;
      const totalWorkingHours = this.calculateTotalWorkingHours(timesheet.days);
      
      // Group days by month
      const groupedDays = this.groupDaysByMonth(timesheet.days);

      return {
        statusCode: HttpStatus.OK,
        message: 'Timesheet fetched successfully',
        data: {
          id: timesheet.id, // Assuming you have an ID field in your Timesheet entity
          year: timesheet.year,
          total_vacation_leaves: totalVacation,
          total_sick_leaves: totalSick,
          total_working_hours: totalWorkingHours,
          days: groupedDays,
        },
      };
    });
  }

  private groupDaysByMonth(days: TimesheetDay[]) {
    const months = {};

    days.forEach(day => {
      const month = new Date(day.date).toLocaleString('default', { month: 'long' });
      if (!months[month]) {
        months[month] = {
          total_vacation_leaves: 0,
          total_sick_leaves: 0,
          total_working_hours: 0,
          days: [],
        };
      }

      // Increment totals based on the day type
      if (day.date_type === 'working') {
        months[month].total_working_hours += day.working_hour;
      } else if (day.date_type === 'vacation') {
        months[month].total_vacation_leaves++;
      } else if (day.date_type === 'sick') {
        months[month].total_sick_leaves++;
      }

      // Add the day to the corresponding month
      months[month].days.push({
        id: day.id, // Assuming you have an ID field in your TimesheetDay entity
        date: day.date,
        date_type: day.date_type,
        working_hour: day.working_hour,
      });
    });

    return months;
  }

  private calculateTotalWorkingHours(days: TimesheetDay[]) {
    return days.reduce((total, day) => {
      if (day.date_type === 'working') {
        return total + day.working_hour;
      }
      return total;
    }, 0);
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

  async getTimesheetByYear(year: number) {
    const timesheet = await this.timesheetRepo.findOne({
      where: { year },
      relations: ['days'],
    });

    if (!timesheet) {
      throw new NotFoundException(`Timesheet for year ${year} not found`);
    }

    const totalVacation = timesheet.total_vacation_leaves;
    const totalSick = timesheet.total_sick_leaves;
    const totalWorkingHours = this.calculateTotalWorkingHours(timesheet.days);
    
    // Group days by month
    const groupedDays = this.groupDaysByMonth(timesheet.days);

    return {
      statusCode: HttpStatus.OK,
      message: `Timesheet for year ${year} fetched successfully`,
      data: {
        id: timesheet.id, // Assuming you have an ID field in your Timesheet entity
        year: timesheet.year,
        total_vacation_leaves: totalVacation,
        total_sick_leaves: totalSick,
        total_working_hours: totalWorkingHours,
        days: groupedDays,
      },
    };
  }
}
