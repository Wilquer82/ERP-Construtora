import { useEffect, useState } from 'react';
import api, { fmtMoeda, fmtData } from '../api.js';

const itemVazio = { descricao: '', unidade: 'und', quantidade: 1, custoUnitario: 0, materialVinculado: '' };
const vazio = { obra: '', cliente: '', descricao: '', itens: [{ ...itemVazio }], desconto: 0, acrescimo: 0, status: 'rascunho', validadeDias: 30 };

export default function Orcamentos() {
  const [lista, setLista] = useState([]);
  const [obras, setObras] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [materiais, setMateriais] = useState([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(vazio);

  const carregar = () => {
    api.get('/orcamentos').then((r) => setLista(r.data));
    api.get('/obras').then((r) => setObras(r.data));
    api.get('/clientes').then((r) => setClientes(r.data));
    api.get('/materiais').then((r) => setMateriais(r.data));
  };
  useEffect(() => { carregar(); }, []);

  const totalItens = form.itens.reduce((acc, it) => acc + (Number(it.quantidade) * Number(it.custoUnitario)), 0);
  const totalGeral = totalItens - Number(form.desconto || 0) + Number(form.acrescimo || 0);
  const bloqueadoAprovado = form.status === 'aprovado';

  const abrirNovo = () => { setEditando(null); setForm({ ...vazio, itens: [{ ...itemVazio }] }); setModal(true); };
  const abrirEdicao = (o) => {
    setEditando(o._id);
    setForm({ ...vazio, ...o, itens: o.itens.length ? o.itens.map((it) => ({ ...it, materialVinculado: it.materialVinculado || '' })) : [{ ...itemVazio }] });
    setModal(true);
  };

  const salvar = async (e) => {
    e.preventDefault();
    const payload = { ...form, itens: form.itens.filter((i) => i.descricao && i.descricao.trim()) };
    if (editando) await api.put(`/orcamentos/${editando}`, payload);
    else await api.post('/orcamentos', payload);
    setModal(false); carregar();
  };

  const excluir = async (id) => {
    if (!window.confirm('Excluir este orçamento?')) return;
    await api.delete(`/orcamentos/${id}`); carregar();
  };

  const gerarContrato = async (id) => {
    const parcelas = Number(window.prompt('Número de parcelas para gerar o contrato:', '1') || '1');
    if (!parcelas || parcelas < 1) return;
    await api.post(`/orcamentos/${id}/gerar-contrato`, { numeroParcelas: parcelas });
    carregar();
  };

  const setItem = (idx, campo, valor) => {
    const itens = [...form.itens];
    itens[idx][campo] = valor;
    setForm({ ...form, itens });
  };

  return (
    <div>
      <div className="topbar">
        <h1>Orçamentos</h1>
        <button className="btn btn-destaque" onClick={abrirNovo}>+ Novo orçamento</button>
      </div>

      <div className="card">
        {lista.length === 0 ? (
          <div className="vazio">Nenhum orçamento cadastrado.</div>
        ) : (
          <table>
            <thead><tr><th>Obra</th><th>Cliente</th><th>Descrição</th><th>Itens</th><th>Total</th><th>Status</th><th>Criado em</th><th>Ações</th></tr></thead>
            <tbody>
              {lista.map((o) => (
                <tr key={o._id}>
                  <td>{o.obra?.nome || '-'}</td>
                  <td>{o.cliente?.nome || '-'}</td>
                  <td>{o.descricao || '-'}</td>
                  <td>{o.itens.length}</td>
                  <td><strong>{fmtMoeda(o.total || 0)}</strong></td>
                  <td><span className={`badge ${o.status}`}>{o.status}</span></td>
                  <td>{fmtData(o.createdAt)}</td>
                  <td>
                    <button className="btn btn-linha btn-mini" onClick={() => abrirEdicao(o)}>Editar</button>{' '}
                    {o.status === 'aprovado' && (
                      <button className="btn btn-linha btn-mini" onClick={() => gerarContrato(o._id)}>Gerar contrato</button>
                    )}{' '}
                    <button className="btn btn-perigo btn-mini" onClick={() => excluir(o._id)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="modal-fundo" onClick={() => setModal(false)}>
          <div className="modal" style={{ maxWidth: 780 }} onClick={(e) => e.stopPropagation()}>
            <h2>{editando ? 'Editar orçamento' : 'Novo orçamento'}</h2>
            <form onSubmit={salvar}>
              <div className="form-grid">
                <div className="campo"><label>Obra *</label>
                  <select required value={form.obra} onChange={(e) => setForm({ ...form, obra: e.target.value })} disabled={bloqueadoAprovado}>
                    <option value="">— Selecione —</option>
                    {obras.map((o) => <option key={o._id} value={o._id}>{o.nome}</option>)}
                  </select>
                </div>
                <div className="campo"><label>Cliente</label>
                  <select value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} disabled={bloqueadoAprovado}>
                    <option value="">— Selecione —</option>
                    {clientes.map((c) => <option key={c._id} value={c._id}>{c.nome}</option>)}
                  </select>
                </div>
                <div className="campo"><label>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} disabled={bloqueadoAprovado}>
                    <option value="rascunho">Rascunho</option>
                    <option value="aprovado">Aprovado</option>
                    <option value="rejeitado">Rejeitado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
                <div className="campo"><label>Validade (dias)</label><input type="number" value={form.validadeDias} onChange={(e) => setForm({ ...form, validadeDias: e.target.value })} disabled={bloqueadoAprovado} /></div>
                <div className="campo" style={{ gridColumn: '1 / -1' }}><label>Descrição</label><input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} disabled={bloqueadoAprovado} /></div>
              </div>

              <h3 style={{ margin: '16px 0 8px', fontSize: 14, color: 'var(--primaria-escura)' }}>Itens do orçamento</h3>
              <table>
                <thead><tr><th>Descrição</th><th>Un.</th><th>Qtd.</th><th>Custo unit.</th><th>Material</th><th>Total</th><th></th></tr></thead>
                <tbody>
                  {form.itens.map((it, idx) => (
                    <tr key={idx}>
                      <td><input style={{ width: '100%' }} value={it.descricao} onChange={(e) => setItem(idx, 'descricao', e.target.value)} disabled={bloqueadoAprovado} /></td>
                      <td><input style={{ width: 60 }} value={it.unidade} onChange={(e) => setItem(idx, 'unidade', e.target.value)} disabled={bloqueadoAprovado} /></td>
                      <td><input style={{ width: 70 }} type="number" value={it.quantidade} onChange={(e) => setItem(idx, 'quantidade', e.target.value)} disabled={bloqueadoAprovado} /></td>
                      <td><input style={{ width: 110 }} type="number" step="0.01" value={it.custoUnitario} onChange={(e) => setItem(idx, 'custoUnitario', e.target.value)} disabled={bloqueadoAprovado} /></td>
                      <td>
                        <select value={it.materialVinculado || ''} onChange={(e) => setItem(idx, 'materialVinculado', e.target.value)} disabled={bloqueadoAprovado}>
                          <option value="">— Sem vínculo —</option>
                          {materiais.map((material) => <option key={material._id} value={material._id}>{material.nome}</option>)}
                        </select>
                      </td>
                      <td>{fmtMoeda(Number(it.quantidade) * Number(it.custoUnitario))}</td>
                      <td><button type="button" className="btn btn-perigo btn-mini" onClick={() => setForm({ ...form, itens: form.itens.filter((_, i) => i !== idx) })} disabled={bloqueadoAprovado}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!bloqueadoAprovado && (
                <button type="button" className="btn btn-linha btn-mini" style={{ marginTop: 8 }}
                  onClick={() => setForm({ ...form, itens: [...form.itens, { ...itemVazio }] })}>+ Adicionar item</button>
              )}

              <div className="form-grid" style={{ marginTop: 14 }}>
                <div className="campo"><label>Desconto (R$)</label><input type="number" step="0.01" value={form.desconto} onChange={(e) => setForm({ ...form, desconto: e.target.value })} disabled={bloqueadoAprovado} /></div>
                <div className="campo"><label>Acréscimo (R$)</label><input type="number" step="0.01" value={form.acrescimo} onChange={(e) => setForm({ ...form, acrescimo: e.target.value })} disabled={bloqueadoAprovado} /></div>
                <div className="campo"><label>Total geral</label><input readOnly value={fmtMoeda(totalGeral)} style={{ background: '#eef2f6', fontWeight: 700 }} /></div>
              </div>

              <div className="modal-acoes">
                <button type="button" className="btn btn-linha" onClick={() => setModal(false)}>Cancelar</button>
                {!bloqueadoAprovado && <button type="submit" className="btn btn-primario">Salvar</button>}
                {bloqueadoAprovado && <button type="button" className="btn btn-primario" onClick={() => setModal(false)}>Fechar</button>}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
