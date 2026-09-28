import dotenv from 'dotenv';
import connectDB from './config/db.js';
import Empresa from './models/Empresa.js';
import User from './models/User.js';
import Cliente from './models/Cliente.js';
import Obra from './models/Obra.js';
import Contrato from './models/Contrato.js';
import Lancamento from './models/Lancamento.js';
import Colaborador from './models/Colaborador.js';
import Alocacao from './models/Alocacao.js';
import Lembrete from './models/Lembrete.js';
import Certidao from './models/Certidao.js';
import { runWithTenant } from './middleware/tenantContext.js';
import { isValidEmail, passwordError } from './utils/security.js';

dotenv.config();
await connectDB();

const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const adminSenha = process.env.ADMIN_PASSWORD;
if (!adminEmail || !isValidEmail(adminEmail)) throw new Error('ADMIN_EMAIL valido e obrigatorio');
const erroSenha = passwordError(adminSenha);
if (erroSenha) throw new Error(`ADMIN_PASSWORD invalida: ${erroSenha}`);

const models = [Empresa, User, Cliente, Obra, Contrato, Lancamento, Colaborador, Alocacao, Lembrete, Certidao];
await Promise.all(models.map((m) => m.createIndexes?.()));

let demo = await Empresa.findOne({ slug: 'demo' });
if (!demo) demo = await Empresa.create({ nome: 'Construtora Demo Ltda', slug: 'demo', plano: 'trial' });

