import Cliente from '../models/Cliente.js';
import Etapa from '../models/Etapa.js';
import Fornecedor from '../models/Fornecedor.js';
import Lancamento from '../models/Lancamento.js';
import Material from '../models/Material.js';
import Obra from '../models/Obra.js';
import Orcamento from '../models/Orcamento.js';
import PedidoCompra from '../models/PedidoCompra.js';
import { runWithTenant } from '../middleware/tenantContext.js';

export async function seedDemoCompany(empresa, userId) {
  return runWithTenant({
    empresaId: String(empresa._id),
    userId: userId ? String(userId) : undefined,
    bypass: false
  }, async () => {
    const suffix = String(empresa._id).slice(-6).toUpperCase();
    let cliente = await Cliente.findOne({});
    if (!cliente) {
      cliente = await Cliente.create({
        nome: 'Cliente de Demonstracao',
        email: 'cliente@demo.local',
        cidade: 'Sao Paulo',
        uf: 'SP'
      });
    }
    let fornecedor = await Fornecedor.findOne({});
    if (!fornecedor) {
      fornecedor = await Fornecedor.create({
        nome: 'Fornecedor de Demonstracao',
        razaoSocial: 'Fornecedor Demo Ltda',
        categoria: 'material',
        email: 'fornecedor@demo.local',
        cidade: 'Sao Paulo',
        uf: 'SP'
      });
    }
    const materialExamples = [
      { codigo: `DEMO-${suffix}-CIM`, nome: 'Cimento CP-II', categoria: 'Construcao', unidade: 'saco', estoqueAtual: 120, estoqueMinimo: 30, custoUnitario: 38.5, fornecedor: fornecedor.nome },
      { codigo: `DEMO-${suffix}-ACO`, nome: 'Vergalhao 10mm', categoria: 'Estrutural', unidade: 'barra', estoqueAtual: 80, estoqueMinimo: 20, custoUnitario: 52, fornecedor: fornecedor.nome },
      { codigo: `DEMO-${suffix}-ARE`, nome: 'Areia media', categoria: 'Agregado', unidade: 'm3', estoqueAtual: 24, estoqueMinimo: 8, custoUnitario: 145, fornecedor: fornecedor.nome }
    ];
    const currentMaterials = await Material.find().limit(3);
    const missingMaterials = materialExamples.slice(currentMaterials.length);
    const addedMaterials = missingMaterials.length ? await Material.create(missingMaterials) : [];
    const materiais = [...currentMaterials, ...addedMaterials];
    let obra = await Obra.findOne({});
    if (!obra) {
      obra = await Obra.create({
        codigo: `DEMO-${suffix}`,
        nome: 'Obra de Demonstracao',
        descricao: 'Projeto demonstrativo para explorar o ERP',
        cidade: 'Sao Paulo',
        uf: 'SP',
        cliente: cliente._id,
        status: 'em_andamento',
        valorOrcamento: 185000,
        dataInicio: new Date(),
        responsavel: 'Equipe de demonstracao'
      });
    }
    let etapa = await Etapa.findOne({ obra: obra._id });
    if (!etapa) {
      etapa = await Etapa.create({
        obra: obra._id,
        descricao: 'Fundacao e estrutura inicial',
        unidade: 'm2',
        quantidadeTotal: 120,
        quantidadeMedida: 30,
        precoUnitario: 850,
        status: 'em_andamento'
      });
    }
    if (!await Orcamento.exists({ obra: obra._id })) {
      await Orcamento.create({
        obra: obra._id,
        cliente: cliente._id,
        descricao: 'Orcamento demonstrativo da obra',
        itens: [
          { descricao: 'Fundacao e estrutura', unidade: 'm2', quantidade: 120, custoUnitario: 850, etapa: etapa._id },
          {
            descricao: materiais[0].nome,
            unidade: materiais[0].unidade,
            quantidade: 200,
            custoUnitario: materiais[0].custoUnitario,
            materialVinculado: materiais[0]._id,
            etapa: etapa._id
          }
        ],
        status: 'aprovado'
      });
    }

    const hoje = new Date();
    const lancamentos = [
      { tipo: 'receber', descricao: 'Sinal do contrato', categoria: 'Contrato', valor: 45000, status: 'pago', dataPagamento: hoje },
      { tipo: 'receber', descricao: 'Parcela de andamento', categoria: 'Contrato', valor: 35000, status: 'pendente' },
      { tipo: 'pagar', descricao: 'Compra de cimento', categoria: 'Materiais', valor: 4620, status: 'pago', fornecedor: fornecedor.nome, obra: obra._id },
      { tipo: 'pagar', descricao: 'Compra de vergalhoes', categoria: 'Materiais', valor: 4160, status: 'pendente', fornecedor: fornecedor.nome, obra: obra._id },
      { tipo: 'pagar', descricao: 'Servico de fundacao', categoria: 'Mao de obra', valor: 12500, status: 'pendente', obra: obra._id }
    ];
    const lancamentosExistentes = await Lancamento.countDocuments();
    await Lancamento.create(lancamentos.slice(lancamentosExistentes, 5).map((item, index) => ({
      ...item,
      dataVencimento: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + lancamentosExistentes + index + 7)
    })));

    if (!await PedidoCompra.exists({})) {
      await PedidoCompra.create({
        numero: `DEMO-PC-${suffix}`,
        fornecedor: fornecedor._id,
        obra: obra._id,
        status: 'em_aberto',
        dataPedido: hoje,
        itens: materiais.slice(0, 2).map((material) => ({
          material: material.nome,
          materialVinculado: material._id,
          descricao: material.nome,
          unidade: material.unidade,
          quantidade: 20,
          custoUnitario: material.custoUnitario
        }))
      });
    }

    return { cliente, fornecedor, materiais, obra, etapa };
  });
}
