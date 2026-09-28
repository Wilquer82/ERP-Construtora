import { fmtMoeda } from '../api.js';

const Hoje = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const addDias = (d, n) => new Date(d.getTime() + n * 24 * 60 * 60 * 1000);
const addMeses = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, d.getDate());

export const OBRAS_MOCK = [
  { _id: 'obra-001', codigo: 'OBR-001', nome: 'Reforma Escola Municipal', cliente: { _id: 'cli-001', nome: 'Prefeitura de Lindóia' }, status: 'em_andamento', percentualConclusao: 65, percentualFinanceiro: 70, valorOrcamento: 420000 },
  { _id: 'obra-002', codigo: 'OBR-002', nome: 'Pavimentação Rua das Flores', cliente: { _id: 'cli-002', nome: 'Associação de Moradores' }, status: 'em_andamento', percentualConclusao: 30, percentualFinanceiro: 25, valorOrcamento: 180000 },
];

export const COLABORADORES_MOCK = [
  { _id: 'col-001', nome: 'Carlos Silva', cpf: '123.456.789-00', funcao: 'Engenheiro Civil', tipo: 'mensalista', salarioMensal: 8800, telefone: '(11) 99999-9999', status: 'ativo', obraAtual: 'obra-001', dataAdmissao: '2025-03-15', documentos: [] },
  { _id: 'col-002', nome: 'João Mendes', cpf: '234.567.890-11', funcao: 'Mestre de Obras', tipo: 'diarista', valorDiaria: 300, telefone: '(11) 98888-8888', status: 'ativo', obraAtual: 'obra-001', dataAdmissao: '2025-02-10', documentos: [] },
  { _id: 'col-003', nome: 'Pedro Costa', cpf: '345.678.901-22', funcao: 'Pedreiro', tipo: 'diarista', valorDiaria: 220, telefone: '(11) 97777-7777', status: 'ativo', obraAtual: 'obra-002', dataAdmissao: '2025-01-20', documentos: [] },
  { _id: 'col-004', nome: 'Maria Santos', cpf: '456.789.012-33', funcao: 'Servente', tipo: 'diarista', valorDiaria: 150, telefone: '(11) 96666-6666', status: 'ativo', obraAtual: 'obra-002', dataAdmissao: '2025-03-01', documentos: [] },
  { _id: 'col-005', nome: 'Lucas Ferreira', cpf: '567.890.123-44', funcao: 'Eletricista', tipo: 'diarista', valorDiaria: 250, telefone: '(11) 95555-5555', status: 'afastado', obraAtual: 'obra-001', dataAdmissao: '2025-02-28', documentos: [] },
];

export const DOCUMENTOS_MOCK = [
  { tipo: 'aso', nome: 'ASO', validade: '2025-04-15', dataEmissao: '2024-04-15', status: 'valido' },
  { tipo: 'aso', nome: 'ASO', validade: '2025-09-28', dataEmissao: '2024-09-28', status: 'vence_em_breve' },
  { tipo: 'aso', nome: 'ASO', validade: '2025-01-10', dataEmissao: '2024-01-10', status: 'vencido' },
  { tipo: 'epi', nome: 'Capacete de segurança', validade: null, dataEmissao: '2025-03-01', reciboAssinado: false },
  { tipo: 'contrato_experiencia', nome: 'Contrato de experiência', validade: null, dataEmissao: '2025-03-15', status: 'valido' },
];

export const CERTIDAES_MOCK = [
  { _id: 'cert-001', tipo: 'municipal', nome: 'Licença Ambiental', dataVencimento: addDias(Hoje(), 20), status: 'vence_em_breve' },
  { _id: 'cert-002', tipo: 'estadual', nome: 'CRCA', dataVencimento: addDias(Hoje(), 60), status: 'valida' },
  { _id: 'cert-003', tipo: 'federal', nome: 'CNPJ Ativo', dataVencimento: addDias(Hoje(), 180), status: 'valida' },
];

export const LANCAMENTOS_MOCK = [
  { _id: 'lan-001', tipo: 'pagar', descricao: 'Cimento e material de construção', valor: 45000, dataVencimento: addDias(Hoje(), 2), status: 'pendente', categoria: 'Materiais' },
  { _id: 'lan-002', tipo: 'pagar', descricao: 'Saldo do fornecedor de EPIs', valor: 12500, dataVencimento: addDias(Hoje(), -5), status: 'atrasado', categoria: 'EPIs' },
  { _id: 'lan-003', tipo: 'pagar', descricao: 'Aluguel de andaime', valor: 8000, dataVencimento: addDias(Hoje(), 15), status: 'pendente', categoria: 'Aluguel' },
  { _id: 'lan-004', tipo: 'receber', descricao: 'Parcela 1/3 Contrato Escola Municipal', valor: 140000, dataVencimento: addDias(Hoje(), -3), status: 'atrasado', categoria: 'Contrato' },
  { _id: 'lan-005', tipo: 'receber', descricao: 'Parcela 2/3 Contrato Escola Municipal', valor: 140000, dataVencimento: addDias(Hoje(), 30), status: 'pendente', categoria: 'Contrato' },
];

export const CONTRATOS_MOCK = [
  { _id: 'con-001', numero: 'CT-2025-001', obra: OBRAS_MOCK[0], valorTotal: 1200000, dataInicio: '2025-03-01', dataFim: '2025-12-30', status: 'ativo', observacoes: 'Contrato com a Prefeitura de Lindóia' },
];

