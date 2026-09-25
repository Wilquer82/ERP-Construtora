import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Clientes from './pages/Clientes.jsx';
import Obras from './pages/Obras.jsx';
import Orcamentos from './pages/Orcamentos.jsx';
import Contratos from './pages/Contratos.jsx';
import Financeiro from './pages/Financeiro.jsx';
import Materiais from './pages/Materiais.jsx';
import Fornecedores from './pages/Fornecedores.jsx';
import Compras from './pages/Compras.jsx';

function RotaProtegida({ children }) {
  const { user, carregandoSessao } = useAuth();
  if (carregandoSessao) return <div className="vazio">Validando sessao...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RotaProtegida><Layout /></RotaProtegida>}>
        <Route index element={<Dashboard />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="obras" element={<Obras />} />
        <Route path="orcamentos" element={<Orcamentos />} />
        <Route path="contratos" element={<Contratos />} />
        <Route path="financeiro" element={<Financeiro />} />
        <Route path="materiais" element={<Materiais />} />
        <Route path="fornecedores" element={<Fornecedores />} />
        <Route path="compras" element={<Compras />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
