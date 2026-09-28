import { useEffect, useMemo, useState } from 'react';
import api, { fmtMoeda } from '../api.js';

const vazioItem = { material: '', materialVinculado: '', descricao: '', unidade: 'und', quantidade: 1, custoUnitario: 0 };
const vazio = {
  numero: '',
  fornecedor: '',
  obra: '',
  status: 'rascunho',
  dataPedido: '',
  dataEntregaPrevista: '',
  observacoes: '',
  itens: [ { ...vazioItem } ]
};

const hoje = () => {
  const data = new Date();
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
};

export default function Compras() {
  const [lista, setLista] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [obras, setObras] = useState([]);
  const [materiais, setMateriais] = useState([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(vazio);
  const [recebendo, setRecebendo] = useState(null);
  const [vencimentoRecebimento, setVencimentoRecebimento] = useState(hoje());

  const carregar = async () => {
    const [resCompras, resFornecedores, resObras, resMateriais] = await Promise.all([
      api.get('/compras'),
      api.get('/fornecedores'),
      api.get('/obras'),
      api.get('/materiais')
    ]);
    setLista(resCompras.data);
    setFornecedores(resFornecedores.data);
    setObras(resObras.data);
    setMateriais(resMateriais.data);
  };

  useEffect(() => { carregar(); }, []);

  const abrirNovo = () => { setEditando(null); setForm(vazio); setModal(true); };
  const abrirEdicao = (c) => {
    setEditando(c._id);
    setForm({
      ...vazio,
      ...c,
      fornecedor: c.fornecedor?._id || c.fornecedor || '',
      obra: c.obra?._id || c.obra || '',
      itens: (c.itens || []).length ? c.itens.map((i) => ({
        ...i,
        materialVinculado: i.materialVinculado?._id || i.materialVinculado || '',
        quantidade: Number(i.quantidade || 0),
        custoUnitario: Number(i.custoUnitario || 0)
      })) : [{ ...vazioItem }],
      dataPedido: c.dataPedido ? new Date(c.dataPedido).toISOString().slice(0, 10) : '',
      dataEntregaPrevista: c.dataEntregaPrevista ? new Date(c.dataEntregaPrevista).toISOString().slice(0, 10) : ''
    });
    setModal(true);
  };

  const totalPedido = useMemo(() => (form.itens || []).reduce((acc, item) => acc + ((Number(item.quantidade) || 0) * (Number(item.custoUnitario) || 0)), 0), [form.itens]);

  const atualizarItem = (index, campo, valor) => {
    const itens = [...form.itens];
    itens[index] = { ...itens[index], [campo]: valor };
    setForm({ ...form, itens });
  };

  const vincularMaterialItem = (index, id) => {
    const material = materiais.find((item) => item._id === id);
    const itens = [...form.itens];
    itens[index] = {
      ...itens[index],
      materialVinculado: id,
      material: material?.nome || '',
      unidade: material?.unidade || itens[index].unidade,
      descricao: itens[index].descricao || material?.nome || ''
    };
    setForm({ ...form, itens });
  };

  const adicionarItem = () => setForm({ ...form, itens: [...form.itens, { ...vazioItem }] });
  const removerItem = (index) => {
    if (form.itens.length === 1) return setForm({ ...form, itens: [{ ...vazioItem }] });
    setForm({ ...form, itens: form.itens.filter((_, i) => i !== index) });
  };

  const salvar = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        itens: form.itens.map((item) => ({
          ...item,
          quantidade: Number(item.quantidade || 0),
          custoUnitario: Number(item.custoUnitario || 0)
        }))
      };
      if (editando) await api.put(`/compras/${editando}`, payload);
      else await api.post('/compras', payload);
      setModal(false); carregar();
    } catch (error) {
      window.alert(error.response?.data?.error || 'Não foi possível salvar o pedido de compra.');
    }
  };

  const excluir = async (id) => {
    if (!window.confirm('Excluir este pedido de compra?')) return;
    await api.delete(`/compras/${id}`); carregar();
  };

  const abrirRecebimento = (pedido) => {
    setRecebendo(pedido);
    setVencimentoRecebimento(hoje());
  };

  const confirmarRecebimento = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/compras/${recebendo._id}/receber`, { dataVencimento: vencimentoRecebimento });
      setRecebendo(null);
      await carregar();
    } catch (error) {
      window.alert(error.response?.data?.error || 'Não foi possível registrar o recebimento.');
    }
  };

  return (
    <div>
      <div className="topbar">
        <h1>Compras / Pedidos</h1>
        <button className="btn btn-destaque" onClick={abrirNovo}>+ Novo pedido</button>
      </div>

      <div className="card">
        {lista.length === 0 ? (
          <div className="vazio">Nenhum pedido de compra cadastrado.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Número</th>
                <th>Fornecedor</th>
                <th>Obra</th>
                <th>Data</th>
                <th>Status</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c._id}>
                  <td>{c.numero}</td>
                  <td>{c.fornecedor?.nome || c.fornecedor?.razaoSocial || '-'}</td>
                  <td>{c.obra?.nome || '-'}</td>
                  <td>{new Date(c.dataPedido).toLocaleDateString('pt-BR')}</td>
                  <td>{c.status}</td>
                  <td>{fmtMoeda(c.valorTotal || 0)}</td>
                  <td>
                    <button className="btn btn-linha btn-mini" onClick={() => abrirEdicao(c)} disabled={c.status === 'recebido'}>Editar</button>{' '}
                    {['aprovado', 'em_aberto'].includes(c.status) && <button className="btn btn-primario btn-mini" onClick={() => abrirRecebimento(c)}>Receber</button>}{' '}
                    <button className="btn btn-perigo btn-mini" onClick={() => excluir(c._id)} disabled={c.status === 'recebido'}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="modal-fundo" onClick={() => setModal(false)}>
          <div className="modal modal-xl" onClick={(e) => e.stopPropagation()}>
            <h2>{editando ? 'Editar pedido de compra' : 'Novo pedido de compra'}</h2>
            <form onSubmit={salvar}>
              <div className="form-grid">
                <div className="campo"><label>Número *</label><input required value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} /></div>
                <div className="campo"><label>Fornecedor *</label>
                  <select required value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}>
                    <option value="">Selecione</option>
                    {fornecedores.map((f) => <option key={f._id} value={f._id}>{f.nome}</option>)}
                  </select>
                </div>
                <div className="campo"><label>Obra</label>
                  <select value={form.obra} onChange={(e) => setForm({ ...form, obra: e.target.value })}>
                    <option value="">Sem obra vinculada</option>
                    {obras.map((o) => <option key={o._id} value={o._id}>{o.nome}</option>)}
                  </select>
                </div>
                <div className="campo"><label>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="rascunho">Rascunho</option>
                    <option value="aprovado">Aprovado</option>
                    <option value="em_aberto">Em aberto</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
                <div className="campo"><label>Data do pedido</label><input type="date" value={form.dataPedido} onChange={(e) => setForm({ ...form, dataPedido: e.target.value })} /></div>
                <div className="campo"><label>Entrega prevista</label><input type="date" value={form.dataEntregaPrevista} onChange={(e) => setForm({ ...form, dataEntregaPrevista: e.target.value })} /></div>
                <div className="campo" style={{ gridColumn: '1 / -1' }}><label>Observações</label><input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
              </div>

              <div style={{ margin: '20px 0 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Itens do pedido</strong>
                <button type="button" className="btn btn-linha btn-mini" onClick={adicionarItem}>+ Item</button>
              </div>

              {(form.itens || []).map((item, index) => (
                <div key={index} className="linha-itens" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.5fr 0.8fr 0.8fr 1fr auto', gap: 8, alignItems: 'end', marginBottom: 12 }}>
                  <div className="campo"><label>Material do estoque *</label>
                    <select required value={item.materialVinculado || ''} onChange={(e) => vincularMaterialItem(index, e.target.value)}>
                      <option value="">Selecione</option>
                      {materiais.map((material) => <option key={material._id} value={material._id}>{material.nome}</option>)}
                    </select>
                  </div>
                  <div className="campo"><label>Descrição</label><input value={item.descricao} onChange={(e) => atualizarItem(index, 'descricao', e.target.value)} /></div>
                  <div className="campo"><label>Unidade</label><input value={item.unidade} onChange={(e) => atualizarItem(index, 'unidade', e.target.value)} /></div>
                  <div className="campo"><label>Qtd</label><input type="number" min="0.01" step="0.01" value={item.quantidade} onChange={(e) => atualizarItem(index, 'quantidade', e.target.value)} /></div>
                  <div className="campo"><label>Unitário</label><input type="number" min="0" step="0.01" value={item.custoUnitario} onChange={(e) => atualizarItem(index, 'custoUnitario', e.target.value)} /></div>
                  <button type="button" className="btn btn-perigo btn-mini" onClick={() => removerItem(index)}>Remover</button>
                </div>
              ))}

              <div style={{ marginTop: 12, fontWeight: 700, fontSize: 16, textAlign: 'right' }}>
                Total do pedido: {fmtMoeda(totalPedido)}
              </div>

              <div className="modal-acoes">
                <button type="button" className="btn btn-linha" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primario">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {recebendo && (
        <div className="modal-fundo" onClick={() => setRecebendo(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Registrar recebimento — {recebendo.numero}</h2>
            <p>Os materiais vinculados entrarão no estoque e será criada uma conta a pagar de {fmtMoeda(recebendo.valorTotal)}.</p>
            <form onSubmit={confirmarRecebimento}>
              <div className="campo"><label>Vencimento da conta a pagar *</label><input required type="date" value={vencimentoRecebimento} onChange={(e) => setVencimentoRecebimento(e.target.value)} /></div>
              <div className="modal-acoes">
                <button type="button" className="btn btn-linha" onClick={() => setRecebendo(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primario">Confirmar recebimento</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
