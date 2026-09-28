import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { adminOnly, protect } from '../middleware/auth.js';
import { isValidEmail, passwordError } from '../utils/security.js';

const router = express.Router();

const gerarToken = (user) => jwt.sign(
  {
    id: user._id,
    nome: user.nome,
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion
  },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES || '7d' }
);

// POST /api/auth/registro
router.post('/registro', protect, adminOnly, async (req, res, next) => {
  try {
    const { nome, email, senha } = req.body || {};
    if (!nome || !email || !senha) return res.status(400).json({ error: 'Preencha nome, email e senha' });
    const emailNormalizado = String(email).trim().toLowerCase();
    if (!isValidEmail(emailNormalizado)) return res.status(400).json({ error: 'Email invalido' });
    const erroSenha = passwordError(senha);
    if (erroSenha) return res.status(400).json({ error: erroSenha });
    const existe = await User.findOne({ email: emailNormalizado });
    if (existe) return res.status(400).json({ error: 'Email ja cadastrado' });
    const user = await User.create({
      nome: String(nome).trim(),
      email: emailNormalizado,
      senha,
      role: 'usuario',
      trocarSenha: true
    });
    return res.status(201).json({
      user: {
        id: user._id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        trocarSenha: user.trocarSenha
      }
    });
  } catch (err) {
    return next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, senha } = req.body || {};
    if (typeof email !== 'string' || typeof senha !== 'string') {
      return res.status(400).json({ error: 'Informe email e senha' });
    }
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+senha');
    if (!user) return res.status(401).json({ error: 'Credenciais invalidas' });
    const ok = await user.compararSenha(senha);
    if (!ok) return res.status(401).json({ error: 'Credenciais invalidas' });
    if (!user.ativo) return res.status(403).json({ error: 'Usuario inativo' });
    return res.json({
      token: gerarToken(user),
      user: {
        id: user._id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        trocarSenha: user.trocarSenha
      }
    });
  } catch (err) {
    return next(err);
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-senha');
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', protect, async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { $inc: { tokenVersion: 1 } });
    return res.json({ message: 'Sessao encerrada' });
  } catch (err) {
    return next(err);
  }
});

router.post('/trocar-senha', protect, async (req, res, next) => {
  try {
    const { senhaAtual, novaSenha } = req.body || {};
    const erroSenha = passwordError(novaSenha);
    if (erroSenha) return res.status(400).json({ error: erroSenha });
    if (typeof senhaAtual !== 'string') {
      return res.status(400).json({ error: 'Informe a senha atual' });
    }

    const user = await User.findById(req.user.id).select('+senha');
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });
    if (!await user.compararSenha(senhaAtual)) {
      return res.status(400).json({ error: 'Senha atual invalida' });
    }
    if (await user.compararSenha(novaSenha)) {
      return res.status(400).json({ error: 'A nova senha deve ser diferente da atual' });
    }

    user.senha = novaSenha;
    user.trocarSenha = false;
    user.tokenVersion += 1;
    await user.save();

    return res.json({
      token: gerarToken(user),
      user: {
        id: user._id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        trocarSenha: user.trocarSenha
      }
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
