import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { Timesheet, TimesheetDay } from "modules/timesheet/timesheet.entity";

export const typeOrmConfig: TypeOrmModuleOptions = {
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'Sujalangi12@#',
    database: 'quiz',
    entities: [Timesheet,TimesheetDay],
    synchronize: true,
}