import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from "../TopNav";
import MessageModal from '../ui/MessageModal';
import { Loader2, CheckCircle, XCircle, NotebookPen } from 'lucide-react';

export default function NotebookCreate({ token, onLogout }) {
  const navigate = useNavigate();

  const [nomeCaderno, setNomeCaderno] = useState('');
  const [materia, setMateria] = useState('');
  const [assunto, setAssunto] = useState('');
  const [banca, setBanca] = useState('');
  const [orgao, setOrgao] = useState('');
  const [cargo, setCargo] = useState('');
  const [ano, setAno] = useState(''); // Mantém como string para o input
  const [escolaridade, setEscolaridade] = useState('');
  const [dificuldade, setDificuldade] = useState('');
  const [regiao, setRegiao] = useState('');
  
  // Novos estados para os filtros de status
  const [excludeAnuladas, setExcludeAnuladas] = useState(false);
  const [excludeDesatualizadas, setExcludeDesatualizadas] = useState(false);

  const [questoesIds, setQuestoesIds] = useState([]);
  const [totalUnico, setTotalUnico] = useState(0);
  const [isCountingQuestions, setIsCountingQuestions] = useState(false);

  const [suggestions, setSuggestions] = useState({
    materia: [],
    assunto: [],
    banca: [],
    orgao: [],
    cargo: [],
    ano: [],
    escolaridade: [],
    dificuldade: [],
    regiao: [],
  });

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const API_URL = import.meta.env.VITE_API_URL;

  const handleUnauthorized = useCallback(() => {
  setMessage('Sessão expirada ou não autorizada. Faça login novamente.');
  setMessageType('error');
  if (typeof onLogout === 'function') {
    onLogout();
  } else {
    console.error("onLogout não é uma função em NotebookCreate.");
  }
  navigate('/login');
}, [onLogout, navigate]);

const fetchSuggestions = useCallback(async (fieldName) => {
  try {
    const res = await fetch(`${API_URL}/api/questions/fields/${fieldName}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (res.status === 401 || res.status === 403) {
      handleUnauthorized();
      return;
    }

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.detail || `Falha ao buscar sugestões para ${fieldName}.`);
    }

    const data = await res.json();
    setSuggestions(prev => ({
      ...prev,
      [fieldName]: data
    }));
  } catch (err) {
    console.error(`Erro ao buscar sugestões para ${fieldName}:`, err);
  }
}, [API_URL, token, handleUnauthorized]);

useEffect(() => {
  const fetchQuestoesCount = async () => {
    setIsCountingQuestions(true);

    try {
      const queryParams = new URLSearchParams();
      console.log("URL inicial da requisição:", `${API_URL}/api/questions/count-filtered/?${queryParams.toString()}`);

      const appendIfValid = (key, val) => {
        if (val && typeof val === 'string' && val.trim() !== '') {
          queryParams.append(key, val.trim());
        }
      };

      appendIfValid("materia", materia);
      appendIfValid("assunto", assunto);
      appendIfValid("banca", banca);
      appendIfValid("orgao", orgao);
      appendIfValid("cargo", cargo);
      appendIfValid("escolaridade", escolaridade);
      appendIfValid("dificuldade", dificuldade);
      appendIfValid("regiao", regiao);

      const anoInt = parseInt(ano, 10);
      if (!isNaN(anoInt)) {
        queryParams.append("ano", anoInt.toString());
      }

      // Adiciona os novos filtros de status
      if (excludeAnuladas) {
        queryParams.append("exclude_anuladas", "true");
      }
      if (excludeDesatualizadas) {
        queryParams.append("exclude_desatualizadas", "true");
      }

      const urlFinal = `${API_URL}/api/questions/count-filtered/?${queryParams.toString()}`;
      console.log("URL final da requisição:", urlFinal);

      const res = await fetch(urlFinal, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (res.status === 401 || res.status === 403) {
        handleUnauthorized();
        return;
      }

      if (!res.ok) {
        console.error("Erro detalhado da API ao contar questões:", data);
        const mensagem = Array.isArray(data.detail)
          ? data.detail.map(e => e.msg).join(' | ')
          : data.detail || "Erro ao buscar questões.";
        throw new Error(mensagem);
      }

      setQuestoesIds(data.ids || []);
      setTotalUnico(data.count || 0);
    } catch (err) {
      console.error("Erro ao buscar questões:", err);
      setMessage(err.message || "Erro ao carregar a contagem.");
      setMessageType("error");
    } finally {
      setIsCountingQuestions(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const handler = setTimeout(() => {
    fetchQuestoesCount();
  }, 500);

  return () => {
    clearTimeout(handler);
  };
}, [
  materia, assunto, banca, orgao, cargo, ano,
  escolaridade, dificuldade, regiao,
  excludeAnuladas, excludeDesatualizadas, // Adicionado como dependência
  token, API_URL, handleUnauthorized
]);



  const renderDatalistInput = (label, value, setValue, name) => (
    <div className="mb-4">
      <label htmlFor={name} className="block text-gray-700 font-semibold mb-1">{label}</label>
      <input
        id={name}
        list={`${name}-list`}
        value={value}
        onChange={(e) => setValue(e.target.value.trim())}
        placeholder={`Escolha ${label.toLowerCase()}`}
        className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition"
      />
      <datalist id={`${name}-list`}>
        {suggestions[name] && suggestions[name].map((item, i) => (
          <option key={i} value={item} />
        ))}
      </datalist>
    </div>
  );

  const handleSubmit = async () => {
    if (!nomeCaderno.trim()) {
      setMessage('Dê um nome ao seu caderno antes de continuar.');
      setMessageType('error');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (totalUnico === 0) {
      setMessage('Nenhuma questão encontrada com os filtros selecionados. Ajuste os filtros.');
      setMessageType('error');
      setTimeout(() => setMessage(''), 5000);
      return;
    }

    const filtros = {
      materia: materia || null,
      assunto: assunto || null,
      banca: banca || null,
      orgao: orgao || null,
      cargo: cargo || null,
      ano: ano ? parseInt(ano, 10) : null, // Garante que 'ano' é um número ou null
      escolaridade: escolaridade || null,
      dificuldade: dificuldade || null,
      regiao: regiao || null,
      exclude_anuladas: excludeAnuladas, // Inclui o filtro no payload
      exclude_desatualizadas: excludeDesatualizadas, // Inclui o filtro no payload
    };

    // Filtra valores que são null ou strings vazias
    const filtrosLimpos = Object.fromEntries(
      Object.entries(filtros).filter(([, value]) => value !== null && value !== '')
    );
    
    // Converte ano para int no filtrosLimpos se não for null
    if (filtrosLimpos.ano !== undefined && filtrosLimpos.ano !== null) {
      const parsedAno = parseInt(filtrosLimpos.ano, 10);
      if (!isNaN(parsedAno)) {
        filtrosLimpos.ano = parsedAno;
      } else {
        // Se a conversão falhar, remove o ano dos filtros para evitar erro no backend
        delete filtrosLimpos.ano;
        setMessage('O ano inserido não é um número válido. Removendo filtro de ano.');
        setMessageType('warning');
        setTimeout(() => setMessage(''), 5000);
      }
    }


    const paiId = new URLSearchParams(window.location.search).get('pastaId');

    const payload = {
      nome: nomeCaderno,
      questoes_ids: questoesIds,
      filtros: filtrosLimpos,
      paiId: paiId ? parseInt(paiId, 10) : null, // Garante que paiId é um número ou null
    };

    console.log('Payload enviado para criar caderno:', payload);

    try {
      // CORREÇÃO AQUI: A URL deve ser para a criação de um novo caderno, sem ID
      const res = await fetch(`${API_URL}/api/notebooks/`, { // Removido ${id}/resolve_data
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (res.ok) {
        setMessage('Caderno criado com sucesso!');
        setMessageType('success');
        setTimeout(() => {
          if (paiId) {
            navigate(`/pasta/${paiId}`);
          } else {
            navigate('/meus-cadernos');
          }
        }, 1000);
      } else {
        setMessage(result.detail || result.error || 'Erro ao criar caderno.');
        setMessageType('error');
      }
    } catch (err) {
      console.error('Erro ao criar caderno:', err);
      setMessage('Erro de conexão com o servidor.');
      setMessageType('error');
    } finally {
      setTimeout(() => setMessage(''), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 font-inter">
      <TopNav onLogout={onLogout} />

      {message && (
        <MessageModal
          message={message}
          type={messageType}
          onClose={() => setMessage('')}
        />
      )}

      <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-8 text-center">Criar Novo Caderno</h1>

        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 mb-8">
          <label htmlFor="nomeCaderno" className="block text-gray-700 font-semibold mb-2 text-lg">Nome do Caderno</label>
          <input
            id="nomeCaderno"
            type="text"
            value={nomeCaderno}
            onChange={(e) => setNomeCaderno(e.target.value)}
            placeholder="Ex: Direito Penal - Delegado 2024"
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition text-lg"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-8 rounded-2xl shadow-xl border border-gray-100 mb-8">
          {renderDatalistInput('Matéria', materia, setMateria, 'materia')}
          {renderDatalistInput('Assunto', assunto, setAssunto, 'assunto')}
          {renderDatalistInput('Banca', banca, setBanca, 'banca')}
          {renderDatalistInput('Órgão', orgao, setOrgao, 'orgao')}
          {renderDatalistInput('Cargo', cargo, setCargo, 'cargo')}
          {renderDatalistInput('Ano', ano, setAno, 'ano')}
          {renderDatalistInput('Escolaridade', escolaridade, setEscolaridade, 'escolaridade')}
          {renderDatalistInput('Dificuldade', dificuldade, setDificuldade, 'dificuldade')}
          {renderDatalistInput('Região', regiao, setRegiao, 'regiao')}
        </div>

        {/* Novos Checkboxes para exclusão de questões */}
        <div className="mt-6 p-6 bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col sm:flex-row justify-around items-center space-y-4 sm:space-y-0 sm:space-x-8">
            <label className="flex items-center text-lg text-gray-800 cursor-pointer">
                <input
                    type="checkbox"
                    checked={excludeAnuladas}
                    onChange={(e) => setExcludeAnuladas(e.target.checked)}
                    className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="ml-2">Excluir Questões Anuladas</span>
            </label>
            <label className="flex items-center text-lg text-gray-800 cursor-pointer">
                <input
                    type="checkbox"
                    checked={excludeDesatualizadas}
                    onChange={(e) => setExcludeDesatualizadas(e.target.checked)}
                    className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="ml-2">Excluir Questões Desatualizadas</span>
            </label>
        </div>

        <div className="mt-6 p-6 bg-blue-50 rounded-2xl shadow-inner border border-blue-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-blue-800 flex items-center">
            <NotebookPen className="h-6 w-6 mr-2 text-blue-600" /> Total de Questões Encontrada:
          </h2>
          {isCountingQuestions ? (
            <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
          ) : (
            <p className="text-blue-600 text-4xl font-bold">{totalUnico}</p>
          )}
        </div>

        <button
          onClick={handleSubmit}
          className="mt-8 w-full flex items-center justify-center px-6 py-4 bg-green-600 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-green-700 transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={isCountingQuestions || totalUnico === 0}
        >
          {isCountingQuestions ? (
            <Loader2 className="animate-spin h-5 w-5 mr-3" />
          ) : (
            <CheckCircle className="h-5 w-5 mr-3" />
          )}
          Criar Caderno com {totalUnico} Questões
        </button>
      </div>
    </div>
  );
}

