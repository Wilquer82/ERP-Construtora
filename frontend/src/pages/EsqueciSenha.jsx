import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function EsqueciSenha() {
  const { solicitarRedefinicao } = useAuth();
  const [email, setEmail] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const enviar = async (event) => {
    event.preventDefault();
    setErro('');
    setMensagem('');
    setCarregando(true);
    try {
      const data = await solicitarRedefinicao(email);
      setMensagem(data.message);
    } catch (error) {
      setErro(error.response?.data?.error || 'Nao foi possivel solicitar a redefinicao.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1><span>Recuperar senha</span></h1>
        <p className="sub">Informe seu email para receber um link de redefinicao.</p>
        <form onSubmit={enviar}>
          <div className="campo">
            <label>E-mail</label>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
          </div>
          {mensagem && <div className="sucesso">{mensagem}</div>}
          {erro && <div className="erro">{erro}</div>}
          <button className="btn btn-primario" style={{ marginTop: 8 }} disabled={carregando}>
            {carregando ? 'Enviando...' : 'Enviar link'}
          </button>
        </form>
        <p className="sub"><Link to="/login">Voltar ao login</Link></p>
      </div>
    </div>
  );
}
