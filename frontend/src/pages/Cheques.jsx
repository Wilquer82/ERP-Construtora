import { useEffect, useState } from 'react';
import api from '../api.js';
import { fmtMoeda, fmtData } from '../api.js';

const vazioCh = { 
  numeroFolha: '', banco: '', agencia: '', conta: '', favorecido: '', cpfCnpjFavorecido: '',
  centroCusto: '', dataVencimento: '', valor: 0, status: 'em_dia', forma: 'descontado_em_conta',
  observacao: '', arquivoFolha: '', contaBancaria: '' 
};

export default function Cheques() {
  const [lista, setLista] = useState([]);
  const [obras, setObras] = useState([]);
  const [contasBancarias, setContasBancarias] = useState([]);
  const [modal, setModal] = useState(false);
  const [modalBaixa, setModalBaixa] = useState(false);
  const [editando, setEditando] = useState(null);
  const [chequeBaixa, setChequeBaixa] = useState(null);
  const [form, setForm] = useState(vazioCh);
  const [baixaForm, setBaixaForm] = useState({ dataPagamento: '', contaBancaria: '', lancamentoId: '' });
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  const carregar = async () => {
    try {
      const params = new URLSearchParams();
      if (filtroStatus) params.append('status', filtroStatus);
      const [cheques, obrs, contas, res] = await Promise.all([
        api.get(`/cheques?${params}`),
        api.get('/obras'),
        api.get('/contas-bancarias'),
        api.get('/cheques/resumo')
      ]);
      setLista(cheques.data);
      setObras(obrs.data);
      setContasBancarias(contas.data.contas || []);
      setResumo(res.data);
    } catch (error) {
      setErro('Não foi possível carregar cheques.');
    }
  };
  useEffect(() => { carregar(); }, [filtroStatus]);

  const abrirNovo = () => { setEditando(null); setForm(vazioCh); setModal(true); };
  const abrirEdicao = (c) => { 
    setEditando(c._id); 
    setForm({ 
      ...vazioCh, 
      ...c, 
      centroCusto: c.centroCusto?._id || c.centroCusto,
      contaBancaria: c.contaBancaria?._id || c.contaBancaria,
      dataVencimento: c.dataVencimento?.slice(0, 10) || '',
      dataPagamento: c.dataPagamento?.slice(0, 10) || ''
    }); 
    setModal(true); 
  };

  const salvar = async (ev) => {
    ev.preventDefault();
    try {
      const payload = { ...form, valor: Number(form.valor) };
      if (editando) await api.put(`/cheques/${editando}`, payload);
      else await api.post('/cheques', payload);
      setModal(false); carregar();
    } catch (error) {
      setErro(error.response?.data?.error || 'Erro ao salvar.');
    }
  };

  const excluir = async (id) => {
    if (!window.confirm('Excluir este cheque?')) return;
    try { await api.delete(`/cheques/${id}`); carregar(); }
    catch { setErro('Não foi possível excluir.'); }
  };

  const abrirBaixa = (c) => {
    setChequeBaixa(c);
    setBaixaForm({ dataPagamento: new Date().toISOString().slice(0, 10), contaBancaria: '', lancamentoId: '' });
    setModalBaixa(true);
  };

  const confirmarBaixa = async (ev) => {
    ev.preventDefault();
    try {
      await api.post(`/cheques/${chequeBaixa._id}/baixar`, baixaForm);
      setModalBaixa(false);
      carregar();
    } catch (error) {
      setErro(error.response?.data?.error || 'Erro ao baixar cheque.');
    }
  };

  const statusColors = {
    em_dia: 'sucesso',
    pago: 'primario',
    em_atraso: 'aviso',
    devolvido: 'perigo',
    sustado: 'neutro'
  };

  return (
    <div>
      <div className="topbar">
        <h1>Controle de Cheques</h1>
        <button className="btn btn-primario" onClick={abrirNovo}>+ Novo cheque</button>
      </div>

      {resumo && (
        <div className="grid-cards" style={{marginBottom: 16}}>
          <div className="kpi"><div className="rotulo">Em dia</div><div className="valor">{fmtMoeda(resumo.emDia?.total || 0)} ({resumo.emDia?.count || 0})</div></div>
          <div className="kpi"><div className="rotulo">Pagos</div><div className="valor">{fmtMoeda(resumo.pagos?.total || 0)} ({resumo.pagos?.count || 0})</div></div>
          <div className="kpi"><div className="rotulo">Em atraso</div><div className="valor">{fmtMoeda(resumo.emAtraso?.total || 0)} ({resumo.emAtraso?.count || 0})</div></div>
          <div className="kpi"><div className="rotulo">Devolvidos</div><div className="valor">{fmtMoeda(resumo.devolvidos?.total || 0)} ({resumo.devolvidos?.count || 0})</div></div>
          <div className="kpi"><div className="rotulo">Sustados</div><div className="valor">{fmtMoeda(resumo.sustados?.total || 0)} ({resumo.sustados?.count || 0})</div></div>
        </div>
      )}

      {erro && <div className="erro" role="alert">{erro}</div>}

      <div className="filtros">
        <div className="campo"><label>Status</label>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="em_dia">Em dia</option>
            <option value="pago">Pago</option>
            <option value="em_atraso">Em atraso</option>
            <option value="devolvido">Devolvido</option>
            <option value="sustado">Sustado</option>
          </select>
        </div>
      </div>

      {lista.length === 0 ? (
        <div className="vazio">Nenhum cheque encontrado.</div>
      ) : (
        <table>
          <thead><tr><th>Folha</th><th>Banco</th><th>Favorecido</th><th>Valor</th><th>Vencimento</th><th>Pagamento</th><th>Obra</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {lista.map(c => (
              <tr key={c._id}>
                <td>{c.numeroFolha}</td>
                <td>{c.banco}</td>
                <td>{c.favorecido}</td>
                <td>{fmtMoeda(c.valor)}</td>
                <td>{fmtData(c.dataVencimento)}</td>
                <td>{fmtData(c.dataPagamento)}</td>
                <td>{c.centroCusto?.nome || '-'}</td>
                <td><span className={`badge ${statusColors[c.status] || ''}`}>{c.status.replace('_', ' ')}</span></td>
                <td>
                  {c.status !== 'pago' && <button className="btn btn-sucesso btn-mini" onClick={() => abrirBaixa(c)}>Baixar</button>}
                  <button className="btn btn-linha btn-mini" onClick={() => abrirEdicao(c)}>Editar</button>
                  <button className="btn btn-perigo btn-mini" onClick={() => excluir(c._id)}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal && (
        <div className="modal-fundo" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editando ? 'Editar cheque' : 'Novo cheque'}</h2>
            <form onSubmit={salvar}>
              <div className="form-grid">
                <div className="campo"><label>Número da Folha *</label><input required value={form.numeroFolha} onChange={e => setForm({...form, numeroFolha: e.target.value})} /></div>
                <div className="campo"><label>Banco *</label><input required value={form.banco} onChange={e => setForm({...form, banco: e.target.value})} /></div>
                <div className="campo"><label>Agência</label><input value={form.agencia} onChange={e => setForm({...form, agencia: e.target.value})} /></div>
                <div className="campo"><label>Conta</label><input value={form.conta} onChange={e => setForm({...form, conta: e.target.value})} /></div>
                <div className="campo"><label>Favorecido *</label><input required value={form.favorecido} onChange={e => setForm({...form, favorecido: e.target.value})} /></div>
                <div className="campo"><label>CPF/CNPJ Favorecido</label><input value={form.cpfCnpjFavorecido} onChange={e => setForm({...form, cpfCnpjFavorecido: e.target.value})} /></div>
                <div className="campo"><label>Obra/Centro de Custo</label>
                  <select value={form.centroCusto} onChange={e => setForm({...form, centroCusto: e.target.value})}>
                    <option value="">—</option>
                    {obras.map(o => <option key={o._id} value={o._id}>{o.nome}</option>)}
                  </select>
                </div>
                <div className="campo"><label>Vencimento *</label><input required type="date" value={form.dataVencimento} onChange={e => setForm({...form, dataVencimento: e.target.value})} /></div>
                <div className="campo"><label>Valor (R$) *</label><input required type="number" step="0.01" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} /></div>
                <div className="campo"><label>Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    <option value="em_dia">Em dia</option>
                    <option value="pago">Pago</option>
                    <option value="em_atraso">Em atraso</option>
                    <option value="devolvido">Devolvido</option>
                    <option value="sustado">Sustado</option>
                  </select>
                </div>
                <div className="campo"><label>Forma</label>
                  <select value={form.forma} onChange={e => setForm({...form, forma: e.target.value})}>
                    <option value="pix">PIX</option>
                    <option value="descontado_em_conta">Descontado em conta</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div className="campo"><label>Conta Bancária (para baixa)</label>
                  <select value={form.contaBancaria} onChange={e => setForm({...form, contaBancaria: e.target.value})}>
                    <option value="">—</option>
                    {contasBancarias.filter(c => c.ativa).map(c => <option key={c._id} value={c._id}>{c.nome} — {fmtMoeda(c.saldoAtual)}</option>)}
                  </select>
                </div>
                <div className="campo"><label>Observação</label><input value={form.observacao} onChange={e => setForm({...form, observacao: e.target.value})} /></div>
                <div className="campo"><label>Arquivo da Folha (URL)</label><input value={form.arquivoFolha} onChange={e => setForm({...form, arquivoFolha: e.target.value})} /></div>
              </div>
              <div className="modal-acoes">
                <button type="button" className="btn btn-linha" onClick={() => setModal(false)}>Cancelar</button>
                <button className="btn btn-primario" type="submit">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalBaixa && (
        <div className="modal-fundo" onClick={() => setModalBaixa(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Baixar cheque</h2>
            <p>Folha {chequeBaixa.numeroFolha} — {chequeBaixa.favorecido} — {fmtMoeda(chequeBaixa.valor)}</p>
            <form onSubmit={confirmarBaixa}>
              <div className="form-grid">
                <div className="campo"><label>Data Efetiva *</label><input required type="date" value={baixaForm.dataPagamento} onChange={e => setBaixaForm({...baixaForm, dataPagamento: e.target.value})} /></div>
                <div className="campo"><label>Conta Bancária *</label>
                  <select required value={baixaForm.contaBancaria} onChange={e => setBaixaForm({...baixaForm, contaBancaria: e.target.value})}>
                    <option value="">Selecione</option>
                    {contasBancarias.filter(c => c.ativa).map(c => <option key={c._id} value={c._id}>{c.nome} — saldo {fmtMoeda(c.saldoAtual)}</option>)}
                  </select>
                </div>
                <div className="campo"><label>Lançamento Existente (opcional)</label>
                  <input value={baixaForm.lancamentoId} onChange={e => setBaixaForm({...baixaForm, lancamentoId: e.target.value})} placeholder="ID do lançamento para vincular" />
                </div>
              </div>
              <div className="modal-acoes">
                <button type="button" className="btn btn-linha" onClick={() => setModalBaixa(false)}>Cancelar</button>
                <button className="btn btn-primario" type="submit">Confirmar baixa</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}