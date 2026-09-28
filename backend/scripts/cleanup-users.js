import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { isValidEmail } from '../utils/security.js';

dotenv.config();

const orphanId = '6a8310e2032ab00c17b0c3d5';
const aplicar = process.argv.includes('--apply');

if (!process.env.MONGO_URI) {
  throw new Error('MONGO_URI e obrigatorio');
}

try {
  await mongoose.connect(process.env.MONGO_URI);
  const users = await User.find({}, '_id email').lean();
  const idsToDelete = users
    .filter((user) => String(user._id) === orphanId || !isValidEmail(user.email))
    .map((user) => user._id);

  if (!aplicar) {
    console.log(`Simulacao: ${idsToDelete.length} usuario(s) seriam removidos.`);
    console.log(`Simulacao: ${users.length} usuario(s) teriam tokenVersion incrementado.`);
    console.log('Execute novamente com --apply para confirmar a alteracao.');
  } else {
    const revocation = await User.updateMany({}, { $inc: { tokenVersion: 1 } });
    const deletion = idsToDelete.length
      ? await User.deleteMany({ _id: { $in: idsToDelete } })
      : { deletedCount: 0 };
    console.log(`${deletion.deletedCount} usuario(s) removidos.`);
    console.log(`${revocation.modifiedCount} tokenVersion(s) incrementado(s).`);
  }
} catch (err) {
  console.error('Falha ao limpar usuarios:', err);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
