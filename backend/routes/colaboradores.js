import express from 'express';
import Colaborador from '../models/Colaborador.js';
import Alocacao from '../models/Alocacao.js';
import { protect } from '../middleware/auth.js';
import { pick } from '../utils/fields.js';
import { obraAccess } from '../middleware/obraAccess.js';

const router = express.Router();
router.use(protect);

const VALOR_DIARIA_DEFAULT = 220;
const DIAS_UTEIS_MES = 22;

function calcularDiaria(colab) {
  if (colab.tipo === 'diarista') return Number(colab.valorDiaria) || 0;
  const salario = Number(colab.salarioMensal) || 0;
  return salario > 0 ? Math.round((salario / DIAS_UTEIS_MES) * 100) / 100 : 0;
}

router.get('/', async (req, res, next) => {
  try {
    const filtro = {};
    if (req.query.obra) filtro.obraAtual = req.query.obra;
    if (req.query.status) filtro.status = req.query.status;
    const docs = await Colaborador.find(filtro).sort({ nome: 1 });
    const withDiaria = docs.map((c) => ({
      ...c.toObject(),
      diariaCalculada: calcularDiaria(c),
      diariaEditavel: c.tipo === 'diarista'
    }));
    res.json(withDiaria);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const doc = await Colaborador.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Colaborador nao encontrado' });
    const obj = doc.toObject();
    obj.diariaCalculada = calcularDiaria(doc);
    obj.diariaEditavel = doc.tipo === 'diarista';
    res.json(obj);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = pick(req.body, ['nome', 'cpf', 'funcao', 'tipo', 'valorDiaria', 'salarioMensal', 'telefone', 'status', 'obraAtual', 'dataAdmissao', 'documentos']);
    if (!payload.nome || !payload.cpf || !payload.funcao || !payload.tipo) {
      return res.status(400).json({ error: 'Campos obrigatorios: nome, cpf, funcao, tipo' });
    }
    if (payload.tipo === 'diarista' && (!payload.valorDiaria || Number(payload.valorDiaria) <= 0)) {
      return res.status(400).json({ error: 'Diaristas precisam de valorDiaria positivo' });
    }
    if (payload.tipo === 'mensalista' && (!payload.salarioMensal || Number(payload.salarioMensal) <= 0)) {
      return res.status(400).json({ error: 'Mensalistas precisam de salarioMensal positivo' });
    }
    if (payload.obraAtual) {
      if (req.user?.role !== 'admin' && req.user?.superAdmin !== true) {
        const allowed = req.user?.obras || [];
        if (allowed.length > 0 && !allowed.some((o) => String(o) === String(payload.obraAtual))) {
          return res.status(403).json({ error: 'Nao autorizado a alocar este colaborador nesta obra' });
        }
      }
      if (!await import('../models/Obra.js').then((m) => m.default.exists({ _id: payload.obraAtual }))) {
        return res.status(404).json({ error: 'Obra nao encontrada' });
      }
      await Alocacao.create({
        colaborador: undefined,
        obra: payload.obraAtual,
        dataInicio: payload.dataAdmissao,
        ativo: true
      });
    }
    const doc = await Colaborador.create(payload);
    const result = doc.toObject();
    result.diariaCalculada = calcularDiaria(doc);
    result.diariaEditavel = doc.tipo === 'diarista';
    res.status(201).json(result);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const payload = pick(req.body, ['nome', 'cpf', 'funcao', 'tipo', 'valorDiaria', 'salarioMensal', 'telefone', 'status', 'obraAtual', 'dataAdmissao', 'dataDemissao', 'documentos']);
    const doc = await Colaborador.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Colaborador nao encontrado' });
    const result = doc.toObject();
    result.diariaCalculada = calcularDiaria(doc);
    result.diariaEditavel = doc.tipo === 'diarista';
    res.json(result);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const doc = await Colaborador.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Colaborador nao encontrado' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// GET /api/colaboradores/:id/alocacoes — historico de alocacoes
router.get('/:id/alocacoes', async (req, res, next) => {
  try {
    const alocacoes = await Alocacao.find({ colaborador: req.params.id })
      .populate('obra', 'nome')
      .sort({ dataInicio: -1 });
    res.json(alocacoes);
  } catch (err) { next(err); }
});

// POST /api/colaboradores/:id/alocar — alocar em obra
router.post('/:id/alocar', async (req, res, next) => {
  try {
    const { obra, dataInicio } = req.body;
    if (!obra) return res.status(400).json({ error: 'Obra e obrigatoria' });
    if (req.user?.role !== 'admin' && req.user?.superAdmin !== true) {
      const allowed = req.user?.obras || [];
      if (allowed.length > 0 && !allowed.some((o) => String(o) === String(obra))) {
        return res.status(403).json({ error: 'Nao autorizado a alocar em esta obra' });
      }
    }

    // Fecha alocacao anterior
    await Alocacao.updateMany(
      { colaborador: req.params.id, ativo: true },
      { ativo: false, dataFim: new Date() }
    );

    const alocacao = await Alocacao.create({
      colaborador: req.params.id,
      obra,
      dataInicio: dataInicio ? new Date(dataInicio) : new Date(),
      ativo: true
    });

    await Colaborador.findByIdAndUpdate(req.params.id, { obraAtual: obra });
    await alocacao.populate('obra', 'nome');
    res.status(201).json(alocacao);
  } catch (err) { next(err); }
});

export default router;
