import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('timesheets')
export class Timesheet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  year: number;

  @Column({ default: 0 })
  total_vacation_leaves: number;

  @Column({ default: 0 })
  total_sick_leaves: number;

  @Column({ default: 0 })
  total_working_hours: number;

  @OneToMany(() => TimesheetDay, (day) => day.timesheet, { cascade: true })
  days: TimesheetDay[];
}

@Entity('timesheet_days')
export class TimesheetDay {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Timesheet, (timesheet) => timesheet.days, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'timesheet_id' })
  timesheet: Timesheet;

  @Column({ type: 'date' })
  date: string;

  @Column()
  date_type: string; // "working", "sick", "vacation"

  @Column({ default: 0 })
  working_hour: number;
}
