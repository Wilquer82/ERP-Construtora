import { useState } from 'react';
import { DOCUMENTOS_COLAB_MOCK, COLABORADORES_MOCK } from '../../utils/mockData.js';

const statusCores = {
  valido: '#22c55e',
  vencido: '#ef4444',
  vence_em_breve: '#f59e0b',
  renovando: '#3b82f6'
};

const statusLabels = {
  valido: 'Válido',
  vencido: 'Vencido',
  vence_em_breve: 'Vence em breve',
  renovando: 'Renovando'
};

export default function Documentacao() {
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState(null);
  const colaboradores = DOCUMENTOS_COLAB_MOCK;
  const docs = colaboradorSelecionado?.documentos || [];

  return (
    <div>
      <div className="topbar">
        <h1>Documentação de colaboradores</h1>
      </div>

      <div className="card">
        <div className="campo">
          <label>Selecionar colaborador</label>
          <select value={colaboradorSelecionado?._id || ''} onChange={(e) => {
            const col = colaboradores.find((c) => c._id === e.target.value);
            setColaboradorSelecionado(col || null);
          }}>
            <option value="">— Selecione —</option>
            {colaboradores.map((c) => (
              <option key={c._id} value={c._id}>{c.nome}</option>
            ))}
          </select>
        </div>

        {colaboradorSelecionado && (
          <div style={{ marginTop: 12 }}>
            <h3>{colaboradorSelecionado.nome} — {colaboradorSelecionado.funcao}</h3>
            <p style={{ color: '#64748b' }}>CPF: {colaboradorSelecionado.cpf}</p>

            {docs.length === 0 ? (
              <div className="vazio">Nenhum documento cadastrado.</div>
            ) : (
              <table>
                <thead>
                  <tr><th>Tipo</th><th>Nome</th><th>Emissão</th><th>Validade</th><th>Recibo</th><th>Status</th><th>Ação</th></tr>
                </thead>
                <tbody>
                  {docs.map((doc, i) => {
                    const vencida = doc.validade && new Date(doc.validade) < new Date();
                    const status = doc.status || (vencida ? 'vencido' : 'valido');
                    return (
                      <tr key={i}>
                        <td>{doc.tipo?.replace('_', ' ') || '-'}</td>
                        <td>{doc.nome}</td>
                        <td>{doc.dataEmissao ? new Date(doc.dataEmissao).toLocaleDateString('pt-BR') : '-'}</td>
                        <td>{doc.validade ? new Date(doc.validade).toLocaleDateString('pt-BR') : '—'}</td>
                        <td>{doc.reciboAssinado ? 'Assinado' : 'Não assinado'}</td>
                        <td><span style={{ background: statusCores[status] || '#64748b', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{statusLabels[status] || status}</span></td>
                        <td>
                          <button className="btn btn-linha btn-mini">Upload</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Alertas por colaborador</h3>
        <table>
          <thead><tr><th>Colaborador</th><th>Documento</th><th>Status</th><th>Vencimento</th></tr></thead>
          <tbody>
            {colaboradores
              .filter((c) => c.documentos?.some((d) => {
                const vencida = d.validade && new Date(d.validade) < new Date();
                const venceBreve = d.validade && new Date(d.validade) < new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
                return vencida || venceBreve || d.reciboAssinado === false;
              }))
              .map((colab) => {
                const alertaDoc = colab.documentos?.find((d) => {
                  const vencida = d.validade && new Date(d.validade) < new Date();
                  const venceBreve = d.validade && new Date(d.validade) < new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
                  return vencida || venceBreve || d.reciboAssinado === false;
                });
                return (
                  <tr key={colab._id}>
                    <td>{colab.nome}</td>
                    <td>{alertaDoc?.nome}</td>
                    <td>{alertaDoc?.status || 'vencido'}</td>
                    <td>{alertaDoc?.validade ? new Date(alertaDoc.validade).toLocaleDateString('pt-BR') : '—'}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
