import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { UsuariosModule } from './usuarios/usuarios.module';
import { TrabajadoresModule } from './trabajadores/trabajadores.module';
import { SolicitudesModule } from './solicitudes/solicitudes.module';
import { TrabajosModule } from './trabajos/trabajos.module';
import { PagosModule } from './pagos/pagos.module';
import { CalificacionesModule } from './calificaciones/calificaciones.module';
import { ReclamosModule } from './reclamos/reclamos.module';
import { AuthModule } from './auth/auth.module';
import { CatalogosModule } from './catalogos/catalogos.module';
import { SistemaModule } from './sistema/sistema.module';
import { ReportesModule } from './reportes/reportes.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AdministracionModule } from './administracion/administracion.module';
import { TareasModule } from './tareas/tareas.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),   
TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    host: config.get<string>('DB_HOST'),
    port: parseInt(config.get<string>('DB_PORT') ?? '5432', 10),
    username: config.get<string>('DB_USERNAME'),
    password: config.get<string>('DB_PASSWORD'),
    database: config.get<string>('DB_DATABASE'),
    autoLoadEntities: true,
    entities: [__dirname + '/entities/*.{entity,entities}.{ts,js}'],
    synchronize: false,
  }),
}),
    SistemaModule,       
    AuthModule,
    UsuariosModule,
    CatalogosModule,
    TrabajadoresModule,
    SolicitudesModule,
    TrabajosModule,
    PagosModule,
    CalificacionesModule,
    ReclamosModule,
    AdministracionModule,
    ReportesModule,
    TareasModule,
  ],
  controllers: [AppController],
})
export class AppModule {}