import express from 'express';
import User from '../models/User.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { pick } from '../utils/fields.js';

const router = express.Router();
router.use(protect);

router.get('/', adminOnly, async (req, res) => {
  try {
    const users = await User.find().sort({ nome: 1 }).select('-senha');
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', adminOnly, async (req, res) => {
  try {
    const { nome, email, senha, role, ativo } = req.body;
    if (!nome || !email || !senha) return res.status(400).json({ error: 'Preencha nome, email e senha' });
    const emailNormalizado = String(email).trim().toLowerCase();
    const exists = await User.findOne({ email: emailNormalizado });
    if (exists) return res.status(400).json({ error: 'Email ja cadastrado' });
    const user = await User.create({
      nome: String(nome).trim(),
      email: emailNormalizado,
      senha,
      role: ['admin', 'usuario'].includes(role) ? role : 'usuario',
      ativo: ativo !== false
    });
    res.status(201).json({ id: user._id, nome: user.nome, email: user.email, role: user.role, ativo: user.ativo });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });

    const payload = pick(req.body, ['nome', 'email', 'role', 'ativo']);
    if (payload.nome) user.nome = String(payload.nome).trim();
    if (payload.email) user.email = String(payload.email).trim().toLowerCase();
    if (payload.role && ['admin', 'usuario'].includes(payload.role)) user.role = payload.role;
    if (typeof payload.ativo === 'boolean') user.ativo = payload.ativo;

    if (req.body.senha) {
      if (String(req.body.senha).length < 8) return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres' });
      user.senha = req.body.senha;
    }

    await user.save();
    res.json({ id: user._id, nome: user.nome, email: user.email, role: user.role, ativo: user.ativo });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    if (req.user.id === req.params.id) return res.status(400).json({ error: 'Nao e possivel excluir o proprio usuario' });
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
