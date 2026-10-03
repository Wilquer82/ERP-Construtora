import express from 'express';
import mongoose from 'mongoose';
import InteracaoIA from '../models/InteracaoIA.js';
import ConfirmacaoIA from '../models/ConfirmacaoIA.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { pick } from '../utils/fields.js';

const router = express.Router();
router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const { usuarioWhatsApp, status, limite = 50 } = req.query;
    const filtro = {};
    if (usuarioWhatsApp) filtro.usuarioWhatsApp = usuarioWhatsApp;
    if (status) filtro.status = status;
    const docs = await InteracaoIA.find(filtro)
      .populate('usuarioWhatsApp', 'nome numero')
      .sort({ createdAt: -1 })
      .limit(Number(limite));
    res.json(docs);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const doc = await InteracaoIA.findById(req.params.id)
      .populate('usuarioWhatsApp', 'nome numero perfil');
    if (!doc) return res.status(404).json({ error: 'Nao encontrado' });
    res.json(doc);
  } catch (err) { next(err); }
});

router.get('/:id/confirmacao', async (req, res, next) => {
  try {
    const doc = await ConfirmacaoIA.findOne({ interacaoIA: req.params.id })
      .populate('confirmadoPor', 'nome numero');
    if (!doc) return res.status(404).json({ error: 'Confirmacao nao encontrada' });
    res.json(doc);
  } catch (err) { next(err); }
});

router.post('/:id/confirmar', adminOnly, async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { confirmado, respostaUsuario, acoesExecutadas } = req.body;
    
    let resposta;
    await session.withTransaction(async () => {
      const interacao = await InteracaoIA.findById(req.params.id).session(session);
      if (!interacao) throw new Error('Interacao nao encontrada');

      let confirmacao = await ConfirmacaoIA.findOne({ interacaoIA: interacao._id }).session(session);
      if (!confirmacao) {
        confirmacao = new ConfirmacaoIA({ interacaoIA: interacao._id });
      }

      confirmacao.confirmado = confirmado;
      if (confirmado) {
        confirmacao.confirmadoPor = req.user.id;
        confirmacao.dataConfirmacao = new Date();
      }
      if (respostaUsuario) confirmacao.respostaUsuario = respostaUsuario;
      if (acoesExecutadas) confirmacao.acoesExecutadas = acoesExecutadas;
      
      await confirmacao.save({ session });

      interacao.status = confirmado ? 'concluido' : 'erro';
      if (!confirmado && respostaUsuario) interacao.erro = respostaUsuario;
      await interacao.save({ session });

      resposta = confirmacao;
    });

    res.json(resposta);
  } catch (err) { next(err); }
  finally { await session.endSession(); }
});

export default router;