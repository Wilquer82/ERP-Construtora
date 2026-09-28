export async function sendEmail({ to, subject, text }) {
  const provider = (process.env.EMAIL_PROVIDER || (process.env.NODE_ENV === 'production' ? 'resend' : 'console')).toLowerCase();
  if (provider === 'console') {
    console.info(`Email de desenvolvimento para ${to}\nAssunto: ${subject}\n${text}`);
    return;
  }

  if (provider !== 'resend') {
    throw new Error(`EMAIL_PROVIDER nao suportado: ${provider}`);
  }
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    throw new Error('RESEND_API_KEY e EMAIL_FROM sao obrigatorios para Resend');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [to],
      subject,
      text
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Falha no envio pelo Resend (${response.status}): ${details}`);
  }
}
