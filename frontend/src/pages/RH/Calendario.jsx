import { useState } from 'react';
import { COLABORADORES_MOCK, OBRAS_MOCK, CALENDARIO_EVENTOS_MOCK, LEMBRETES_MOCK } from '../../utils/mockData.js';
import { fmtMoeda } from '../../api.js';

const eventosCategoriaCores = {
  rh: '#3b82f6',
  contratos: '#ef4444',
  financeiro: '#22c55e',
  obras: '#f59e0b',
  estoque: '#8b5cf6',
};

const categoriaLabels = {
  rh: 'RH',
  contratos: 'Contratos',
  financeiro: 'Financeiro',
  obras: 'Obras',
  estoque: 'Estoque',
};

export default function Calendario() {
  const [mesAtual, setMesAtual] = useState(new Date().getMonth());
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear());
  const [filtroCategoria, setFiltroCategoria] = useState({
    rh: true, contratos: true, financeiro: true, obras: true, estoque: true
  });
  const [eventoSelecionado, setEventoSelecionado] = useState(null);

  const hoje = new Date(anoAtual, mesAtual, 1);
  const primeiroDia = new Date(anoAtual, mesAtual, 1);
  const ultimoDia = new Date(anoAtual, mesAtual + 1, 0);
  const diasDoMes = ultimoDia.getDate();
  const primeiroDiaSemana = primeiroDia.getDay();

  const eventosDoMes = (CALENDARIO_EVENTOS_MOCK || []).filter((ev) => {
    const evData = new Date(ev.data);
    const matchCategoria = filtroCategoria[ev.categoria];
    return evData.getMonth() === mesAtual && evData.getFullYear() === anoAtual && matchCategoria;
  });

  const eventosNoDia = (dia) => {
    const dataStr = new Date(anoAtual, mesAtual, dia).toISOString().slice(0, 10);
    return eventosDoMes.filter((ev) => ev.data === dataStr);
  };

  const abrirEvento = (ev) => setEventoSelecionado(ev);
  const fecharEvento = () => { setEventoSelecionado(null); };

  const alternarCategoria = (cat) => {
    setFiltroCategoria((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const meses = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const diasDaSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'O'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <button className="btn btn-linha btn-mini" onClick={() => setMesAtual(mesAtual === 0 ? 11 : mesAtual - 1)}>←</button>
          <strong>{meses[mesAtual]} {anoAtual}</strong>
          <button className="btn btn-linha btn-mini" onClick={() => setMesAtual(mesAtual === 11 ? 0 : mesAtual + 1)}>→</button>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {Object.entries(filtroCategoria).map(([cat, ativa]) => (
            <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={ativa} onChange={() => alternarCategoria(cat)} />
              <span style={{ color: eventosCategoriaCores[cat], fontSize: 12 }}>{categoriaLabels[cat]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, }}>
          {diasDaSemana.map((d) => <div key={d} style={{ textAlign: 'center', fontWeight: 'bold', padding: 8 }}>{d}</div>)}
          {Array.from({ length: primeiroDiaSemana }).map((_, i) => <div key={`empty-${i}`} style={{ padding: 8 }} />)}
          {Array.from({ length: diasDoMes }).map((_, i) => {
            const dia = i + 1;
            const eventosDia = eventosNoDia(dia);
            const eHoje = dia === new Date().getDate() && mesAtual === new Date().getMonth() && anoAtual === new Date().getFullYear();
            return (
              <div
                key={`dia-${dia}`}
                style={{
                  minHeight: 60,
                  padding: 4,
                  border: eHoje ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                  backgroundColor: eHoje ? '#eff6ff' : 'transparent',
                  cursor: eventosDia.length > 0 ? 'pointer' : 'default',
                  fontSize: 11
                }}
              >
                <div style={{ fontWeight: eHoje ? 'bold' : 'normal' }}>{dia}</div>
                {eventosDia.slice(0, 2).map((ev) => (
                  <div
                    key={ev.id}
                    style={{
                      background: eventosCategoriaCores[ev.categoria] || '#64748b',
                      color: '#fff',
                      borderRadius: 2,
                      padding: '2px 4px',
                      marginBottom: 1,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                    title={ev.titulo}
                    onClick={() => abrirEvento(ev)}
                  >
                    {ev.titulo.split(' - ')[0].slice(0, 18)}...
                  </div>
                ))}
                {eventosDia.length > 2 && <div style={{ fontSize: 10, color: '#64748b' }}>+{eventosDia.length - 2} mais</div>}
              </div>
            );
          })}
        </div>
      </div>

      {eventoSelecionado && (
        <div className="modal-fundo" onClick={fecharEvento}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Detalhe do lembrete</h2>
            <div className="form-grid">
              <div className="campo"><label>Título</label><input readOnly value={eventoSelecionado.titulo} /></div>
              <div className="campo"><label>Data</label><input readOnly value={new Date(eventoSelecionado.data).toLocaleDateString('pt-BR')} /></div>
              <div className="campo"><label>Categoria</label><input readOnly value={categoriaLabels[eventoSelecionado.categoria]} /></div>
              <div className="campo"><label>Prioridade</label><input readOnly value={eventoSelecionado.prioridade} /></div>
              <div className="campo"><label>Status</label><input readOnly value={eventoSelecionado.status} /></div>
            </div>
            <div className="modal-acoes">
              <button className="btn btn-linha" onClick={fecharEvento}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
