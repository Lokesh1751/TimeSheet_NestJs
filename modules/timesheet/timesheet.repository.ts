import { EntityRepository, Repository } from 'typeorm';
import { TimesheetDay } from './timesheet.entity';

@EntityRepository(TimesheetDay)
export class TimesheetRepository extends Repository<TimesheetDay> {}
