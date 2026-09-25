import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';

import authRoutes from './routes/auth.js';
import clienteRoutes from './routes/clientes.js';
import obraRoutes from './routes/obras.js';
import orcamentoRoutes from './routes/orcamentos.js';
import contratoRoutes from './routes/contratos.js';
import financeiroRoutes from './routes/financeiro.js';
import materialRoutes from './routes/materiais.js';
import dashboardRoutes from './routes/dashboard.js';
import medicaoRoutes from './routes/medicoes.js';

dotenv.config();

if (!process.env.MONGO_URI || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
	throw new Error('MONGO_URI e JWT_SECRET com pelo menos 32 caracteres sao obrigatorios');
}

const app = express();
const defaultOrigins = [
	'https://erp-construtora-site.onrender.com',
	'http://localhost:5173'
];
const origins = (process.env.CORS_ORIGIN || defaultOrigins.join(','))
	.split(',')
	.map((origin) => origin.trim())
	.filter(Boolean);
app.use(helmet());
app.use(cors({ origin: origins }));
app.use(express.json({ limit: '100kb' }));

const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 20,
	standardHeaders: 'draft-7',
	legacyHeaders: false,
	message: { error: 'Muitas tentativas. Tente novamente mais tarde.' }
});

// Rotas publicas e protegidas
app.use('/auth', authLimiter, authRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/obras', obraRoutes);
app.use('/api/medicoes', medicaoRoutes);
app.use('/api/orcamentos', orcamentoRoutes);
app.use('/api/contratos', contratoRoutes);
app.use('/api/financeiro', financeiroRoutes);
app.use('/api/materiais', materialRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/', (req, res) => res.json({ ok: true, api: 'Sienge-MERN essencial', versao: '1.0.0' }));

const PORT = process.env.PORT || 5000;
app.use((err, req, res, next) => {
	console.error(err);
	if (res.headersSent) return next(err);
	res.status(err.statusCode || 500).json({ error: 'Erro interno do servidor' });
});

async function iniciar() {
	await connectDB();
	app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
}

iniciar().catch((err) => {
	console.error(`Falha ao iniciar o servidor: ${err.message}`);
	process.exit(1);
});
