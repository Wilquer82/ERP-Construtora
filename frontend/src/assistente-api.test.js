// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import router from '../../backend/routes/assistente.js';
import Mensagem from '../../backend/models/MensagemAssistente.js';
import { processarMensagemIA, executarPreviasConfirmadas } from '../../backend/services/assistente/whatsappProcessor.js';

const express = createRequire(new URL('../../backend/package.json', import.meta.url))('express');

vi.mock('../../backend/middleware/auth.js', () => ({ protect: (req, res, next) => { req.user = { id: 'user-1', empresa: 'empresa-1' }; next(); } }));
vi.mock('../../backend/services/assistente/index.js', () => ({ assistente: {}, criarAssistenteComChave: vi.fn() }));
vi.mock('../../backend/services/assistente/whatsappProcessor.js', () => ({ processarMensagemIA: vi.fn(), executarPreviasConfirmadas: vi.fn() }));
vi.mock('../../backend/models/MensagemAssistente.js', () => ({ default: { create: vi.fn(), findOne: vi.fn(), findOneAndUpdate: vi.fn(), updateOne: vi.fn() } }));

let server;
let base;
const previas = [{ modelo: 'Lancamento', acao: 'criar', dados: { valor: 100 } }];
const documento = {
  _id: '507f1f77bcf86cd799439011',
  confirmacao: { _id: '507f1f77bcf86cd799439012', status: 'pendente', previas },
};
beforeEach(async () => {
  vi.clearAllMocks();
  const app = express();
  app.use(express.json());
  app.use(router);
  app.use((err, req, res, next) => res.status(500).json({ error: err.message }));
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  Mensagem.create.mockResolvedValue(documento);
  Mensagem.findOneAndUpdate.mockResolvedValue(documento);
  Mensagem.updateOne.mockResolvedValue({ modifiedCount: 1 });
  executarPreviasConfirmadas.mockResolvedValue([{ sucesso: true }]);
});
afterEach(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
const post = (path, body) => fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

it('persiste a prévia e devolve IDs distintos sem gravar a movimentação financeira', async () => {
  processarMensagemIA.mockResolvedValue({ resposta: 'Confira a despesa', requerConfirmacao: true, previas });
  const resp = await post('/whatsapp/processar', { mensagem: 'Criar despesa de 100' });
  const data = await resp.json();
  expect(resp.status).toBe(200);
  expect(data.interacaoId).toBe(documento._id);
  expect(data.confirmacaoId).toBe(documento.confirmacao._id);
  expect(Mensagem.create).toHaveBeenCalledWith(expect.objectContaining({ usuario: 'user-1', empresa: 'empresa-1', confirmacao: { previas } }));
  expect(executarPreviasConfirmadas).not.toHaveBeenCalled();
});

it('executa somente a prévia salva para o usuário e marca a confirmação como concluída', async () => {
  const resp = await post('/whatsapp/executar-previas', {
    interacaoIAId: documento._id, confirmacaoId: documento.confirmacao._id, previas: [{ dados: { valor: 9999 } }]
  });
  expect(resp.status).toBe(200);
  expect(executarPreviasConfirmadas).toHaveBeenCalledWith('empresa-1', previas, 'user-1');
  expect(Mensagem.findOneAndUpdate).toHaveBeenCalledWith(expect.objectContaining({
    usuario: 'user-1', empresa: 'empresa-1', 'confirmacao._id': documento.confirmacao._id, 'confirmacao.status': 'pendente'
  }), expect.any(Object), expect.any(Object));
  expect(Mensagem.updateOne).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ $set: expect.objectContaining({ 'confirmacao.status': 'concluida' }) }));
});

it('bloqueia confirmação repetida ou uma prévia de outro usuário sem executar lançamentos', async () => {
  Mensagem.findOneAndUpdate.mockResolvedValue(null);
  const resp = await post('/whatsapp/executar-previas', { interacaoIAId: documento._id, confirmacaoId: documento.confirmacao._id });
  expect(resp.status).toBe(409);
  expect(executarPreviasConfirmadas).not.toHaveBeenCalled();
});

it('mantém a prévia bloqueada se a execução falha após uma possível gravação parcial', async () => {
  executarPreviasConfirmadas.mockRejectedValue(new Error('Falha na gravação'));
  const resp = await post('/whatsapp/executar-previas', { interacaoIAId: documento._id, confirmacaoId: documento.confirmacao._id });
  expect(resp.status).toBe(500);
  expect(Mensagem.updateOne).toHaveBeenCalledWith(expect.any(Object), {
    $set: { 'confirmacao.status': 'erro', 'confirmacao.erro': 'Falha na gravação' }
  });
});
