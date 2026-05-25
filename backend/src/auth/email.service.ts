import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend | null = null;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');

    if (apiKey && !apiKey.includes('re_placeholder')) {
      this.resend = new Resend(apiKey);
      this.logger.log('📧 EmailService configurado via Resend API.');
    } else {
      this.logger.warn(
        '⚠️ RESEND_API_KEY não configurado — emails serão ignorados. Adicione no Railway.',
      );
    }
  }

  async sendPasswordResetEmail(
    toEmail: string,
    toName: string,
    code: string,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.warn(
        `📭 Email para ${toEmail} ignorado: Resend não configurado.`,
      );
      return;
    }

    const from =
      this.configService.get<string>('EMAIL_FROM') ||
      'Trancadura <onboarding@resend.dev>';

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recuperação de Senha</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f0f13; font-family: 'Segoe UI', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="min-height: 100vh; background-color: #0f0f13;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.7); letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">Sistema de Acesso</p>
              <h1 style="margin: 8px 0 0 0; font-size: 28px; color: #ffffff; font-weight: 700; letter-spacing: -0.5px;">Trancadura</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color: #1a1a2e; padding: 36px 36px 28px; border-radius: 0 0 16px 16px;">
              <p style="margin: 0 0 8px 0; font-size: 22px; font-weight: 600; color: #ffffff;">Recuperação de Senha</p>
              <p style="margin: 0 0 28px 0; font-size: 15px; color: #9ca3af; line-height: 1.6;">
                Olá, <strong style="color: #c4c4d4;">${toName}</strong>. Recebemos uma solicitação para redefinir a senha da sua conta. Use o código abaixo:
              </p>

              <!-- OTP Code -->
              <div style="background: linear-gradient(135deg, #6366f115, #8b5cf615); border: 1px solid #6366f140; border-radius: 12px; padding: 28px; text-align: center; margin-bottom: 28px;">
                <p style="margin: 0 0 12px 0; font-size: 12px; color: #9ca3af; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">Seu código de verificação</p>
                <p style="margin: 0; font-size: 44px; font-weight: 800; letter-spacing: 12px; color: #a78bfa; font-family: 'Courier New', monospace;">${code}</p>
              </div>

              <!-- Expiration warning -->
              <div style="background-color: #27272a; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; color: #facc15;">
                  ⏱️ <strong>Este código expira em 15 minutos.</strong> Não o compartilhe com ninguém.
                </p>
              </div>

              <p style="margin: 0 0 6px 0; font-size: 13px; color: #6b7280; line-height: 1.6;">
                Se você não solicitou a recuperação de senha, ignore este email com segurança. Sua senha não será alterada.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #4b5563;">
                © ${new Date().getFullYear()} Trancadura · Morea-IFS. Este é um email automático.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    const { data, error } = await this.resend.emails.send({
      from,
      to: toEmail,
      subject: `${code} é seu código de recuperação — Trancadura`,
      html,
    });

    if (error) {
      throw new Error(`Resend error: ${JSON.stringify(error)}`);
    }

    this.logger.log(`📧 Email enviado via Resend para ${toEmail} | ID: ${data?.id}`);
  }
}
