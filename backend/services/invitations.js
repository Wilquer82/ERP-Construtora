import PasswordReset from '../models/PasswordReset.js';
import { sendEmail } from './email.js';
import { criarTokenDeSenha } from './passwordTokens.js';

export async function sendInvitation(user, { expiresInDays = 7, actorId } = {}) {
  const invitationToken = await criarTokenDeSenha(
    user._id,
    new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
    user.empresa,
    actorId
  );
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const invitationLink = `${frontendUrl.replace(/\/$/, '')}/reset-senha?token=${encodeURIComponent(invitationToken)}`;

  try {
    await sendEmail({
      to: user.email,
      subject: 'Convite para acessar o Constru-ERP',
      text: `O administrador convidou voce para acessar o Constru-ERP. Defina sua senha neste link (valido por ${expiresInDays} dias):\n${invitationLink}`
    });
  } catch (err) {
    await PasswordReset.deleteMany({ userId: user._id, usado: false });
    throw err;
  }
}
