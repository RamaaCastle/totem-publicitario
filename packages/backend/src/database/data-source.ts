import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../../../.env') });

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: 'magna-pedraza.dnsalias.com',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4',
  timezone: 'Z',
  entities: [join(__dirname, 'entities/**/*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations/**/*.{ts,js}')],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
