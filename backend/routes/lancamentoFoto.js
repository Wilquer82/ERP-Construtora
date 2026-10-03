import express from 'express';
import LancamentoFoto from '../models/LancamentoFoto.js';
import Lancamento from '../models/Lancamento.js';
import Obra from '../models/Obra.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { pick } from '../utils/fields.js';
import { recalcularObra } from '../utils/calculoObra.js';
import { analisarImagem } from '../services/assistente/extratorFoto.js';

const router = express.Router();
router.use(protect);

function limparChave(key) {
  if (!key) return false;
  const k = key.trim();
  return (k.startsWith('sk-') && k.length >= 20) || (k.startsWith('AI') && k.length >= 30);
}

router.post('/enviar-foto', async (req, res, next) => {
  try {
    const { arquivoBase64, provider, apiKey } = req.body || {};
    if (!arquivoBase64) {
      return res.status(400).json({ error: 'arquivoBase64 (base64) e obrigatorio' });
    }
    if (arquivoBase64.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'Arquivo muito grande (max 10MB)' });
    }

    const arquivoId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    let dadosExtraidos;
    try {
      const resultado = await analisarImagem(arquivoBase64);
      if (resultado.tipo === 'comprovante_abastecimento') {
        dadosExtraidos = {
          valor: resultado.dados?.valor || null,
          dataNota: resultado.dados?.data || null,
          nomePosto: resultado.dados?.nomePosto || null,
          cnpjPosto: resultado.dados?.cnpj || null,
          isDemo: !!resultado.isDemo
        };
      } else {
        dadosExtraidos = {
          valor: null,
          dataNota: null,
          nomePosto: null,
          cnpjPosto: null,
          isDemo: true
        };
      }
    } catch (err) {
      dadosExtraidos = {
        valor: null,
        dataNota: null,
        nomePosto: null,
        cnpjPosto: null,
        isDemo: true
      };
    }

    const doc = await LancamentoFoto.create({
      empresa: req.user.empresa,
      enviadoPor: req.user.id,
      arquivoId,
      arquivoBase64,
      dataNota: dadosExtraidos.dataNota,
      nomePosto: dadosExtraidos.nomePosto,
      cnpjPosto: dadosExtraidos.cnpjPosto,
      valor: dadosExtraidos.valor || 0,
      nomeObraInformado: '',
      status: dadosExtraidos.isDemo ? 'aguardando_obra' : 'extraindo',
      isDemo: dadosExtraidos.isDemo || false
    });

    if (dadosExtraidos.isDemo || !dadosExtraidos.valor) {
      doc.status = 'aguardando_obra';
      await doc.save();
    }

    const obras = await Obra.find({ status: 'em_andamento' })
      .select('nome codigo')
      .limit(5)
      .lean();

    return res.status(201).json({
      lancamentoFoto: {
        _id: doc._id,
        valor: doc.valor,
        dataNota: doc.dataNota,
        nomePosto: doc.nomePosto,
        cnpjPosto: doc.cnpjPosto,
        status: doc.status,
        isDemo: doc.isDemo
      },
      obrasSugeridas: obras.map((o) => ({ _id: o._id, nome: o.nome, codigo: o.codigo }))
    });
  } catch (err) {
    return next(err);
  }
});

router.patch('/:id/informar-obra', async (req, res, next) => {
  try {
    const { nomeObraInformado, obraId } = req.body || {};
    if (!nomeObraInformado && !obraId) {
      return res.status(400).json({ error: ' Informe nomeObraInformado ou obraId' });
    }

    const lancamento = await LancamentoFoto.findById(req.params.id);
    if (!lancamento) return res.status(404).json({ error: 'LancamentoFoto nao encontrado' });

    lancamento.nomeObraInformado = nomeObraInformado || '';

    if (obraId) {
      if (!await Obra.exists({ _id: obraId })) {
        return res.status(404).json({ error: 'Obra nao encontrada' });
      }
      lancamento.obraSugerida = obraId;
    } else {
      const obra = await Obra.findOne({
        nome: new RegExp(nomeObraInformado.replace(/\W+/g, '\\W*'), 'i'),
        status: 'em_andamento'
      }).select('_id nome').limit(1);
      if (obra) lancamento.obraSugerida = obra._id;
    }

    lancamento.status = 'pendente_gestor';
    await lancamento.save();

    return res.json({
      _id: lancamento._id,
      status: lancamento.status,
      obraConfirmada: lancamento.obraConfirmada,
      obraSugerida: lancamento.obraSugerida,
      obrasSugeridas: lancamento.obraSugerida
        ? [{ _id: lancamento.obraSugerida }]
        : []
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/pendentes', adminOnly, async (req, res, next) => {
  try {
    const pendentes = await LancamentoFoto.find({
      status: { $in: ['aguardando_obra', 'pendente_gestor', 'extraindo'] }
    })
      .populate('enviadoPor', 'nome')
      .populate('obraSugerida', 'nome codigo')
      .populate('obraConfirmada', 'nome codigo')
      .sort({ createdAt: -1 });

    res.json(pendentes);
  } catch (err) {
    return next(err);
  }
});

router.patch('/:id/confirmar', adminOnly, async (req, res, next) => {
  try {
    const { obraId, observacaoGestor } = req.body || {};
    if (!obraId) {
      return res.status(400).json({ error: 'obraId e obrigatorio para confirmacao' });
    }

    const lancamento = await LancamentoFoto.findById(req.params.id);
    if (!lancamento) return res.status(404).json({ error: 'LancamentoFoto nao encontrado' });
    if (lancamento.status === 'confirmado') {
      return res.json({ ok: true, message: 'Ja confirmado' });
    }

    lancamento.obraConfirmada = obraId;
    lancamento.status = 'confirmado';
    lancamento.observacaoGestor = observacaoGestor || '';

    const novoLancamento = await Lancamento.create({
      empresa: lancamento.empresa,
      tipo: 'pagar',
      categoria: 'combustivel',
      descricao: `${lancamento.nomePosto || 'Combustível'} — NF ${lancamento.dataNota ? new Date(lancamento.dataNota).toLocaleDateString('pt-BR') : ''}`,
      valor: lancamento.valor,
      dataVencimento: lancamento.dataNota || new Date(),
      status: 'pago',
      dataPagamento: lancamento.dataNota || new Date(),
      obra: obraId,
      fornecedor: lancamento.nomePosto
    });

    lancamento.lancamentoFinanceiroId = novoLancamento._id;
    await lancamento.save();

    setImmediate(async () => {
      try { await recalcularObra(String(obraId))(); }
      catch (err) { console.error('[calculoObra] Falha:', err.message); }
    });

    return res.json({
      ok: true,
      lancamentoFinanceiro: novoLancamento,
      obraAtualizada: {
        _id: obraId,
        mensagem: 'Custo da obra recalculado'
      }
    });
  } catch (err) {
    return next(err);
  }
});

router.patch('/:id/rejeitar', adminOnly, async (req, res, next) => {
  try {
    const { observacaoGestor } = req.body || {};
    const lancamento = await LancamentoFoto.findById(req.params.id);
    if (!lancamento) return res.status(404).json({ error: 'LancamentoFoto nao encontrado' });
    lancamento.status = 'rejeitado';
    if (observacaoGestor) lancamento.observacaoGestor = observacaoGestor;
    await lancamento.save();
    res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

export default router;
