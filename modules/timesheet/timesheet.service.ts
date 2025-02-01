import { Injectable, NotFoundException } from '@nestjs/common';
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

    return this.timesheetRepo.save(timesheet);
  }

  async getAllTimesheets() {
    const timesheets = await this.timesheetRepo.find({
      relations: ['days'],
    });

    const timesheetMap = new Map();

    timesheets.forEach(timesheet => {
      const { year, total_vacation_leaves, total_sick_leaves, total_working_hours, days } = timesheet;

      if (!timesheetMap.has(year)) {
        timesheetMap.set(year, {
          year,
          total_vacation: 0,
          total_sick: 0,
          total_working_hours: 0,
          months: {}
        });
      }

      const yearData = timesheetMap.get(year);
      yearData.total_vacation += total_vacation_leaves;
      yearData.total_sick += total_sick_leaves;
      yearData.total_working_hours += total_working_hours;

      days.forEach(day => {
        const month = new Date(day.date).toLocaleString('default', { month: 'long' });

        if (!yearData.months[month]) {
          yearData.months[month] = {
            total_vacation_leaves: 0,
            total_sick_leaves: 0,
            total_working_hours: 0,
            days: []
          };
        }

        if (day.date_type === 'vacation') yearData.months[month].total_vacation_leaves++;
        if (day.date_type === 'sick') yearData.months[month].total_sick_leaves++;
        if (day.date_type === 'working') yearData.months[month].total_working_hours += day.working_hour;

        yearData.months[month].days.push({
          date: day.date,
          day_type: day.date_type,
          working_hour: day.working_hour
        });
      });
    });

    return Array.from(timesheetMap.values());
  }

  async updateTimesheetDay(date: string, updateData: {date:string, date_type?: string; working_hour?: number }) {
    const day = await this.timesheetDayRepo.findOne({ where: { date }, relations: ['timesheet'] });

    if (!day) {
      throw new NotFoundException(`Timesheet entry for date ${date} not found`);
    }

    const timesheet = day.timesheet;
    if (!timesheet) {
      throw new NotFoundException(`Timesheet not found for the given day`);
    }

    if (day.date_type === 'working') timesheet.total_working_hours -= day.working_hour;
    if (day.date_type === 'vacation') timesheet.total_vacation_leaves--;
    if (day.date_type === 'sick') timesheet.total_sick_leaves--;

    if (updateData.date_type) day.date_type = updateData.date_type;
    if (updateData.working_hour !== undefined) day.working_hour = updateData.working_hour;

    if (day.date_type === 'working') timesheet.total_working_hours += day.working_hour;
    if (day.date_type === 'vacation') timesheet.total_vacation_leaves++;
    if (day.date_type === 'sick') timesheet.total_sick_leaves++;

    await this.timesheetDayRepo.save(day);
    return this.timesheetRepo.save(timesheet);
  }

  async bulkUpdateTimesheetDays(updates: { date: string; date_type?: string; working_hour?: number }[]) {
    const updatedDays : TimesheetDay[] = [];
    const timesheetUpdates = new Map<number, Timesheet>();

    for (const updateData of updates) {
      const day = await this.timesheetDayRepo.findOne({ where: { date: updateData.date }, relations: ['timesheet'] });

      if (!day) {
        throw new NotFoundException(`Timesheet entry for date ${updateData.date} not found`);
      }

      const timesheet = day.timesheet;
      if (!timesheet) {
        throw new NotFoundException(`Timesheet not found for the given day`);
      }

      if (!timesheetUpdates.has(timesheet.id)) {
        timesheetUpdates.set(timesheet.id, timesheet);
      }

      if (day.date_type === 'working') timesheet.total_working_hours -= day.working_hour;
      if (day.date_type === 'vacation') timesheet.total_vacation_leaves--;
      if (day.date_type === 'sick') timesheet.total_sick_leaves--;

      if (updateData.date_type) day.date_type = updateData.date_type;
      if (updateData.working_hour !== undefined) day.working_hour = updateData.working_hour;

      if (day.date_type === 'working') timesheet.total_working_hours += day.working_hour;
      if (day.date_type === 'vacation') timesheet.total_vacation_leaves++;
      if (day.date_type === 'sick') timesheet.total_sick_leaves++;

      updatedDays.push(day);
    }

    await this.timesheetDayRepo.save(updatedDays);
    await this.timesheetRepo.save(Array.from(timesheetUpdates.values()));

    return { message: 'Timesheet days updated successfully' };
  }
}
