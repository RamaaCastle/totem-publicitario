import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

export default registerAs('database', (): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4',
  timezone: 'Z',
  entities: [join(__dirname, '../database/entities/**/*.entity.{ts,js}')],
  migrations: [join(__dirname, '../database/migrations/**/*.{ts,js}')],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
}));
