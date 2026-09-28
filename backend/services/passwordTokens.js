import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import PasswordReset from '../models/PasswordReset.js';

export function criarToken() {
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
}

export async function criarTokenDeSenha(userId, expiresAt) {
  const { token, tokenHash } = criarToken();
  await PasswordReset.deleteMany({ userId, usado: false });
  await PasswordReset.create({ userId, tokenHash, expiresAt });
  return token;
}

export async function consumirTokenDeSenha(token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) return null;
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const reset = await PasswordReset.findOne({ tokenHash });
  if (!reset) return null;

  const storedHash = Buffer.from(reset.tokenHash, 'hex');
  const suppliedHash = Buffer.from(tokenHash, 'hex');
  if (storedHash.length !== suppliedHash.length || !timingSafeEqual(storedHash, suppliedHash)) {
    return null;
  }
  if (reset.usado || reset.expiresAt <= new Date()) return null;

  return PasswordReset.findOneAndUpdate(
    { _id: reset._id, usado: false, expiresAt: { $gt: new Date() } },
    { $set: { usado: true } },
    { new: true }
  );
}
