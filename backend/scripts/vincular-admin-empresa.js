import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Empresa from '../models/Empresa.js';
import User from '../models/User.js';
import { runWithTenant } from '../middleware/tenantContext.js';
import { isValidEmail } from '../utils/security.js';

dotenv.config();

const { MONGO_URI, EMPRESA_NOME, ADMIN_EMAIL } = process.env;

if (!MONGO_URI) throw new Error('MONGO_URI e obrigatorio');
if (!EMPRESA_NOME) throw new Error('EMPRESA_NOME e obrigatorio');
if (!ADMIN_EMAIL) throw new Error('ADMIN_EMAIL e obrigatorio');
if (!isValidEmail(ADMIN_EMAIL.trim())) throw new Error('ADMIN_EMAIL invalido');

const nome = EMPRESA_NOME.trim();
const slug = nome.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
const email = ADMIN_EMAIL.trim().toLowerCase();

try {
  await mongoose.connect(MONGO_URI);

  await runWithTenant({ bypass: true }, async () => {
    // 1. Garante que existe uma Empresa (ativa, plano pago, trial longo)
    let empresa = await Empresa.findOne({ slug });
    if (!empresa) {
      empresa = await Empresa.create({
        nome,
        slug,
        plano: 'pago',
        ativo: true,
      });
      console.log('Empresa criada:', empresa._id);
    } else {
      await empresa.updateOne({ $set: { ativo: true, plano: 'pago' } });
      console.log('Empresa existente, garantida ativa:', empresa._id);
    }

    // 2. Vincula o admin ao tenant
    const filtro = { email, role: 'admin' };
    const updates = { $set: { empresa: empresa._id } };
    const adminResult = await User.updateOne(filtro, updates);
    console.log('Admin vinculado:', adminResult.modifiedCount);

    // 3. Vincula TODOS os usuários sem empresa (conta fantasma incluida)
    const orfaoResult = await User.updateMany(
      { empresa: { $exists: false, $or: [{ role: 'admin' }, { role: 'usuario' }] } },
      { $set: { empresa: empresa._id } }
    );
    console.log('Outros usuarios sem empresa vinculados:', orfaoResult.modifiedCount);
  });

  console.log('Concluido. Faca logout/login no app.');
} catch (err) {
  console.error('Falha ao vincular admin a empresa:', err);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
