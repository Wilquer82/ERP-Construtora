import { useEffect, useState } from 'react';
import api, { fmtMoeda, fmtData } from '../api.js';

const vazio = { numero: '', obra: '', cliente: '', valorTotal: 0, numeroParcelas: 1, objeto: '', dataAssinatura: '', dataInicio: '', dataFim: '', status: 'rascunho', observacoes: '' };

export default function Contratos() {
  const [lista, setLista] = useState([]);
  const [obras, setObras] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(vazio);

  const carregar = () => {
    api.get('/contratos').then((r) => setLista(r.data));
    api.get('/obras').then((r) => setObras(r.data));
    api.get('/clientes').then((r) => setClientes(r.data));
  };
  useEffect(() => { carregar(); }, []);

  const abrirNovo = () => { setEditando(null); setForm(vazio); setModal(true); };
  const abrirEdicao = (c) => {
    setEditando(c._id);
    setForm({ ...vazio, ...c, obra: c.obra?._id || '', cliente: c.cliente?._id || '',
      dataAssinatura: c.dataAssinatura?.slice(0, 10) || '', dataInicio: c.dataInicio?.slice(0, 10) || '', dataFim: c.dataFim?.slice(0, 10) || '', numeroParcelas: c.numeroParcelas || 1 });
    setModal(true);
  };

  const salvar = async (e) => {
    e.preventDefault();
    const payload = { ...form, valorTotal: Number(form.valorTotal), numeroParcelas: Number(form.numeroParcelas) || 1 };
    if (editando) await api.put(`/contratos/${editando}`, payload);
    else await api.post('/contratos', payload);
    setModal(false); carregar();
  };

  const excluir = async (id) => {
    if (!window.confirm('Excluir este contrato?')) return;
    await api.delete(`/contratos/${id}`); carregar();
  };

  return (
    <div>
      <div className="topbar">
        <h1>Contratos</h1>
        <button className="btn btn-destaque" onClick={abrirNovo}>+ Novo contrato</button>
      </div>

      <div className="card">
        {lista.length === 0 ? (
          <div className="vazio">Nenhum contrato cadastrado.</div>
        ) : (
          <table>
            <thead><tr><th>Nº</th><th>Obra</th><th>Cliente</th><th>Valor total</th><th>Parcelas</th><th>Assinatura</th><th>Vigência</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c._id}>
                  <td>{c.numero || '-'}</td>
                  <td>{c.obra?.nome || '-'}</td>
                  <td>{c.cliente?.nome || '-'}</td>
                  <td><strong>{fmtMoeda(c.valorTotal)}</strong></td>
                  <td>{c.numeroParcelas || 1}</td>
                  <td>{fmtData(c.dataAssinatura)}</td>
                  <td>{fmtData(c.dataInicio)} → {fmtData(c.dataFim)}</td>
                  <td><span className={`badge ${c.status}`}>{c.status}</span></td>
                  <td>
                    <button className="btn btn-linha btn-mini" onClick={() => abrirEdicao(c)}>Editar</button>{' '}
                    <button className="btn btn-perigo btn-mini" onClick={() => excluir(c._id)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="modal-fundo" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editando ? 'Editar contrato' : 'Novo contrato'}</h2>
            <form onSubmit={salvar}>
              <div className="form-grid">
                <div className="campo"><label>Número</label><input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} /></div>
                <div className="campo"><label>Obra *</label>
                  <select required value={form.obra} onChange={(e) => setForm({ ...form, obra: e.target.value })}>
                    <option value="">— Selecione —</option>
                    {obras.map((o) => <option key={o._id} value={o._id}>{o.nome}</option>)}
                  </select>
                </div>
                <div className="campo"><label>Cliente *</label>
                  <select required value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })}>
                    <option value="">— Selecione —</option>
                    {clientes.map((c) => <option key={c._id} value={c._id}>{c.nome}</option>)}
                  </select>
                </div>
                <div className="campo"><label>Valor total (R$) *</label><input required type="number" step="0.01" value={form.valorTotal} onChange={(e) => setForm({ ...form, valorTotal: e.target.value })} /></div>
                <div className="campo"><label>Nº de parcelas</label><input type="number" min="1" value={form.numeroParcelas} onChange={(e) => setForm({ ...form, numeroParcelas: e.target.value })} /></div>
                <div className="campo"><label>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="rascunho">Rascunho</option>
                    <option value="ativo">Ativo</option>
                    <option value="suspenso">Suspenso</option>
                    <option value="encerrado">Encerrado</option>
                  </select>
                </div>
                <div className="campo"><label>Assinatura</label><input type="date" value={form.dataAssinatura} onChange={(e) => setForm({ ...form, dataAssinatura: e.target.value })} /></div>
                <div className="campo"><label>Início</label><input type="date" value={form.dataInicio} onChange={(e) => setForm({ ...form, dataInicio: e.target.value })} /></div>
                <div className="campo"><label>Término</label><input type="date" value={form.dataFim} onChange={(e) => setForm({ ...form, dataFim: e.target.value })} /></div>
                <div className="campo" style={{ gridColumn: '1 / -1' }}><label>Objeto do contrato</label><textarea rows="2" value={form.objeto} onChange={(e) => setForm({ ...form, objeto: e.target.value })} /></div>
                <div className="campo" style={{ gridColumn: '1 / -1' }}><label>Observações</label><input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
              </div>
              <div className="modal-acoes">
                <button type="button" className="btn btn-linha" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primario">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
