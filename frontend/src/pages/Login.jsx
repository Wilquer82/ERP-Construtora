import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const entrar = async (e) => {
    e.preventDefault();
    setErro(''); setCarregando(true);
    try {
      const usuario = await login(email, senha);
      navigate(usuario?.trocarSenha ? '/trocar-senha' : '/');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao entrar. Verifique o backend.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1><span>Constru-ERP</span></h1>
        <p className="sub">Gestão essencial de obras — faça login para continuar</p>
        <form onSubmit={entrar}>
          <div className="campo">
            <label>E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="campo">
            <label>Senha</label>
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          </div>
          {erro && <div className="erro">{erro}</div>}
          <button className="btn btn-primario" style={{ marginTop: 8 }} disabled={carregando}>
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
