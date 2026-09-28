import dotenv from 'dotenv';
import connectDB from './config/db.js';
import User from './models/User.js';
import Cliente from './models/Cliente.js';
import Obra from './models/Obra.js';
import { isValidEmail, passwordError } from './utils/security.js';

dotenv.config();
await connectDB();

// Limpar (opcional)
// await User.deleteMany({});
// await Cliente.deleteMany({});
// await Obra.deleteMany({});

// Usuario admin padrao
const adminEmail = process.env.ADMIN_EMAIL;
const adminSenha = process.env.ADMIN_PASSWORD;
if (!adminEmail || !isValidEmail(adminEmail)) throw new Error('ADMIN_EMAIL valido e obrigatorio para o seed');
const erroSenha = passwordError(adminSenha);
if (erroSenha) throw new Error(`ADMIN_PASSWORD invalida: ${erroSenha}`);

const adminExiste = await User.findOne({ email: adminEmail.toLowerCase() });
if (!adminExiste) {
  await User.create({
    nome: 'Administrador',
    email: adminEmail.toLowerCase(),
    senha: adminSenha,
    role: 'admin',
    trocarSenha: true
  });
  console.log(`Admin criado: ${adminEmail}`);
} else if (adminExiste.role !== 'admin') {
  adminExiste.role = 'admin';
  adminExiste.senha = adminSenha;
  adminExiste.trocarSenha = true;
  adminExiste.tokenVersion += 1;
  await adminExiste.save();
  console.log(`Usuario promovido a administrador: ${adminEmail}`);
} else {
  console.log('ℹ️ Admin ja existe');
}

// Dados de exemplo
if ((await Cliente.countDocuments()) === 0) {
  const c1 = await Cliente.create({ nome: 'Construtora Alpha Ltda', documento: '12.345.678/0001-90', email: 'contato@alpha.com', telefone: '(11) 3333-1111', cidade: 'Sao Paulo', uf: 'SP' });
  const c2 = await Cliente.create({ nome: 'Joao da Silva', documento: '123.456.789-00', email: 'joao@email.com', telefone: '(21) 99999-2222', cidade: 'Rio de Janeiro', uf: 'RJ' });
  await Obra.create({ nome: 'Edificio Residencial Vista Alegre', cliente: c1._id, status: 'em_andamento', valorOrcamento: 2500000, percentualConclusao: 35, dataInicio: new Date(2026, 0, 15), dataPrevisaoFim: new Date(2027, 5, 30), cidade: 'Sao Paulo', uf: 'SP', responsavel: 'Eng. Maria Souza' });
  await Obra.create({ nome: 'Reforma Casa Joao', cliente: c2._id, status: 'planejamento', valorOrcamento: 180000, percentualConclusao: 0, cidade: 'Rio de Janeiro', uf: 'RJ', responsavel: 'Eng. Pedro Alves' });
  console.log('✅ Dados de exemplo criados');
}

console.log('🎉 Seed concluido. Pressione Ctrl+C para sair.');
