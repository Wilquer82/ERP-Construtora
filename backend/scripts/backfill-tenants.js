import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Empresa from '../models/Empresa.js';
import User from '../models/User.js';
import Cliente from '../models/Cliente.js';
import Contrato from '../models/Contrato.js';
import Etapa from '../models/Etapa.js';
import Fornecedor from '../models/Fornecedor.js';
import Lancamento from '../models/Lancamento.js';
import Material from '../models/Material.js';
import Medicao from '../models/Medicao.js';
import Obra from '../models/Obra.js';
import Orcamento from '../models/Orcamento.js';
import PedidoCompra from '../models/PedidoCompra.js';
import PasswordReset from '../models/PasswordReset.js';
import ContaBancaria from '../models/ContaBancaria.js';
import MovimentoBancario from '../models/MovimentoBancario.js';
import { isValidEmail } from '../utils/security.js';

dotenv.config();

if (!process.env.MONGO_URI) throw new Error('MONGO_URI e obrigatorio');
const adminEmail = process.env.SUPER_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
if (!adminEmail || !isValidEmail(adminEmail.trim())) {
  throw new Error('Configure SUPER_ADMIN_EMAIL ou ADMIN_EMAIL com email valido');
}

const tenantModels = [
  User,
  Cliente,
  Contrato,
  Etapa,
  Fornecedor,
  Lancamento,
  Material,
  Medicao,
  Obra,
  Orcamento,
  PedidoCompra,
  PasswordReset,
  ContaBancaria,
  MovimentoBancario
];
const oldUniqueIndexes = new Map([
  [Cliente, 'documento_1'],
  [Obra, 'codigo_1'],
  [Contrato, 'numero_1'],
  [Material, 'codigo_1'],
  [PedidoCompra, 'numero_1']
]);

try {
  await mongoose.connect(process.env.MONGO_URI);
  await Empresa.createIndexes();
  const demo = await Empresa.findOneAndUpdate(
    { slug: 'demo' },
    { $setOnInsert: { nome: 'Demo', slug: 'demo', plano: 'trial' } },
    { new: true, upsert: true }
  );
  const admin = await User.findOne({ email: adminEmail.trim().toLowerCase(), role: 'admin' });
  if (!admin) throw new Error('Super-admin nao encontrado; configure ADMIN_EMAIL e execute o seed antes');
  if (!demo.criadoPor) demo.criadoPor = admin._id;
  demo.alteradoPor = admin._id;
  await demo.save();

  for (const [Model, oldIndex] of oldUniqueIndexes) {
    const collectionExists = await mongoose.connection.db
      .listCollections({ name: Model.collection.collectionName }, { nameOnly: true })
      .hasNext();
    if (!collectionExists) continue;
    const indexes = await Model.collection.indexes();
    if (indexes.some((index) => index.name === oldIndex)) {
      await Model.collection.dropIndex(oldIndex);
    }
  }

  for (const Model of tenantModels) {
    const setFields = {
      empresa: { $ifNull: ['$empresa', demo._id] },
      criadoPor: { $ifNull: ['$criadoPor', admin._id] },
      alteradoPor: { $ifNull: ['$alteradoPor', admin._id] }
    };
    if (Model === User) {
      setFields.superAdmin = {
        $cond: [
          { $and: [{ $eq: ['$email', admin.email] }, { $eq: ['$role', 'admin'] }] },
          true,
          { $ifNull: ['$superAdmin', false] }
        ]
      };
    }
    const result = await Model.collection.updateMany(
      {},
      [{ $set: setFields }]
    );
    console.log(`${Model.modelName}: ${result.modifiedCount} documento(s) associados a Demo.`);
    await Model.createIndexes();
  }
  console.log(`Backfill concluido para a empresa Demo (${demo._id}).`);
} catch (err) {
  console.error('Falha no backfill multi-tenant:', err);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
