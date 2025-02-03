import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity('timesheet_days')
export class TimesheetDay {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: string;

  @Column()
  year: number; // Add year directly to the TimesheetDay entity

  @Column()
  date_type: string; // "working", "sick", "vacation"

  @Column({ default: 0 })
  working_hour: number;
}