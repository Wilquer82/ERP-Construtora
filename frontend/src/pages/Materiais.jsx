import { useEffect, useState } from 'react';
import api from '../api.js';
import { exportarMateriaisCsv, exportarMateriaisExcel } from '../utils/exporters.js';

const vazio = { codigo: '', nome: '', categoria: '', unidade: 'und', estoqueAtual: 0, estoqueMinimo: 0, custoUnitario: 0, fornecedor: '' };

export default function Materiais() {
  const [lista, setLista] = useState([]);
  const [obras, setObras] = useState([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(vazio);
  const [mov, setMov] = useState(null); // { materialId, tipo }
  const [movQtd, setMovQtd] = useState(1);
  const [movObra, setMovObra] = useState('');
  const [movObs, setMovObs] = useState('');

  const carregar = () => {
    api.get('/materiais').then((r) => setLista(r.data));
    api.get('/obras').then((r) => setObras(r.data));
  };
  useEffect(() => { carregar(); }, []);

  const abrirNovo = () => { setEditando(null); setForm(vazio); setModal(true); };
  const abrirEdicao = (m) => { setEditando(m._id); setForm({ ...vazio, ...m }); setModal(true); };

  const salvar = async (e) => {
    e.preventDefault();
    const payload = { ...form, estoqueAtual: Number(form.estoqueAtual), estoqueMinimo: Number(form.estoqueMinimo), custoUnitario: Number(form.custoUnitario) };
    if (editando) await api.put(`/materiais/${editando}`, payload);
    else await api.post('/materiais', payload);
    setModal(false); carregar();
  };

  const excluir = async (id) => {
    if (!window.confirm('Excluir este material?')) return;
    await api.delete(`/materiais/${id}`); carregar();
  };

  const confirmarMov = async () => {
    await api.post(`/materiais/${mov.materialId}/movimento`, { tipo: mov.tipo, quantidade: movQtd, obra: movObra || undefined, observacao: movObs });
    setMov(null); setMovQtd(1); setMovObra(''); setMovObs(''); carregar();
  };

  return (
    <div>
      <div className="topbar">
        <h1>Materiais / Estoque</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-linha" onClick={() => exportarMateriaisCsv(lista)}>CSV</button>
          <button className="btn btn-linha" onClick={() => exportarMateriaisExcel(lista).catch(() => window.alert('Não foi possível gerar o arquivo Excel.'))}>Excel</button>
          <button className="btn btn-destaque" onClick={abrirNovo}>+ Novo material</button>
        </div>
      </div>

      <div className="card">
        {lista.length === 0 ? (
          <div className="vazio">Nenhum material cadastrado.</div>
        ) : (
          <table>
            <thead><tr><th>Cód.</th><th>Material</th><th>Categoria</th><th>Un.</th><th>Estoque atual</th><th>Mínimo</th><th>Custo unit.</th><th>Fornecedor</th><th>Ações</th></tr></thead>
            <tbody>
              {lista.map((m) => {
                const abaixo = m.estoqueAtual < m.estoqueMinimo;
                return (
                  <tr key={m._id} style={abaixo ? { background: '#fef5e7' } : {}}>
                    <td>{m.codigo || '-'}</td>
                    <td>{m.nome}</td>
                    <td>{m.categoria || '-'}</td>
                    <td>{m.unidade}</td>
                    <td style={{ fontWeight: 700, color: abaixo ? 'var(--perigo)' : 'inherit' }}>{m.estoqueAtual} {abaixo && '⚠'}</td>
                    <td>{m.estoqueMinimo}</td>
                    <td>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.custoUnitario)}</td>
                    <td>{m.fornecedor || '-'}</td>
                    <td>
                      <button className="btn btn-sucesso btn-mini" onClick={() => setMov({ materialId: m._id, tipo: 'entrada' })}>Entrada</button>{' '}
                      <button className="btn btn-linha btn-mini" onClick={() => setMov({ materialId: m._id, tipo: 'saida' })}>Saída</button>{' '}
                      <button className="btn btn-perigo btn-mini" onClick={() => excluir(m._id)}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="modal-fundo" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editando ? 'Editar material' : 'Novo material'}</h2>
            <form onSubmit={salvar}>
              <div className="form-grid">
                <div className="campo"><label>Código</label><input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></div>
                <div className="campo"><label>Nome *</label><input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
                <div className="campo"><label>Categoria</label><input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></div>
                <div className="campo"><label>Unidade</label><input value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} /></div>
                <div className="campo"><label>Estoque atual</label><input type="number" value={form.estoqueAtual} onChange={(e) => setForm({ ...form, estoqueAtual: e.target.value })} /></div>
                <div className="campo"><label>Estoque mínimo</label><input type="number" value={form.estoqueMinimo} onChange={(e) => setForm({ ...form, estoqueMinimo: e.target.value })} /></div>
                <div className="campo"><label>Custo unitário (R$)</label><input type="number" step="0.01" value={form.custoUnitario} onChange={(e) => setForm({ ...form, custoUnitario: e.target.value })} /></div>
                <div className="campo"><label>Fornecedor</label><input value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} /></div>
              </div>
              <div className="modal-acoes">
                <button type="button" className="btn btn-linha" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primario">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mov && (
        <div className="modal-fundo" onClick={() => setMov(null)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <h2>{mov.tipo === 'entrada' ? 'Entrada de estoque' : 'Saída de estoque'}</h2>
            <div className="form-grid">
              <div className="campo"><label>Quantidade</label><input type="number" min="0.01" step="0.01" value={movQtd} onChange={(e) => setMovQtd(e.target.value)} /></div>
              <div className="campo"><label>Obra (para saída)</label>
                <select value={movObra} onChange={(e) => setMovObra(e.target.value)}>
                  <option value="">—</option>
                  {obras.map((o) => <option key={o._id} value={o._id}>{o.nome}</option>)}
                </select>
              </div>
              <div className="campo" style={{ gridColumn: '1 / -1' }}><label>Observação</label><input value={movObs} onChange={(e) => setMovObs(e.target.value)} /></div>
            </div>
            <div className="modal-acoes">
              <button className="btn btn-linha" onClick={() => setMov(null)}>Cancelar</button>
              <button className="btn btn-primario" onClick={confirmarMov}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
