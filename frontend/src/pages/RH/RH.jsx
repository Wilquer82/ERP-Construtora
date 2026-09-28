import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Colaboradores from './Colaboradores.jsx';
import Calendario from './Calendario.jsx';
import Folha from './Folha.jsx';
import Documentacao from './Documentacao.jsx';

const abas = [
  { id: 'calendario', label: 'Calendário', path: 'calendario' },
  { id: 'colaboradores', label: 'Colaboradores', path: 'colaboradores' },
  { id: 'folha', label: 'Folha de Pagamento', path: 'folha' },
  { id: 'documentacao', label: 'Documentação', path: 'documentacao' },
];

export default function RH() {
  return (
    <div>
      <div className="topbar">
        <h1>RH</h1>
        <div className="tabs">
          {abas.map((a) => (
            <a key={a.id} href={`/rh/${a.path}`} className="tab-btn">
              {a.label}
            </a>
          ))}
        </div>
      </div>
      <Routes>
        <Route index element={<Navigate to="calendario" replace />} />
        <Route path="calendario" element={<Calendario />} />
        <Route path="colaboradores" element={<Colaboradores />} />
        <Route path="folha" element={<Folha />} />
        <Route path="documentacao" element={<Documentacao />} />
      </Routes>
    </div>
  );
}
