import { 
  Injectable, 
  NotFoundException, 
  HttpException, 
  HttpStatus 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TimesheetDay } from './timesheet.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TimesheetService {
  constructor(
    @InjectRepository(TimesheetDay)
    private readonly timesheetDayRepo: Repository<TimesheetDay>,
  ) {}

  async addTimesheet(data: { year: number; days: any[] }) {
    const { year, days } = data;
  
    // Log the incoming data for debugging
    console.log('Received data:', data);
  
    // Check if days is an array
    if (!Array.isArray(days)) {
      throw new HttpException('Days must be an array', HttpStatus.BAD_REQUEST);
    }
  
    let totalVacation = 0;
    let totalSick = 0;
    let totalWorkingHours = 0;
  
    const timesheetDays = days.map((day) => {
      if (day.date_type === 'vacation') totalVacation++;
      if (day.date_type === 'sick') totalSick++;
      if (day.date_type === 'working') totalWorkingHours += day.working_hour;
  
      return this.timesheetDayRepo.create({
        date: day.date,
        year,
        date_type: day.date_type,
        working_hour: day.working_hour,
      });
    });
  
    await this.timesheetDayRepo.save(timesheetDays);
  
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Timesheet added successfully',
      data: {
        year,
        total_vacation_leaves: totalVacation,
        total_sick_leaves: totalSick,
        total_working_hours: totalWorkingHours,
        days: timesheetDays,
      },
    };
  }

  async getAllTimesheets() {
    const timesheetDays = await this.timesheetDayRepo.find();

    const groupedByYear = timesheetDays.reduce((acc, day) => {
      if (!acc[day.year]) {
        acc[day.year] = {
          year: day.year,
          total_vacation_leaves: 0,
          total_sick_leaves: 0,
          total_working_hours: 0,
          months: {}, // Initialize months object
        };
      }

      // Update totals
      if (day.date_type === 'vacation') acc[day.year].total_vacation_leaves++;
      if (day.date_type === 'sick') acc[day.year].total_sick_leaves++;
      if (day.date_type === 'working') acc[day.year].total_working_hours += day.working_hour;

      // Group by month
      const month = new Date(day.date).toLocaleString('default', { month: 'long' });
      if (!acc[day.year].months[month]) {
        acc[day.year].months[month] = {
          total_vacation_leaves: 0,
          total_sick_leaves: 0,
          total_working_hours: 0,
          days: [],
        };
      }

      // Update monthly totals
      if (day.date_type === 'vacation') acc[day.year].months[month].total_vacation_leaves++;
      if (day.date_type === 'sick') acc[day.year].months[month].total_sick_leaves++;
      if (day.date_type === 'working') acc[day.year].months[month].total_working_hours += day.working_hour;

      // Add the day to the respective month
      acc[day.year].months[month].days.push(day);

      return acc;
    }, {});

    return {
      statusCode: HttpStatus.OK,
      message: 'Timesheets fetched successfully',
      data: Object.values(groupedByYear),
    };
  }

  async getTimesheetByYear(year: number) {
    const timesheetDays = await this.timesheetDayRepo.find({ where: { year } });

    if (!timesheetDays.length) {
      throw new NotFoundException(`Timesheet for year ${year} not found`);
    }

    const totalVacation = timesheetDays.filter(day => day.date_type === 'vacation').length;
    const totalSick = timesheetDays.filter(day => day.date_type === 'sick').length;
    const totalWorkingHours = timesheetDays.reduce((total, day) => {
      return total + (day.date_type === 'working' ? day.working_hour : 0);
    }, 0);

    // Group by month
    const groupedByMonth = timesheetDays.reduce((acc, day) => {
      const month = new Date(day.date).toLocaleString('default', { month: 'long' });
      if (!acc[month]) {
        acc[month] = {
          total_vacation_leaves: 0,
          total_sick_leaves: 0,
          total_working_hours: 0,
          days: [],
        };
      }

      // Update monthly totals
      if (day.date_type === 'vacation') acc[month].total_vacation_leaves++;
      if (day.date_type === 'sick') acc[month].total_sick_leaves++;
      if (day.date_type === 'working') acc[month].total_working_hours += day.working_hour;

      // Add the day to the respective month
      acc[month].days.push(day);

      return acc;
    }, {});

    return {
      statusCode: HttpStatus.OK,
      message: `Timesheet for year ${year} fetched successfully`,
      data: {
        year,
        total_vacation_leaves: totalVacation,
        total_sick_leaves: totalSick,
        total_working_hours: totalWorkingHours,
        months: groupedByMonth,
      },
    };
  }

  async updateTimesheetDay(date: string, updateData: { date_type?: string; working_hour?: number }) {
    const day = await this.timesheetDayRepo.findOne({ where: { date } });

    if (!day) {
      throw new HttpException(
        { statusCode: HttpStatus.NOT_FOUND, message: `Timesheet entry for date ${date} not found` },
        HttpStatus.NOT_FOUND,
      );
    }

    // Adjust previous values
    if (day.date_type === 'working') day.working_hour -= day.working_hour;
    if (day.date_type === 'vacation') day.date_type = 'vacation';
    if (day.date_type === 'sick') day.date_type = 'sick';

    // Update new values
    if (updateData.date_type) day.date_type = updateData.date_type;
    if (updateData.working_hour !== undefined) day.working_hour = updateData.working_hour;

    await this.timesheetDayRepo.save(day);

    return {
      statusCode: HttpStatus.OK,
      message: `Timesheet entry for ${date} updated successfully`,
      data: day,
    };
  }

  async bulkUpdateTimesheetDays(updates: { date: string; date_type?: string; working_hour?: number }[]) {
    const updatedDays: TimesheetDay[] = [];

    for (const updateData of updates) {
      const day = await this.timesheetDayRepo.findOne({ where: { date: updateData.date } });

      if (!day) {
        throw new HttpException(
          { statusCode: HttpStatus.NOT_FOUND, message: `Timesheet entry for date ${updateData.date} not found` },
          HttpStatus.NOT_FOUND,
        );
      }

      // Adjust previous values
      if (day.date_type === 'working') day.working_hour -= day.working_hour;
      if (day.date_type === 'vacation') day.date_type = 'vacation';
      if (day.date_type === 'sick') day.date_type = 'sick';

      // Update new values
      if (updateData.date_type) day.date_type = updateData.date_type;
      if (updateData.working_hour !== undefined) day.working_hour = updateData.working_hour;

      updatedDays.push(day);
    }

    await this.timesheetDayRepo.save(updatedDays);

    return {
      statusCode: HttpStatus.OK,
      message: 'Timesheet days updated successfully',
      updatedEntries: updatedDays.length,
    };
  }
}