export const ETAPAS_CONTRATO_MOCK = [
  { _id: 'etp-001', contrato: 'con-001', obra: OBRAS_MOCK[0], descricao: 'Demolir e preparar base', dataFim: addDias(Hoje(), -3), status: 'atrasada', multaPrevista: 15000 },
  { _id: 'etp-002', contrato: 'con-001', obra: OBRAS_MOCK[0], descricao: 'Estrutura de concreto', dataFim: addDias(Hoje(), 5), status: 'a_vencer', multaPrevista: 0 },
  { _id: 'etp-003', contrato: 'con-001', obra: OBRAS_MOCK[0], descricao: 'Acabamento interno', dataFim: addDias(Hoje(), 30), status: 'pendente', multaPrevista: 0 },
];

export const PONTO_MOCK = (colaboradorId) => {
  const pontos = [];
  let data = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
  const fim = new Date();
  for (let d = new Date(data); d <= fim; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0 || d.getDay() === 6) continue; // pula fim de semana
    pontos.push({
      _id: `pnt-${colaboradorId}-${d.getTime()}`,
      colaborador: colaboradorId,
      data: d.toISOString().slice(0, 10),
      entrada: '07:30',
      saida: '17:00',
      horaExtra: 0
    });
  }
  return pontos.slice(0, 20); // limita para demo
};

export const FOLHAS_MOCK = COLABORADORES_MOCK
  .filter((c) => c.status === 'ativo')
  .map((colab) => {
    const valorDiaria = colab.tipo === 'diarista'
      ? Number(colab.valorDiaria)
      : Math.round((Number(colab.salarioMensal) || 0) / 22 * 100) / 100;
    const dias = 18; // demo
    const bruto = Math.round(dias * valorDiaria * 100) / 100;
    return {
      _id: `folha-${colab._id}`,
      colaborador: colab,
      obra: OBRAS_MOCK.find((o) => o._id === colab.obraAtual),
      mes: new Date().getMonth() + 1,
      ano: new Date().getFullYear(),
      diasTrabalhados: dias,
      valorDiaria: valorDiaria,
      totalBruto: bruto,
      adiantamentos: colab._id === 'col-002' ? 2000 : 0,
      totalLiquido: bruto - (colab._id === 'col-002' ? 2000 : 0),
      status: 'aberto'
    };
  });

export const LEMBRETES_MOCK = [
  { _id: 'lem-001', titulo: 'ASO vencido - Carlos Silva', data: '2025-09-28', categoria: 'rh', prioridade: 'critico', status: 'pendente', referenciaId: 'col-001', autoGerado: true },
  { _id: 'lem-002', titulo: 'ASO vence em 10 dias - João Mendes', data: '2025-10-08', categoria: 'rh', prioridade: 'atencao', status: 'pendente', referenciaId: 'col-002', autoGerado: true },
  { _id: 'lem-003', titulo: 'EPI para trocar - Maria Santos', data: '2025-10-15', categoria: 'rh', prioridade: 'atencao', status: 'pendente', referenciaId: 'col-004', autoGerado: true },
  { _id: 'lem-004', titulo: 'Conta a pagar VENCIDA - Saldo EPIs', data: '2025-09-23', categoria: 'financeiro', prioridade: 'critico', status: 'pendente', referenciaId: 'lan-002', autoGerado: true },
  { _id: 'lem-005', titulo: 'Conta a pagar vence em 2 dias - Cimento', data: '2025-09-28', categoria: 'financeiro', prioridade: 'critico', status: 'pendente', referenciaId: 'lan-001', autoGerado: true },
  { _id: 'lem-006', titulo: 'Certidão municipal vence em 20 dias', data: '2025-10-18', categoria: 'obras', prioridade: 'atencao', status: 'pendente', referenciaId: 'cert-001', autoGerado: true },
  { _id: 'lem-007', titulo: 'Etapa atrasada - Demolir e preparar base', data: '2025-09-25', categoria: 'contratos', prioridade: 'critico', status: 'pendente', referenciaId: 'etp-001', autoGerado: true },
  { _id: 'lem-008', titulo: 'Etapa vence em 5 dias - Estrutura de concreto', data: '2025-10-03', categoria: 'contratos', prioridade: 'atencao', status: 'pendente', referenciaId: 'etp-002', autoGerado: true },
];

export const CALENDARIO_EVENTOS_MOCK = LEMBRETES_MOCK.map((l) => ({
  id: l._id,
  titulo: l.titulo,
  data: l.data,
  categoria: l.categoria,
  prioridade: l.prioridade,
  status: l.status
}));

export const DOCUMENTOS_COLAB_MOCK = COLABORADORES_MOCK.map((colab) => {
  const docs = [];
  const hoje = new Date();
  const docASO = { tipo: 'aso', nome: 'ASO', dataEmissao: '2024-09-28', validade: new Date(hoje.getFullYear() + 1, 8, 28).toISOString().slice(0, 10) };
  if (colab._id === 'col-001') {
    docASO.validade = '2024-09-28';
    docASO.status = 'vencido';
  } else if (colab._id === 'col-002') {
    docASO.status = 'vence_em_breve';
  } else {
    docASO.status = 'valido';
  }
  docs.push(docASO);
  docs.push({ tipo: 'epi', nome: 'Capacete de segurança', dataEmissao: '2025-03-01', validade: null, status: 'valido', reciboAssinado: colab._id !== 'col-004' });
  docs.push({ tipo: 'contrato_experiencia', nome: 'Contrato de experiência', dataEmissao: colab.dataAdmissao, validade: addDias(new Date(colab.dataAdmissao), 90).toISOString().slice(0, 10), status: 'valido' });
  return { ...colab, documentos: docs };
});

export { Hoje, addDias, addMeses, fmtMoeda };
