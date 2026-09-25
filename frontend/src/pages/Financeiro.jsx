import { useEffect, useState } from 'react';
import api, { fmtMoeda, fmtData } from '../api.js';
import { exportarFinanceiroCsv } from '../utils/exporters.js';

const vazio = { tipo: 'pagar', descricao: '', categoria: '', valor: 0, dataVencimento: '', status: 'pendente', obra: '', cliente: '', fornecedor: '', formaPagamento: '', observacoes: '' };

export default function Financeiro() {
  const [lista, setLista] = useState([]);
  const [obras, setObras] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(vazio);

  const carregar = () => {
    const params = new URLSearchParams();
    if (filtroTipo) params.append('tipo', filtroTipo);
    if (filtroStatus) params.append('status', filtroStatus);
    api.get(`/financeiro?${params}`).then((r) => setLista(r.data));
    api.get('/obras').then((r) => setObras(r.data));
    api.get('/clientes').then((r) => setClientes(r.data));
  };
  useEffect(() => { carregar(); }, [filtroTipo, filtroStatus]);

  const totalPendente = lista.filter((l) => l.status !== 'pago').reduce((acc, l) => acc + (l.tipo === 'receber' ? l.valor : -l.valor), 0);

  const abrirNovo = () => { setEditando(null); setForm(vazio); setModal(true); };
  const abrirEdicao = (l) => {
    setEditando(l._id);
    setForm({ ...vazio, ...l, obra: l.obra?._id || '', cliente: l.cliente?._id || '', dataVencimento: l.dataVencimento?.slice(0, 10) || '' });
    setModal(true);
  };

  const salvar = async (e) => {
    e.preventDefault();
    const payload = { ...form, valor: Number(form.valor) };
    if (editando) await api.put(`/financeiro/${editando}`, payload);
    else await api.post('/financeiro', payload);
    setModal(false); carregar();
  };

  const baixar = async (id) => {
    await api.post(`/financeiro/${id}/baixar`); carregar();
  };

  const excluir = async (id) => {
    if (!window.confirm('Excluir este lançamento?')) return;
    await api.delete(`/financeiro/${id}`); carregar();
  };

  return (
    <div>
      <div className="topbar">
        <h1>Financeiro (Contas a pagar / receber)</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-linha" onClick={() => exportarFinanceiroCsv(lista)}>Exportar CSV</button>
          <button className="btn btn-destaque" onClick={abrirNovo}>+ Novo lançamento</button>
        </div>
      </div>

      <div className="grid-cards">
        <div className="kpi"><div className="rotulo">Saldo pendente (receber - pagar)</div><div className="valor" style={{ color: totalPendente >= 0 ? 'var(--sucesso)' : 'var(--perigo)' }}>{fmtMoeda(totalPendente)}</div></div>
        <div className="kpi positivo"><div className="rotulo">A receber em aberto</div><div className="valor">{fmtMoeda(lista.filter((l) => l.tipo === 'receber' && l.status !== 'pago').reduce((a, l) => a + l.valor, 0))}</div></div>
        <div className="kpi negativo"><div className="rotulo">A pagar em aberto</div><div className="valor">{fmtMoeda(lista.filter((l) => l.tipo === 'pagar' && l.status !== 'pago').reduce((a, l) => a + l.valor, 0))}</div></div>
      </div>

      <div className="card">
        <div className="filtros">
          <div className="campo"><label>Tipo</label>
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
              <option value="">Todos</option>
              <option value="pagar">A pagar</option>
              <option value="receber">A receber</option>
            </select>
          </div>
          <div className="campo"><label>Status</label>
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
              <option value="">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="atrasado">Atrasado</option>
            </select>
          </div>
        </div>

        {lista.length === 0 ? (
          <div className="vazio">Nenhum lançamento encontrado.</div>
        ) : (
          <table>
            <thead><tr><th>Tipo</th><th>Descrição</th><th>Categoria</th><th>Valor</th><th>Vencimento</th><th>Pagamento</th><th>Obra</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {lista.map((l) => (
                <tr key={l._id}>
                  <td><span className="badge" style={{ background: l.tipo === 'receber' ? '#d5f0e0' : '#fadbd8', color: l.tipo === 'receber' ? '#1e7e45' : '#b03a2e' }}>{l.tipo}</span></td>
                  <td>{l.descricao}</td>
                  <td>{l.categoria || '-'}</td>
                  <td style={{ color: l.tipo === 'receber' ? 'var(--sucesso)' : 'var(--perigo)', fontWeight: 600 }}>{l.tipo === 'receber' ? '+' : '-'}{fmtMoeda(l.valor)}</td>
                  <td>{fmtData(l.dataVencimento)}</td>
                  <td>{fmtData(l.dataPagamento)}</td>
                  <td>{l.obra?.nome || '-'}</td>
                  <td><span className={`badge ${l.status}`}>{l.status}</span></td>
                  <td>
                    {l.status !== 'pago' && <button className="btn btn-sucesso btn-mini" onClick={() => baixar(l._id)}>Baixar</button>}{' '}
                    <button className="btn btn-linha btn-mini" onClick={() => abrirEdicao(l)}>Editar</button>{' '}
                    <button className="btn btn-perigo btn-mini" onClick={() => excluir(l._id)}>✕</button>
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
            <h2>{editando ? 'Editar lançamento' : 'Novo lançamento'}</h2>
            <form onSubmit={salvar}>
              <div className="form-grid">
                <div className="campo"><label>Tipo *</label>
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                    <option value="pagar">A pagar</option>
                    <option value="receber">A receber</option>
                  </select>
                </div>
                <div className="campo"><label>Descrição *</label><input required value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
                <div className="campo"><label>Categoria</label><input placeholder="materiais, mao de obra..." value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></div>
                <div className="campo"><label>Valor (R$) *</label><input required type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
                <div className="campo"><label>Vencimento *</label><input required type="date" value={form.dataVencimento} onChange={(e) => setForm({ ...form, dataVencimento: e.target.value })} /></div>
                <div className="campo"><label>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="pendente">Pendente</option>
                    <option value="pago">Pago</option>
                    <option value="atrasado">Atrasado</option>
                  </select>
                </div>
                <div className="campo"><label>Obra</label>
                  <select value={form.obra} onChange={(e) => setForm({ ...form, obra: e.target.value })}>
                    <option value="">—</option>
                    {obras.map((o) => <option key={o._id} value={o._id}>{o.nome}</option>)}
                  </select>
                </div>
                <div className="campo"><label>Cliente</label>
                  <select value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })}>
                    <option value="">—</option>
                    {clientes.map((c) => <option key={c._id} value={c._id}>{c.nome}</option>)}
                  </select>
                </div>
                <div className="campo"><label>Fornecedor</label><input value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} /></div>
                <div className="campo"><label>Forma de pagamento</label><input value={form.formaPagamento} onChange={(e) => setForm({ ...form, formaPagamento: e.target.value })} /></div>
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
