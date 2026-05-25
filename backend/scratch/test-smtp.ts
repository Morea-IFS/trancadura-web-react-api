/**
 * Script de diagnóstico SMTP
 * Execute com: npx ts-node test-smtp.ts
 * 
 * Coloque suas credenciais abaixo antes de rodar.
 */

import * as nodemailer from 'nodemailer';

// ========== CONFIGURE AQUI ==========
const SMTP_USER = process.env.SMTP_USER || 'seu-email@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || 'sua-app-password';
const SMTP_TO   = process.env.SMTP_TO   || SMTP_USER; // envia para si mesmo
// ====================================

async function main() {
  console.log(`\n🔍 Testando SMTP com usuário: ${SMTP_USER}\n`);

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    connectionTimeout: 5000,
    socketTimeout: 10000,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  // 1. Verifica conexão
  console.log('⏳ Verificando conexão com o servidor SMTP...');
  try {
    await transporter.verify();
    console.log('✅ Conexão SMTP OK!\n');
  } catch (err: any) {
    console.error('❌ Falha na conexão SMTP:');
    console.error(`   Código: ${err.code}`);
    console.error(`   Mensagem: ${err.message}`);
    
    if (err.code === 'EAUTH') {
      console.error('\n💡 Dica: Credenciais inválidas.');
      console.error('   - Verifique se o App Password está correto (sem espaços).');
      console.error('   - Certifique-se que a verificação em 2 etapas está ATIVA.');
      console.error('   - Gere um novo App Password em: https://myaccount.google.com/apppasswords');
    } else if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
      console.error('\n💡 Dica: Problema de rede/firewall ao conectar no smtp.gmail.com:587');
    }
    process.exit(1);
  }

  // 2. Envia email de teste
  console.log(`⏳ Enviando email de teste para: ${SMTP_TO}...`);
  try {
    const info = await transporter.sendMail({
      from: `"Trancadura Teste" <${SMTP_USER}>`,
      to: SMTP_TO,
      subject: '✅ Teste SMTP — Trancadura',
      text: 'Se você recebeu este email, o SMTP está funcionando corretamente!',
      html: `<p>Se você recebeu este email, o SMTP está funcionando! ✅</p><p><strong>Código de teste:</strong> 483921</p>`,
    });
    console.log(`✅ Email enviado com sucesso!`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`\n📬 Verifique sua caixa de entrada (e a pasta de spam) em: ${SMTP_TO}`);
  } catch (err: any) {
    console.error('❌ Falha ao enviar email:');
    console.error(`   ${err.message}`);
    process.exit(1);
  }
}

main();
