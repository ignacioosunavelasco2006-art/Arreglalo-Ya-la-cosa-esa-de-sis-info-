import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class CorreoService {
  private readonly logger = new Logger(CorreoService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: Number(this.configService.get<string>('SMTP_PORT', '587')),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async enviarNotificacion(
    destinatario: string,
    titulo: string,
    mensaje: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_FROM'),
        to: destinatario,
        subject: titulo,
        text: mensaje,
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2>${titulo}</h2>
            <p>${mensaje}</p>
            <p>Arreglalo Ya</p>
          </div>
        `,
      });

      this.logger.log(`Correo enviado a ${destinatario}`);
    } catch (error) {
      // Si falla el correo, no debe perderse la notificación web.
      this.logger.error(
        `No se pudo enviar el correo a ${destinatario}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}