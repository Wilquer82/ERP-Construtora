import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const gerarToken = (user) => jwt.sign(
  { id: user._id, nome: user.nome, email: user.email, role: user.role, tokenVersion: user.tokenVersion },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES || '7d' }
);

// POST /api/auth/registro
router.post('/registro', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) return res.status(400).json({ error: 'Preencha nome, email e senha' });
    if (String(senha).length < 8) return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres' });
    const emailNormalizado = String(email).trim().toLowerCase();
    const existe = await User.findOne({ email: emailNormalizado });
    if (existe) return res.status(400).json({ error: 'Email ja cadastrado' });
    const user = await User.create({ nome: String(nome).trim(), email: emailNormalizado, senha, role: 'usuario' });
    res.status(201).json({ token: gerarToken(user), user: { id: user._id, nome: user.nome, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select('+senha');
    if (!user) return res.status(401).json({ error: 'Credenciais invalidas' });
    const ok = await user.compararSenha(senha);
    if (!ok) return res.status(401).json({ error: 'Credenciais invalidas' });
    if (!user.ativo) return res.status(403).json({ error: 'Usuario inativo' });
    res.json({ token: gerarToken(user), user: { id: user._id, nome: user.nome, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-senha');
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Nao foi possivel carregar o usuario' });
  }
});

// POST /api/auth/logout
router.post('/logout', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { $inc: { tokenVersion: 1 } });
    res.json({ message: 'Sessao encerrada' });
  } catch (err) {
    res.status(500).json({ error: 'Nao foi possivel encerrar a sessao' });
  }
});

export default router;
