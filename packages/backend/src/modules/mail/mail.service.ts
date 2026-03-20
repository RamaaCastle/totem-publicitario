import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('mail.host'),
      port: this.config.get<number>('mail.port'),
      secure: this.config.get<boolean>('mail.secure'), // true = SSL port 465
      auth: {
        user: this.config.get<string>('mail.user'),
        pass: this.config.get<string>('mail.password'),
      },
      tls: { rejectUnauthorized: false },
    });
  }

  async sendVerificationCode(opts: {
    to: string;
    name: string;
    code: string;
    orgName: string;
  }): Promise<void> {
    const fromName    = this.config.get<string>('mail.fromName', 'Signage Platform');
    const fromAddress = this.config.get<string>('mail.fromAddress');
    const from        = `"${fromName}" <${fromAddress}>`;

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Activá tu cuenta</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#1b1a36;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">
                ${opts.orgName}
              </p>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.5);">
                Panel Administrativo
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0f172a;">
                Hola, ${opts.name} 👋
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.6;">
                Tu cuenta fue creada en <strong>${opts.orgName}</strong>. Para activarla, ingresá el siguiente código en la pantalla de verificación:
              </p>

              <!-- Code box -->
              <div style="text-align:center;margin:0 0 28px;">
                <div style="display:inline-block;background:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;padding:20px 40px;">
                  <span style="font-size:40px;font-weight:800;letter-spacing:0.18em;color:#1b1a36;">
                    ${opts.code}
                  </span>
                </div>
                <p style="margin:12px 0 0;font-size:13px;color:#94a3b8;">
                  Válido por <strong>30 minutos</strong>
                </p>
              </div>

              <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
                Si no esperabas este correo, podés ignorarlo. Nadie puede activar la cuenta sin el código.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#cbd5e1;">
                ${opts.orgName} · Panel Administrativo &mdash; Acceso restringido
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    try {
      await this.transporter.sendMail({
        from,
        to: opts.to,
        subject: `${opts.code} — Código de activación · ${opts.orgName}`,
        html,
      });
      this.logger.log(`Verification email sent to ${opts.to}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${opts.to}: ${err.message}`);
      throw err;
    }
  }

  async sendPasswordChanged(opts: { to: string; name: string; orgName: string }): Promise<void> {
    const fromName    = this.config.get<string>('mail.fromName', 'Signage Platform');
    const fromAddress = this.config.get<string>('mail.fromAddress');
    const from        = `"${fromName}" <${fromAddress}>`;

    const dateStr = new Date().toLocaleString('es-AR', {
      dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Argentina/Buenos_Aires',
    });

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1b1a36;padding:32px 40px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">${opts.orgName}</p>
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.5);">Panel Administrativo</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Contraseña actualizada</p>
            <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">
              Hola <strong>${opts.name}</strong>, tu contraseña fue cambiada el <strong>${dateStr}</strong>.
            </p>
            <div style="background:#fef9c3;border:1px solid #fde047;border-radius:10px;padding:16px 20px;">
              <p style="margin:0;font-size:13px;color:#854d0e;line-height:1.6;">
                Si no realizaste este cambio, contactá de inmediato al administrador del sistema.
              </p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;font-size:12px;color:#cbd5e1;">${opts.orgName} · Panel Administrativo</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    try {
      await this.transporter.sendMail({
        from,
        to: opts.to,
        subject: `Contraseña actualizada · ${opts.orgName}`,
        html,
      });
      this.logger.log(`Password changed email sent to ${opts.to}`);
    } catch (err) {
      this.logger.error(`Failed to send password changed email to ${opts.to}: ${err.message}`);
      throw err;
    }
  }
}
