import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { isValidEmail } from '../utils/security.js';

dotenv.config();

const legacyEmail = 'admin@sienge.local';
const targetEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
if (!process.env.MONGO_URI || !targetEmail || !isValidEmail(targetEmail)) {
  throw new Error('MONGO_URI e um ADMIN_EMAIL valido sao obrigatorios');
}

try {
  await mongoose.connect(process.env.MONGO_URI);
  const existingAdmin = await User.findOne({ email: legacyEmail, role: 'admin' });
  if (!existingAdmin) {
    const alreadyMigrated = await User.findOne({ email: targetEmail, role: 'admin' });
    if (alreadyMigrated) {
      console.log('O administrador configurado em ADMIN_EMAIL ja existe; nenhuma alteracao necessaria.');
    } else {
      throw new Error(`Administrador legado ${legacyEmail} nao encontrado`);
    }
  } else {
    const emailInUse = await User.findOne({ email: targetEmail, _id: { $ne: existingAdmin._id } });
    if (emailInUse) throw new Error('ADMIN_EMAIL ja pertence a outra conta; nenhuma alteracao foi feita');

    existingAdmin.email = targetEmail;
    existingAdmin.trocarSenha = true;
    existingAdmin.tokenVersion += 1;
    await existingAdmin.save();
    console.log(`Administrador migrado para ${targetEmail}; todas as sessoes antigas foram revogadas.`);
  }
} catch (err) {
  console.error('Falha ao migrar email do super-admin:', err);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
