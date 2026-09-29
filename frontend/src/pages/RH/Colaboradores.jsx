import { useState } from 'react';
import { COLABORADORES_MOCK, OBRAS_MOCK, DOCUMENTOS_COLAB_MOCK } from '../../utils/mockData.js';
import { fmtMoeda } from '../../api.js';

const DIAS_UTEIS = 22;

function calcularDiaria(colab) {
  if (colab.tipo === 'diarista') return Number(colab.valorDiaria) || 0;
  const salario = Number(colab.salarioMensal) || 0;
  return salario > 0 ? Math.round((salario / DIAS_UTEIS) * 100) / 100 : 0;
}

export default function Colaboradores() {
  const [lista] = useState(COLABORADORES_MOCK);
  const [filtroObra, setFiltroObra] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [modalAlocar, setModalAlocar] = useState(false);
  const [colaboradorAlocando, setColaboradorAlocando] = useState(null);

  const filtered = lista.filter((c) => {
    if (filtroObra && c.obraAtual !== filtroObra) return false;
    if (filtroStatus && c.status !== filtroStatus) return false;
    return true;
  });

  const abrirAlocar = (colab) => {
    setColaboradorAlocando(colab);
    setModalAlocar(true);
  };

  return (
    <div>
      <div className="topbar">
        <h1>Colaboradores</h1>
      </div>

      <div className="card">
        <div className="filtros" style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          <div className="campo">
            <label>Obra</label>
            <select value={filtroObra} onChange={(e) => setFiltroObra(e.target.value)}>
              <option value="">Todas</option>
              {OBRAS_MOCK.map((o) => <option key={o._id} value={o._id}>{o.nome}</option>)}
            </select>
          </div>
          <div className="campo">
            <label>Status</label>
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
              <option value="">Todos</option>
              <option value="ativo">Ativo</option>
              <option value="afastado">Afastado</option>
              <option value="demitido">Demitido</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="vazio">Nenhum colaborador encontrado.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Função</th>
                <th>Tipo</th>
                <th>Diária (R$)</th>
                <th>Obra alocada</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c._id}>
                  <td>{c.nome}</td>
                  <td>{c.funcao}</td>
                  <td>{c.tipo === 'diarista' ? 'Diarista' : 'Mensalista'}</td>
<td>
  {c.tipo === 'diarista'
    ? fmtMoeda(c.valorDiaria)
    : (
      <>
        {fmtMoeda(calcularDiaria(c))}
        <small style={{ display: 'block', fontSize: '11px', color: '#91a4b2' }}>
          (calculado de R$ {Number(c.salarioMensal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mês ÷ 22)
        </small>
      </>
    )
  }
</td>
                  <td>{c.obraAtual ? OBRAS_MOCK.find((o) => o._id === c.obraAtual)?.nome || '-' : '-'}</td>
                  <td><span className={`badge ${c.status === 'ativo' ? '' : c.status === 'afastado' ? 'status-pausada' : 'status-pausada'}`}>{c.status}</span></td>
                  <td>
                    <button className="btn btn-linha btn-mini" onClick={() => abrirAlocar(c)}>Alocar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalAlocar && colaboradorAlocando && (
        <div className="modal-fundo" onClick={() => setModalAlocar(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Alocar {colaboradorAlocando.nome}</h2>
            <form onSubmit={(e) => { e.preventDefault(); setModalAlocar(false); }}>
              <div className="form-grid">
                <div className="campo"><label>Obra destino *</label>
                  <select required>
                    {OBRAS_MOCK.map((o) => <option key={o._id} value={o._id}>{o.nome}</option>)}
                  </select>
                </div>
                <div className="campo"><label>Data início</label><input type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></div>
              </div>
              <div className="modal-acoes">
                <button type="button" className="btn btn-linha" onClick={() => setModalAlocar(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primario">Salvar alocação</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
