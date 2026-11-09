
import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller()
export class AppController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('health/database')
  async checkDatabase() {
    await this.dataSource.query('SELECT 1');

    return {
      mensaje: 'Conexión con PostgreSQL exitosa',
      baseDatos: this.dataSource.options.database,
      estado: 'conectado',
    };
  }
}
