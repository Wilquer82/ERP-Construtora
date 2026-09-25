import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fmtMoeda } from '../api.js';

const baixarArquivo = (conteudo, nomeArquivo, tipo = 'application/octet-stream') => {
  const blob = new Blob([conteudo], { type: tipo });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(link.href);
};

export function exportarOrcamentoPdf(orcamento) {
  const doc = new jsPDF();
  const dataAtual = new Date().toLocaleDateString('pt-BR');
  const clienteNome = orcamento.cliente?.nome || 'Cliente não informado';
  const obraNome = orcamento.obra?.nome || 'Obra não informada';
  const subtotal = (orcamento.itens || []).reduce((acc, item) => acc + (Number(item.quantidade || 0) * Number(item.custoUnitario || 0)), 0);
  const desconto = Number(orcamento.desconto || 0);
  const acrescimo = Number(orcamento.acrescimo || 0);
  const total = subtotal - desconto + acrescimo;

  doc.setFontSize(18);
  doc.text('ConstruERP', 14, 18);
  doc.setFontSize(10);
  doc.text('Contato: (11) 4000-0000 | contato@construerp.com.br', 14, 24);
  doc.text(`Data: ${dataAtual}`, 14, 30);

  doc.setFontSize(12);
  doc.text('Orçamento', 14, 42);
  doc.setFontSize(10);
  doc.text(`Cliente: ${clienteNome}`, 14, 50);
  doc.text(`Obra: ${obraNome}`, 14, 56);
  doc.text(`Validade: ${orcamento.validadeDias || 30} dias`, 14, 62);

  const rows = (orcamento.itens || []).map((item, index) => [
    index + 1,
    item.descricao || '-',
    item.unidade || 'und',
    Number(item.quantidade || 0),
    fmtMoeda(item.custoUnitario || 0),
    fmtMoeda((Number(item.quantidade || 0) * Number(item.custoUnitario || 0)))
  ]);

  autoTable(doc, {
    head: [['Item', 'Descrição', 'Unidade', 'Qtd', 'Preço unitário', 'Total']],
    body: rows,
    startY: 72,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [20, 84, 130] },
    margin: { left: 14, right: 14 }
  });

  const finalY = doc.lastAutoTable.finalY + 12;
  doc.setFontSize(10);
  doc.text(`Subtotal: ${fmtMoeda(subtotal)}`, 14, finalY);
  doc.text(`Desconto: ${fmtMoeda(desconto)}`, 14, finalY + 7);
  doc.text(`Acréscimo: ${fmtMoeda(acrescimo)}`, 14, finalY + 14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Valor total: ${fmtMoeda(total)}`, 14, finalY + 24);
  doc.setFont('helvetica', 'normal');
  doc.text('Campo de assinatura:', 14, finalY + 40);
  doc.line(14, finalY + 44, 90, finalY + 44);
  doc.text(`Validade: ${orcamento.validadeDias || 30} dias`, 14, finalY + 52);

  doc.save(`orcamento-${(orcamento.obra?.nome || 'obra').replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

export function exportarContratoPdf(contrato) {
  const doc = new jsPDF();
  const clienteNome = contrato.cliente?.nome || 'Cliente não informado';
  const obraNome = contrato.obra?.nome || 'Obra não informada';

  doc.setFontSize(18);
  doc.text('Contrato', 14, 18);
  doc.setFontSize(10);
  doc.text('ConstruERP — Gestão de obras', 14, 26);
  doc.text(`Número: ${contrato.numero || '-'}`, 14, 34);
  doc.text(`Cliente: ${clienteNome}`, 14, 42);
  doc.text(`Obra: ${obraNome}`, 14, 50);
  doc.text(`Valor: ${fmtMoeda(contrato.valorTotal || 0)}`, 14, 58);
  doc.text(`Forma de pagamento: ${contrato.numeroParcelas || 1} parcela(s)`, 14, 66);
  doc.text(`Data de assinatura: ${contrato.dataAssinatura ? new Date(contrato.dataAssinatura).toLocaleDateString('pt-BR') : '-'}`, 14, 74);

  const linhas = [
    'Objeto do contrato:',
    contrato.objeto || 'Objeto não informado.',
    '',
    `Status: ${contrato.status || 'rascunho'}`,
    `Observações: ${contrato.observacoes || '-'}`
  ];

  doc.setFontSize(11);
  linhas.forEach((linha, index) => {
    doc.text(linha, 14, 90 + (index * 8));
  });

  doc.text('Assinatura do cliente', 14, 170);
  doc.line(14, 174, 90, 174);
  doc.text('Assinatura da construtora', 120, 170);
  doc.line(120, 174, 190, 174);

  doc.save(`contrato-${(contrato.numero || 'contrato').replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

export function exportarFinanceiroCsv(lancamentos) {
  const header = ['Tipo', 'Descrição', 'Categoria', 'Valor', 'Vencimento', 'Status', 'Obra', 'Cliente'];
  const rows = (lancamentos || []).map((item) => [
    item.tipo || '',
    item.descricao || '',
    item.categoria || '',
    Number(item.valor || 0).toFixed(2),
    item.dataVencimento ? new Date(item.dataVencimento).toLocaleDateString('pt-BR') : '',
    item.status || '',
    item.obra?.nome || '',
    item.cliente?.nome || ''
  ]);

  const csv = [header, ...rows].map((linha) => linha.map((valor) => `"${String(valor).replace(/"/g, '""')}"`).join(',')).join('\n');
  baixarArquivo(csv, 'financeiro-export.csv', 'text/csv;charset=utf-8;');
}