await runWithTenant({ empresaId: String(demo._id), bypass: true }, async () => {
  const admin = await User.findOne({ email: adminEmail }) || await User.create({
    nome: 'Super Administrador',
    email: adminEmail,
    senha: adminSenha,
    role: 'admin',
    ativo: true,
    superAdmin: true,
    empresa: demo._id
  });

  await Colaborador.deleteMany({});
  await Alocacao.deleteMany({});
  await Lembrete.deleteMany({ autoGerado: true });
  await Certidao.deleteMany({});

  const hoje = new Date();
  const cliente = await Cliente.findOne({ empresa: demo._id }) || await Cliente.create({
    nome: 'Prefeitura de Lindóia',
    documento: '123.456.789/0001-00',
    email: 'licitacao@lindolia.sp.gov.br',
    telefone: '(13) 3435-1000',
    cidade: 'Lindóia',
    uf: 'SP'
  });

  const obra1 = await Obra.findOne({ empresa: demo._id, codigo: 'OBR-001' })
    || await Obra.create({ codigo: 'OBR-001', nome: 'Reforma Escola Municipal', cliente: cliente._id, status: 'em_andamento', valorOrcamento: 420000, dataInicio: new Date(2025, 2, 1) });
  const obra2 = await Obra.findOne({ empresa: demo._id, codigo: 'OBR-002' })
    || await Obra.create({ codigo: 'OBR-002', nome: 'Pavimentação Rua das Flores', cliente: cliente._id, status: 'em_andamento', valorOrcamento: 180000, dataInicio: new Date(2025, 4, 15) });

  const colaboradores = [
    { nome: 'Carlos Silva', cpf: '123.456.789-00', funcao: 'Engenheiro Civil', tipo: 'mensalista', salarioMensal: 8800, telefone: '(11) 99999-9999', obraAtual: obra1._id, dataAdmissao: new Date(2025, 2, 15) },
    { nome: 'João Mendes', cpf: '234.567.890-11', funcao: 'Mestre de Obras', tipo: 'diarista', valorDiaria: 300, telefone: '(11) 98888-8888', obraAtual: obra1._id, dataAdmissao: new Date(2025, 1, 10) },
    { nome: 'Pedro Costa', cpf: '345.678.901-22', funcao: 'Pedreiro', tipo: 'diarista', valorDiaria: 220, telefone: '(11) 97777-7777', obraAtual: obra2._id, dataAdmissao: new Date(2025, 0, 20) },
    { nome: 'Maria Santos', cpf: '456.789.012-33', funcao: 'Servente', tipo: 'diarista', valorDiaria: 150, telefone: '(11) 96666-6666', obraAtual: obra2._id, dataAdmissao: new Date(2025, 2, 1) },
    { nome: 'Lucas Ferreira', cpf: '567.890.123-44', funcao: 'Eletricista', tipo: 'diarista', valorDiaria: 250, telefone: '(11) 95555-5555', obraAtual: obra1._id, dataAdmissao: new Date(2025, 1, 28), status: 'afastado' },
  ];

  const colsCriados = [];
  for (const c of colaboradores) {
    const doc = await Colaborador.findOne({ empresa: demo._id, cpf: c.cpf })
      || await Colaborador.create({ ...c, status: c.status || 'ativo', documentos: [] });
    colsCriados.push(doc);
    await Alocacao.updateOne(
      { colaborador: doc._id, obra: c.obraAtual, ativo: true },
      { $setOnInsert: { dataInicio: c.dataAdmissao, ativo: true } },
      { upsert: true }
    );
  }

  for (const col of colsCriados) {
    const aso = await Colaborador.findByIdAndUpdate(
      col._id,
      {
        $push: {
          documentos: {
            tipo: 'aso',
            nome: 'ASO',
            dataEmissao: new Date(2024, 8, 28),
            validade: new Date(2025, 8, 28),
            status: 'valido'
          }
        }
      },
      { new: true }
    );
  }

  await Colaborador.findByIdAndUpdate(colsCriados[0]._id, {
    $push: {
      documentos: {
        tipo: 'epi',
        nome: 'Capacete de segurança',
        dataEmissao: new Date(2025, 2, 1),
        reciboAssinado: true,
        status: 'valido'
      }
    }
  });

  await Colaborador.findByIdAndUpdate(colsCriados[2]._id, {
    $push: {
      documentos: {
        tipo: 'epi',
        nome: 'Capacete de segurança',
        dataEmissao: new Date(2025, 2, 1),
        reciboAssinado: false,
        status: 'valido'
      }
    }
  });

  const lancamentos = await Lancamento.insertMany([
    { tipo: 'pagar', descricao: 'Cimento e material de construção', categoria: 'Materiais', valor: 45000, dataVencimento: new Date(hoje.getTime() + 2 * 86400000), status: 'pendente', obra: obra1._id, empresa: demo._id },
    { tipo: 'pagar', descricao: 'Saldo do fornecedor de EPIs', categoria: 'EPIs', valor: 12500, dataVencimento: new Date(hoje.getTime() - 5 * 86400000), status: 'atrasado', obra: obra1._id, empresa: demo._id },
    { tipo: 'pagar', descricao: 'Aluguel de andaime', categoria: 'Aluguel', valor: 8000, dataVencimento: new Date(hoje.getTime() + 15 * 86400000), status: 'pendente', obra: obra2._id, empresa: demo._id },
    { tipo: 'receber', descricao: 'Parcela 1/3 Contrato Escola Municipal', categoria: 'Contrato', valor: 140000, dataVencimento: new Date(hoje.getTime() - 3 * 86400000), status: 'atrasado', obra: obra1._id, empresa: demo._id },
    { tipo: 'receber', descricao: 'Parcela 2/3 Contrato Escola Municipal', categoria: 'Contrato', valor: 140000, dataVencimento: new Date(hoje.getTime() + 30 * 86400000), status: 'pendente', obra: obra1._id, empresa: demo._id },
  ]);

  await Contrato.findOneAndUpdate(
    { empresa: demo._id, numero: 'CT-2025-001' },
    {
      $setOnInsert: {
        numero: 'CT-2025-001',
        obra: obra1._id,
        cliente: cliente._id,
        valorTotal: 1200000,
        dataInicio: new Date(2025, 2, 1),
        dataFim: new Date(2025, 11, 30),
        status: 'ativo',
        observacoes: 'Contrato com a Prefeitura de Lindóia'
      }
    },
    { upsert: true }
  );

  await Certidao.insertMany([
    { tipo: 'municipal', nome: 'Licença Ambiental', dataVencimento: new Date(hoje.getTime() + 20 * 86400000), empresa: demo._id },
    { tipo: 'estadual', nome: 'CRCA', dataVencimento: new Date(hoje.getTime() + 60 * 86400000), empresa: demo._id },
    { tipo: 'federal', nome: 'CNPJ Ativo', dataVencimento: new Date(hoje.getTime() + 180 * 86400000), empresa: demo._id },
  ]);

  const lembretes = [
    { titulo: 'ASO vencido - Carlos Silva', data: new Date(hoje.getTime() - 5 * 86400000), categoria: 'rh', prioridade: 'critico', referenciaId: colsCriados[0]._id, referenciaModel: 'Colaborador', autoGerado: true },
    { titulo: 'ASO vence em 10 dias - João Mendes', data: new Date(hoje.getTime() + 10 * 86400000), categoria: 'rh', prioridade: 'atencao', referenciaId: colsCriados[1]._id, referenciaModel: 'Colaborador', autoGerado: true },
    { titulo: 'EPI para trocar - Maria Santos', data: new Date(hoje.getTime() + 15 * 86400000), categoria: 'rh', prioridade: 'atencao', referenciaId: colsCriados[3]._id, referenciaModel: 'Colaborador', autoGerado: true },
    { titulo: 'Conta a pagar VENCIDA - Saldo EPIs', data: lancamentos[1].dataVencimento, categoria: 'financeiro', prioridade: 'critico', referenciaId: lancamentos[1]._id, referenciaModel: 'Lancamento', autoGerado: true },
    { titulo: 'Conta a pagar vence em 2 dias - Cimento', data: lancamentos[0].dataVencimento, categoria: 'financeiro', prioridade: 'critico', referenciaId: lancamentos[0]._id, referenciaModel: 'Lancamento', autoGerado: true },
    { titulo: 'Certidão municipal vence em 20 dias', data: new Date(hoje.getTime() + 20 * 86400000), categoria: 'obras', prioridade: 'atencao', referenciaId: undefined, referenciaModel: 'Certidao', autoGerado: true },
    { titulo: 'Etapa atrasada - Demolir e preparar base', data: new Date(hoje.getTime() - 3 * 86400000), categoria: 'contratos', prioridade: 'critico', status: 'pendente', autoGerado: true },
    { titulo: 'Etapa vence em 5 dias - Estrutura de concreto', data: new Date(hoje.getTime() + 5 * 86400000), categoria: 'contratos', prioridade: 'atencao', status: 'pendente', autoGerado: true },
  ];

  await Lembrete.insertMany(lembretes);

  console.log(`Seed demo concluido: ${colsCriados.length} colaboradores, ${lancamentos.length} lancamentos, ${lembretes.length} lembretes`);
});

process.exit(0);
