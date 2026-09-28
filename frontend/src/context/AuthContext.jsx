import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api.js';

const AuthContext = createContext(null);

// Leitura segura: se o valor estiver corrompido, limpa e segue como deslogado
function lerUsuarioSalvo() {
  try {
    const salvo = localStorage.getItem('user');
    if (!salvo) return null;
    const parsed = JSON.parse(salvo);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    return null;
  }
}

function salvarSessao(data) {
  if (data?.token) localStorage.setItem('token', data.token);
  if (data?.user && typeof data.user === 'object') {
    localStorage.setItem('user', JSON.stringify(data.user));
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(lerUsuarioSalvo);
  const [carregandoSessao, setCarregandoSessao] = useState(Boolean(localStorage.getItem('token')));

  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    api.get('/auth/me')
      .then(({ data }) => {
        setUser(data.user || null);
        if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      })
      .finally(() => setCarregandoSessao(false));
  }, []);

  const login = async (email, senha) => {
    const { data } = await api.post('/auth/login', { email, senha });
    salvarSessao(data);
    setUser(data.user || null);
    return data.user;
  };

  const trocarSenha = async (senhaAtual, novaSenha) => {
    const { data } = await api.post('/auth/trocar-senha', { senhaAtual, novaSenha });
    salvarSessao(data);
    setUser(data.user || null);
  };

  const solicitarRedefinicao = async (email) => {
    const { data } = await api.post('/auth/esqueci-senha', { email });
    return data;
  };

  const redefinirSenha = async (token, novaSenha) => {
    const { data } = await api.post('/auth/reset-senha', { token, novaSenha });
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      carregandoSessao,
      login,
      trocarSenha,
      solicitarRedefinicao,
      redefinirSenha,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);