import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private apiKeyPublic: string | null = null;
  private apiKeyPrivate: string | null = null;
  private fromEmail = 'officegenisson@gmail.com';
  private fromName = 'Trancadura';

  constructor(private configService: ConfigService) {
    const pub = this.configService.get<string>('MAILJET_API_KEY') || '';
    const priv = this.configService.get<string>('MAILJET_API_SECRET') || '';

    if (pub && priv) {
      this.apiKeyPublic = pub;
      this.apiKeyPrivate = priv;

      const fromRaw = this.configService.get<string>('EMAIL_FROM') || '';
      const match = fromRaw.match(/^"?(.+?)"?\s*<(.+)>$/);
      if (match) {
        this.fromName = match[1].trim();
        this.fromEmail = match[2].trim();
      }

      this.logger.log(`📧 EmailService configurado via Mailjet (from: ${this.fromEmail})`);
    } else {
      this.logger.warn('⚠️ MAILJET_API_KEY / MAILJET_API_SECRET não configurados — emails serão ignorados.');
    }
  }

  async sendPasswordResetEmail(
    toEmail: string,
    toName: string,
    code: string,
  ): Promise<void> {
    if (!this.apiKeyPublic || !this.apiKeyPrivate) {
      this.logger.warn(`📭 Email para ${toEmail} ignorado: Mailjet não configurado.`);
      return;
    }

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
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.7); letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">Sistema de Acesso</p>
              <h1 style="margin: 8px 0 0 0; font-size: 28px; color: #ffffff; font-weight: 700; letter-spacing: -0.5px;">Trancadura</h1>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1a1a2e; padding: 36px 36px 28px; border-radius: 0 0 16px 16px;">
              <p style="margin: 0 0 8px 0; font-size: 22px; font-weight: 600; color: #ffffff;">Recuperação de Senha</p>
              <p style="margin: 0 0 28px 0; font-size: 15px; color: #9ca3af; line-height: 1.6;">
                Olá, <strong style="color: #c4c4d4;">${toName}</strong>. Recebemos uma solicitação para redefinir a senha da sua conta. Use o código abaixo:
              </p>
              <div style="background: linear-gradient(135deg, #6366f115, #8b5cf615); border: 1px solid #6366f140; border-radius: 12px; padding: 28px; text-align: center; margin-bottom: 28px;">
                <p style="margin: 0 0 12px 0; font-size: 12px; color: #9ca3af; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">Seu código de verificação</p>
                <p style="margin: 0; font-size: 44px; font-weight: 800; letter-spacing: 12px; color: #a78bfa; font-family: 'Courier New', monospace;">${code}</p>
              </div>
              <div style="background-color: #27272a; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; color: #facc15;">
                  ⏱️ <strong>Este código expira em 15 minutos.</strong> Não o compartilhe com ninguém.
                </p>
              </div>
              <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.6;">
                Se você não solicitou a recuperação de senha, ignore este email com segurança.
              </p>
            </td>
          </tr>
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

    const response = await axios.post(
      'https://api.mailjet.com/v3.1/send',
      {
        Messages: [
          {
            From: { Email: this.fromEmail, Name: this.fromName },
            To: [{ Email: toEmail, Name: toName }],
            Subject: `${code} é seu código de recuperação — Trancadura`,
            HTMLPart: html,
          },
        ],
      },
      {
        auth: {
          username: this.apiKeyPublic,
          password: this.apiKeyPrivate,
        },
        timeout: 10000,
      },
    );

    const status = response.data?.Messages?.[0]?.Status;
    this.logger.log(`📧 Email via Mailjet para ${toEmail} | Status: ${status}`);

    if (status !== 'success') {
      throw new Error(`Mailjet retornou status: ${status}`);
    }
  }
}
