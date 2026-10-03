import { useEffect, useState } from 'react';
import api from '../api.js';
import { fmtMoeda, fmtData } from '../api.js';

const vazioRec = { 
  obra: '', contrato: '', medicao: '', dataMedicao: '', numeroNF: '',
  valorMedicao: 0, dataRecebimento: '', valorRecebido: 0,
  arquivoMedicao: '', arquivoNF: '', comprovanteRecebimento: '',
  status: 'pendente', observacoes: ''
};

export default function RecebiveisObra() {
  const [lista, setLista] = useState([]);
  const [obras, setObras] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [modal, setModal] = useState(false);
  const [modalReceber, setModalReceber] = useState(false);
  const [modalResumo, setModalResumo] = useState(false);
  const [editando, setEditando] = useState(null);
  const [receberItem, setReceberItem] = useState(null);
  const [resumoObra, setResumoObra] = useState(null);
  const [form, setForm] = useState(vazioRec);
  const [receberForm, setReceberForm] = useState({ dataRecebimento: '', valorRecebido: 0, contaBancaria: '', comprovante: '' });
  const [contasBancarias, setContasBancarias] = useState([]);
  const [erro, setErro] = useState('');
  const [filtroObra, setFiltroObra] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  const carregar = async () => {
    try {
      const params = new URLSearchParams();
      if (filtroObra) params.append('obra', filtroObra);
      if (filtroStatus) params.append('status', filtroStatus);
      const [recebiveis, obrs, contrs, contas] = await Promise.all([
        api.get(`/recebiveis-obra?${params}`),
        api.get('/obras'),
        api.get('/contratos'),
        api.get('/contas-bancarias')
      ]);
      setLista(recebiveis.data);
      setObras(obrs.data);
      setContratos(contrs.data);
      setContasBancarias(contas.data.contas || []);
    } catch (error) {
      setErro('Não foi possível carregar recebíveis.');
    }
  };
  useEffect(() => { carregar(); }, [filtroObra, filtroStatus]);

  const carregarContratos = async (obraId) => {
    try {
      const resp = await api.get(`/contratos?obra=${obraId}`);
      setContratos(resp.data);
    } catch { }
  };

  const abrirNovo = () => { 
    setEditando(null); 
    setForm({ ...vazioRec, dataMedicao: new Date().toISOString().slice(0, 10) });
    setModal(true); 
  };
  
  const abrirEdicao = (r) => { 
    setEditando(r._id); 
    setForm({ 
      ...vazioRec, 
      ...r, 
      obra: r.obra?._id || r.obra,
      contrato: r.contrato?._id || r.contrato,
      dataMedicao: r.dataMedicao?.slice(0, 10) || '',
      dataRecebimento: r.dataRecebimento?.slice(0, 10) || ''
    }); 
    if (r.obra) carregarContratos(r.obra);
    setModal(true); 
  };

  const salvar = async (ev) => {
    ev.preventDefault();
    try {
      const payload = { 
        ...form, 
        valorMedicao: Number(form.valorMedicao), 
        valorRecebido: Number(form.valorRecebido) 
      };
      if (editando) await api.put(`/recebiveis-obra/${editando}`, payload);
      else await api.post('/recebiveis-obra', payload);
      setModal(false); carregar();
    } catch (error) {
      setErro(error.response?.data?.error || 'Erro ao salvar.');
    }
  };

  const excluir = async (id) => {
    if (!window.confirm('Excluir este recebível?')) return;
    try { await api.delete(`/recebiveis-obra/${id}`); carregar(); }
    catch { setErro('Não foi possível excluir.'); }
  };

  const abrirReceber = (r) => {
    setReceberItem(r);
    setReceberForm({ 
      dataRecebimento: new Date().toISOString().slice(0, 10), 
      valorRecebido: Number(r.valorMedicao) - Number(r.valorRecebido), 
      contaBancaria: contasBancarias.find(c => c.ativa)?._id || '', 
      comprovante: '' 
    });
    setModalReceber(true);
  };

  const confirmarReceber = async (ev) => {
    ev.preventDefault();
    try {
      await api.post(`/recebiveis-obra/${receberItem._id}/receber`, receberForm);
      setModalReceber(false);
      carregar();
    } catch (error) {
      setErro(error.response?.data?.error || 'Erro ao registrar recebimento.');
    }
  };

  const verResumoObra = async (obraId) => {
    try {
      const resp = await api.get(`/recebiveis-obra/obra/${obraId}/resumo`);
      setResumoObra(resp.data);
      setModalResumo(true);
    } catch { setErro('Erro ao carregar resumo.'); }
  };

  const formatStatus = (s) => {
    const map = { pendente: 'Pendente', faturado: 'Faturado', recebido_parcial: 'Recebido Parcial', recebido_total: 'Recebido Total', cancelado: 'Cancelado' };
    return map[s] || s;
  };
  const statusColors = { pendente: 'aviso', faturado: 'primario', recebido_parcial: 'sucesso', recebido_total: 'sucesso', cancelado: 'neutro' };

  return (
    <div>
      <div className="topbar">
        <h1>Recebíveis de Obras</h1>
        <button className="btn btn-primario" onClick={abrirNovo}>+ Novo recebível</button>
      </div>
      {erro && <div className="erro" role="alert">{erro}</div>}

      <div className="filtros">
        <div className="campo"><label>Obra</label>
          <select value={filtroObra} onChange={e => setFiltroObra(e.target.value)}>
            <option value="">Todas</option>
            {obras.map(o => <option key={o._id} value={o._id}>{o.nome}</option>)}
          </select>
        </div>
        <div className="campo"><label>Status</label>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="faturado">Faturado</option>
            <option value="recebido_parcial">Recebido Parcial</option>
            <option value="recebido_total">Recebido Total</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </div>

      {lista.length === 0 ? (
        <div className="vazio">Nenhum recebível encontrado.</div>
      ) : (
        <table>
          <thead><tr><th>Obra</th><th>Contrato</th><th>Medição</th><th>Data Medição</th><th>NF</th><th>Valor Medição</th><th>Recebido</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {lista.map(r => (
              <tr key={r._id}>
                <td>{r.obra?.nome || '-'}</td>
                <td>{r.contrato?.numero || '-'}</td>
                <td>{r.medicao || '-'}</td>
                <td>{fmtData(r.dataMedicao)}</td>
                <td>{r.numeroNF || '-'}</td>
                <td>{fmtMoeda(r.valorMedicao)}</td>
                <td>{fmtMoeda(r.valorRecebido)}</td>
                <td><span className={`badge ${statusColors[r.status] || ''}`}>{formatStatus(r.status)}</span></td>
                <td>
                  {r.status !== 'recebido_total' && <button className="btn btn-sucesso btn-mini" onClick={() => abrirReceber(r)}>Receber</button>}
                  <button className="btn btn-linha btn-mini" onClick={() => abrirEdicao(r)}>Editar</button>
                  <button className="btn btn-perigo btn-mini" onClick={() => excluir(r._id)}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal && (
        <div className="modal-fundo" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editando ? 'Editar recebível' : 'Novo recebível'}</h2>
            <form onSubmit={salvar}>
              <div className="form-grid">
                <div className="campo"><label>Obra *</label>
                  <select required value={form.obra} onChange={e => { setForm({...form, obra: e.target.value}); carregarContratos(e.target.value); }}>
                    <option value="">Selecione</option>
                    {obras.map(o => <option key={o._id} value={o._id}>{o.nome}</option>)}
                  </select>
                </div>
                <div className="campo"><label>Contrato</label>
                  <select value={form.contrato} onChange={e => setForm({...form, contrato: e.target.value})}>
                    <option value="">—</option>
                    {contratos.map(c => <option key={c._id} value={c._id}>{c.numero} - {fmtMoeda(c.valorTotal)}</option>)}
                  </select>
                </div>
                <div className="campo"><label>Medição *</label><input required value={form.medicao} onChange={e => setForm({...form, medicao: e.target.value})} placeholder="Ex: Medição 1" /></div>
                <div className="campo"><label>Data Medição</label><input type="date" value={form.dataMedicao} onChange={e => setForm({...form, dataMedicao: e.target.value})} /></div>
                <div className="campo"><label>Número NF</label><input value={form.numeroNF} onChange={e => setForm({...form, numeroNF: e.target.value})} /></div>
                <div className="campo"><label>Valor Medição (R$) *</label><input required type="number" step="0.01" value={form.valorMedicao} onChange={e => setForm({...form, valorMedicao: e.target.value})} /></div>
                <div className="campo"><label>Data Recebimento</label><input type="date" value={form.dataRecebimento} onChange={e => setForm({...form, dataRecebimento: e.target.value})} /></div>
                <div className="campo"><label>Valor Recebido (R$)</label><input type="number" step="0.01" value={form.valorRecebido} onChange={e => setForm({...form, valorRecebido: e.target.value})} /></div>
                <div className="campo"><label>Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    <option value="pendente">Pendente</option>
                    <option value="faturado">Faturado</option>
                    <option value="recebido_parcial">Recebido Parcial</option>
                    <option value="recebido_total">Recebido Total</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
                <div className="campo"><label>Arquivo Medição (URL)</label><input value={form.arquivoMedicao} onChange={e => setForm({...form, arquivoMedicao: e.target.value})} /></div>
                <div className="campo"><label>Arquivo NF (URL)</label><input value={form.arquivoNF} onChange={e => setForm({...form, arquivoNF: e.target.value})} /></div>
                <div className="campo"><label>Comprovante Recebimento (URL)</label><input value={form.comprovanteRecebimento} onChange={e => setForm({...form, comprovanteRecebimento: e.target.value})} /></div>
                <div className="campo"><label>Observações</label><textarea value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} /></div>
              </div>
              <div className="modal-acoes">
                <button type="button" className="btn btn-linha" onClick={() => setModal(false)}>Cancelar</button>
                <button className="btn btn-primario" type="submit">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalReceber && (
        <div className="modal-fundo" onClick={() => setModalReceber(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Registrar recebimento</h2>
            <p>{receberItem.obra?.nome} - Medição {receberItem.medicao} - {fmtMoeda(receberItem.valorMedicao)}</p>
            <form onSubmit={confirmarReceber}>
              <div className="form-grid">
                <div className="campo"><label>Data Recebimento *</label><input required type="date" value={receberForm.dataRecebimento} onChange={e => setReceberForm({...receberForm, dataRecebimento: e.target.value})} /></div>
                <div className="campo"><label>Valor Recebido (R$) *</label><input required type="number" step="0.01" value={receberForm.valorRecebido} onChange={e => setReceberForm({...receberForm, valorRecebido: e.target.value})} max={Number(receberItem.valorMedicao) - Number(receberItem.valorRecebido)} /></div>
                <div className="campo"><label>Conta Bancária *</label>
                  <select required value={receberForm.contaBancaria} onChange={e => setReceberForm({...receberForm, contaBancaria: e.target.value})}>
                    <option value="">Selecione</option>
                    {contasBancarias.filter(c => c.ativa).map(c => <option key={c._id} value={c._id}>{c.nome} — saldo {fmtMoeda(c.saldoAtual)}</option>)}
                  </select>
                </div>
                <div className="campo"><label>Comprovante (URL)</label><input value={receberForm.comprovante} onChange={e => setReceberForm({...receberForm, comprovante: e.target.value})} /></div>
              </div>
              <div className="modal-acoes">
                <button type="button" className="btn btn-linha" onClick={() => setModalReceber(false)}>Cancelar</button>
                <button className="btn btn-primario" type="submit">Confirmar recebimento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalResumo && resumoObra && (
        <div className="modal-fundo" onClick={() => setModalResumo(false)}>
          <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
            <h2>Resumo da Obra - {resumoObra.obra.nome}</h2>
            <div className="grid-cards">
              <div className="kpi"><div className="rotulo">Valor Original Contrato</div><div className="valor">{fmtMoeda(resumoObra.valorOriginalContrato)}</div></div>
              <div className="kpi"><div className="rotulo">Aditivos</div><div className="valor">{fmtMoeda(resumoObra.aditivos)}</div></div>
              <div className="kpi"><div className="rotulo">Valor Total Contrato</div><div className="valor">{fmtMoeda(resumoObra.valorTotalContrato)}</div></div>
              <div className="kpi"><div className="rotulo">Total Medido</div><div className="valor">{fmtMoeda(resumoObra.totalMedido)}</div></div>
              <div className="kpi"><div className="rotulo">Total Recebido</div><div className="valor">{fmtMoeda(resumoObra.totalRecebido)}</div></div>
              <div className="kpi"><div className="rotulo">Saldo do Contrato</div><div className="valor" style={{color: resumoObra.saldoContrato >= 0 ? 'var(--sucesso)' : 'var(--perigo)'}}>{fmtMoeda(resumoObra.saldoContrato)}</div></div>
            </div>
            <h3 style={{marginTop: 20}}>Detalhamento</h3>
            {resumoObra.recebiveis.length === 0 ? <div className="vazio">Nenhum recebível.</div> : (
              <table>
                <thead><tr><th>Medição</th><th>Data</th><th>NF</th><th>Valor Medição</th><th>Recebido</th><th>Status</th></tr></thead>
                <tbody>
                  {resumoObra.recebiveis.map(r => (
                    <tr key={r._id}>
                      <td>{r.medicao}</td>
                      <td>{fmtData(r.dataMedicao)}</td>
                      <td>{r.numeroNF || '-'}</td>
                      <td>{fmtMoeda(r.valorMedicao)}</td>
                      <td>{fmtMoeda(r.valorRecebido)}</td>
                      <td><span className={`badge ${statusColors[r.status] || ''}`}>{formatStatus(r.status)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="modal-acoes">
              <button className="btn btn-linha" onClick={() => setModalResumo(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}