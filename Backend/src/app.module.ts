import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { UsuariosModule } from './usuarios/usuarios.module';
import { TrabajadoresModule } from './trabajadores/trabajadores.module';
import { SolicitudesModule } from './solicitudes/solicitudes.module';
import { TrabajosModule } from './trabajos/trabajos.module';
<<<<<<< HEAD
import { PagosModule } from './pagos/pagos.module';
import { CalificacionesModule } from './calificaciones/calificaciones.module';
import { ReclamosModule } from './reclamos/reclamos.module';
=======
import { AuthModule } from './auth/auth.module';
import { CatalogosModule } from './catalogos/catalogos.module';
>>>>>>> 717716786baf2185b23c692d14cdb44219e30c53

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    UsuariosModule,
    AuthModule,
    CatalogosModule,
    TrabajadoresModule,
    SolicitudesModule,
    TrabajosModule,
    PagosModule,
    CalificacionesModule,
    ReclamosModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: Number(configService.get<string>('DB_PORT')),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}