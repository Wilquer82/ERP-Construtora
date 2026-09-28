import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Protege rotas: exige token JWT no header Authorization: Bearer <token>
export async function protect(req, res, next) {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Nao autorizado, sem token' });
  }

  let decoded;
  try {
    decoded = jwt.verify(authorization.slice(7), process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token invalido ou expirado' });
  }
  if (!decoded || typeof decoded !== 'object' || typeof decoded.id !== 'string') {
    return res.status(401).json({ error: 'Token invalido ou expirado' });
  }

  const user = await User.findById(decoded.id).select('_id nome email role ativo trocarSenha tokenVersion');
  if (!user || !user.ativo || user.tokenVersion !== (decoded.tokenVersion || 0)) {
    return res.status(401).json({ error: 'Token invalido ou usuario inativo' });
  }
  req.user = {
    id: user._id,
    nome: user.nome,
    email: user.email,
    role: user.role,
    trocarSenha: user.trocarSenha
  };

  if (user.trocarSenha && !['/me', '/logout', '/trocar-senha', '/esqueci-senha', '/reset-senha'].includes(req.path)) {
    return res.status(403).json({ error: 'Troca de senha obrigatoria', trocarSenha: true });
  }
  return next();
}

// Opcional: restringir por papel (admin)
export function adminOnly(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ error: 'Acesso restrito a administradores' });
}
