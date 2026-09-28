import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import bcrypt from 'bcryptjs';
import { Assinatura } from '../../models/Assinatura.js';
import { AssinaturaService } from './AssinaturaService.js';

export class AssinaturaSimplesAdapter extends AssinaturaService {
  constructor(storage, buscarFuncionarioPorCpf) {
    super();
    this.storage = storage;
    this.buscarFuncionarioPorCpf = buscarFuncionarioPorCpf;
  }

  async assinar(arquivoOriginalId, signatario) {
    // 1. Valida a senha do funcionário (reconfirmação obrigatória)
    const func = await this.buscarFuncionarioPorCpf(signatario.cpf);
    if (!func) throw new Error('funcionario_nao_encontrado');
    const senhaOk = await bcrypt.compare(signatario.senhaInformada, func.senha);
    if (!senhaOk) throw new Error('senha_invalida');

    // 2. Carrega o PDF original e carimba
    const original = await this.storage.obter(arquivoOriginalId);
    const pdfDoc = await PDFDocument.load(original.buffer).catch(() => null);

    let bufferAssinado;
    if (pdfDoc) {
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const page = pdfDoc.addPage([595, 842]); // A4 final de assinatura
      const y = 700;
      page.drawText('TERMO DE ASSINATURA ELETRONICA SIMPLES', { x: 50, y, size: 14, font: helvetica, color: rgb(0, 0, 0) });
      page.drawText('DOCUMENTO DE DEMONSTRACAO - SEM VALOR JURIDICO', { x: 50, y: y - 24, size: 11, font: helvetica, color: rgb(0.8, 0, 0) });
      page.drawText(`Nome: ${func.nome}`, { x: 50, y: y - 60, size: 10, font: helvetica });
      page.drawText(`CPF: ${signatario.cpf}`, { x: 50, y: y - 78, size: 10, font: helvetica });
      page.drawText(`IP: ${signatario.ip}`, { x: 50, y: y - 96, size: 10, font: helvetica });
      page.drawText(`Data/Hora: ${new Date().toISOString()}`, { x: 50, y: y - 114, size: 10, font: helvetica });
      page.drawText(`Hash SHA-256 original: ${original.hashSha256}`, { x: 50, y: y - 132, size: 8, font: helvetica });
      bufferAssinado = await pdfDoc.save();
    } else {
      bufferAssinado = original.buffer;
    }

    // 3. Guarda o PDF assinado no storage
    const { arquivoId: arquivoAssinadoId } = await this.storage.salvar(bufferAssinado, {
      nome: original.nome.replace('.pdf', '') + '-assinado.pdf',
      mimeType: 'application/pdf',
      tipo: 'assinado_demo'
    });

    // 4. Registra a trilha de auditoria
    const assinatura = await Assinatura.create({
      arquivoOriginalId,
      arquivoAssinadoId,
      signatario: { nome: func.nome, cpf: signatario.cpf },
      ip: signatario.ip,
      userAgent: signatario.userAgent,
      hashOriginal: original.hashSha256,
      metodo: 'simples_demo',
      dataHora: new Date()
    });

    return { assinaturaId: assinatura._id.toString(), arquivoAssinadoId };
  }

  async status(assinaturaId) {
    const a = await Assinatura.findById(assinaturaId);
    return a
      ? { status: 'assinado', metodo: a.metodo, arquivoAssinadoId: a.arquivoAssinadoId }
      : { status: 'nao_encontrado' };
  }
}