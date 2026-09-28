import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { isValidEmail, passwordError } from '../utils/security.js';

dotenv.config();

const { MONGO_URI, ADMIN_EMAIL, ADMIN_NEW_PASSWORD } = process.env;
if (!MONGO_URI || !ADMIN_EMAIL || !ADMIN_NEW_PASSWORD) {
  throw new Error('MONGO_URI, ADMIN_EMAIL e ADMIN_NEW_PASSWORD sao obrigatorios');
}
if (!isValidEmail(ADMIN_EMAIL.trim())) {
  throw new Error('ADMIN_EMAIL invalido');
}
const erroSenha = passwordError(ADMIN_NEW_PASSWORD);
if (erroSenha) throw new Error(erroSenha);

try {
  await mongoose.connect(MONGO_URI);
  const admin = await User.findOne({
    email: ADMIN_EMAIL.trim().toLowerCase(),
    role: 'admin'
  }).select('+senha');
  if (!admin) throw new Error('Administrador configurado em ADMIN_EMAIL nao encontrado');
  if (await admin.compararSenha(ADMIN_NEW_PASSWORD)) {
    throw new Error('ADMIN_NEW_PASSWORD deve ser diferente da senha atual');
  }

  admin.senha = ADMIN_NEW_PASSWORD;
  admin.trocarSenha = true;
  admin.tokenVersion += 1;
  await admin.save();
  console.log('Senha do administrador redefinida; todas as sessoes anteriores foram revogadas.');
} catch (err) {
  console.error('Falha ao redefinir a senha do administrador:', err);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
