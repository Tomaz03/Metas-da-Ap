import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const SubjectSection = ({ title, subjects, sectionType, onAdd, onRemove, onChange }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold mt-8 mb-4 text-blue-600">{title}</h2>
      <button
        onClick={() => onAdd(sectionType)}
        className="p-2 text-white bg-green-500 rounded-full shadow-md hover:bg-green-600 transition-colors"
        title="Adicionar matéria"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>
    </div>
    {subjects.map((subject) => (
      <div key={subject.id} className="bg-gray-100 p-4 rounded-xl shadow-inner space-y-4 relative">
        <div className="flex items-center space-x-4">
          <input
            type="text"
            value={subject.name}
            onChange={(e) => onChange(sectionType, subject.id, 'name', e.target.value)}
            placeholder="Nome da Matéria (ex: Português)"
            className="flex-1 p-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {subjects.length > 1 && (
            <button
              onClick={() => onRemove(sectionType, subject.id)}
              className="text-red-500 hover:text-red-700 transition-colors"
              title="Remover matéria"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
        <textarea
          rows="3"
          value={subject.content}
          onChange={(e) => onChange(sectionType, subject.id, 'content', e.target.value)}
          placeholder="Insira o conteúdo programático..."
          className="w-full p-4 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        ></textarea>
      </div>
    ))}
  </div>
);

const EditalVerticalizado = ({ token: tokenProp }) => {
  // hooks no topo (importante)
  const [tituloEdital, setTituloEdital] = useState('');
  const [basicSubjects, setBasicSubjects] = useState([{ id: crypto.randomUUID(), name: '', content: '' }]);
  const [specificSubjects, setSpecificSubjects] = useState([{ id: crypto.randomUUID(), name: '', content: '' }]);
  const [verticalizedNotice, setVerticalizedNotice] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const editalId = searchParams.get('id');

  // token: aceita prop ou fallback para localStorage
  const token = tokenProp || localStorage.getItem("token");

  // refs para debounce e para pular o primeiro efeito de salvamento
  const saveDebounceRef = useRef(null);
  const isInitialLoadRef = useRef(true);

  // --- FETCH do edital (mantive sua lógica original) ---
  useEffect(() => {
    if (editalId) {
      setIsEditing(true);
      setIsLoading(true);
      const fetchEditalData = async () => {
        try {
          const response = await fetch(`http://localhost:8000/api/edital-verticalizado/${editalId}`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          if (!response.ok) {
            throw new Error("Falha ao buscar dados do edital.");
          }

          const data = await response.json();
          setTituloEdital(data.nome || '');

          // converte o conteudo + marcacoes em lista para renderizar facilmente
          const noticeData = [];
          Object.keys(data.conteudo || {}).forEach(section => {
            data.conteudo[section].forEach((topic, index) => {
              const marcacao = data.marcacoes?.[section]?.[topic] || {};
              const levelMatch = topic.match(/^(\d+(?:\.\d+)*)/);
              const level = levelMatch ? levelMatch[0].split('.').length : 1;

              noticeData.push({
                id: `${section}-${index}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
                section,
                topic,
                indent: level,
                completed: !!marcacao.completado,
                leiSeca: !!marcacao.leiSeca,
                juris: !!marcacao.juris,
                questoes: !!marcacao.questoes,
                revisoes: !!marcacao.revisoes,
                revisaoNumero: marcacao.revisaoNumero ?? null,
              });
            });
          });

          setVerticalizedNotice(noticeData);
          // marca que acabou o carregamento inicial (o useEffect de salvamento irá pular a primeira vez)
          isInitialLoadRef.current = true;
        } catch (error) {
          console.error(error);
          alert("Não foi possível carregar o edital.");
        } finally {
          setIsLoading(false);
        }
      };

      fetchEditalData();
    }
  }, [editalId, token]);

  // --- FUNÇÃO que salva as marcações (PATCH) ---
  const salvarMarcacoes = async (data = verticalizedNotice) => {
    if (!isEditing || !editalId) return;

    const marcacoes = {};
    data.forEach(item => {
      if (!marcacoes[item.section]) {
        marcacoes[item.section] = {};
      }
      marcacoes[item.section][item.topic] = {
        completado: !!item.completed,
        leiSeca: !!item.leiSeca,
        juris: !!item.juris,
        questoes: !!item.questoes,
        revisoes: !!item.revisoes,
        revisaoNumero: item.revisaoNumero ?? null
      };
    });

    try {
      await fetch(`http://localhost:8000/api/edital-verticalizado/${editalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ marcacoes })
      });
    } catch (error) {
      console.error("Erro ao salvar marcações:", error);
    }
  };

  // --- SALVAMENTO AUTOMÁTICO com debounce e pulando a primeira execução logo após o fetch ---
  useEffect(() => {
    if (!isEditing) return; // só salvar no modo edição
    // se foi o carregamento inicial, pula a primeira execução e marca como já passada
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }

    // debounce
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(() => {
      salvarMarcacoes(verticalizedNotice);
    }, 700);

    return () => {
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verticalizedNotice, isEditing, editalId]);

  // --- Funções de manipulação de matérias (mesma lógica que você tinha) ---
  const handleAddSubject = (section) => {
    if (section === 'basic') {
      setBasicSubjects(prevSubjects => [...prevSubjects, { id: crypto.randomUUID(), name: '', content: '' }]);
    } else if (section === 'specific') {
      setSpecificSubjects(prevSubjects => [...prevSubjects, { id: crypto.randomUUID(), name: '', content: '' }]);
    }
  };

  const handleRemoveSubject = (section, id) => {
    if (section === 'basic') {
      setBasicSubjects(prevSubjects => prevSubjects.filter(subject => subject.id !== id));
    } else if (section === 'specific') {
      setSpecificSubjects(prevSubjects => prevSubjects.filter(subject => subject.id !== id));
    }
  };

  const handleSubjectChange = (section, id, field, value) => {
    if (section === 'basic') {
      setBasicSubjects(prevSubjects =>
        prevSubjects.map(subject =>
          subject.id === id ? { ...subject, [field]: value } : subject
        )
      );
    } else if (section === 'specific') {
      setSpecificSubjects(prevSubjects =>
        prevSubjects.map(subject =>
          subject.id === id ? { ...subject, [field]: value } : subject
        )
      );
    }
  };

  // --- Geração do edital verticalizado (a partir das matérias que o usuário preencheu) ---
  const handleGenerateNotice = () => {
    const noticeData = [];

    const processAndAddTopics = (subjects, sectionTitle) => {
      subjects.forEach(subject => {
        if (subject.name.trim() && subject.content.trim()) {
          const content = subject.content.trim();

          // protege padrões que confundem regex
          const protectPatterns = (text) => {
            return text
              .replace(/\/(\d+)/g, '___SLASH_PROTECTED_$1___')
              .replace(/nº\s+(\d+)/g, '___NO_PROTECTED_$1___');
          };

          const restorePatterns = (text) => {
            return text
              .replace(/___SLASH_PROTECTED_(\d+)___/g, '/$1')
              .replace(/___NO_PROTECTED_(\d+)___/g, 'nº $1');
          };

          const protectedContent = protectPatterns(content);

          // detecta numeração no início de tópicos
          const hasNumberedTopics = /(?:^|\n)\d+(?:\.\d+)*\.?\s+/.test(protectedContent);

          let topics = [];

          if (hasNumberedTopics) {
            const regex = /(\d+(?:\.\d+)*)\.?\s+/g;
            let startIndex = 0;
            let match;
            while ((match = regex.exec(protectedContent)) !== null) {
              if (match.index > startIndex) {
                const topicText = protectedContent.substring(startIndex, match.index).trim();
                if (topicText) topics.push(restorePatterns(topicText));
              }
              startIndex = match.index;
            }
            if (startIndex < protectedContent.length) {
              const lastTopic = protectedContent.substring(startIndex).trim();
              if (lastTopic) topics.push(restorePatterns(lastTopic));
            }
            if (topics.length === 0) topics.push(restorePatterns(protectedContent));
          } else {
            let sentences = protectedContent.split(/\.\s+(?=[A-Z])/);
            if (sentences.length === 1) sentences = protectedContent.split(/;\s*/);
            if (sentences.length === 1) sentences = protectedContent.split(/:\s+(?=[A-Z])/);
            topics = sentences
              .map(sentence => {
                let clean = restorePatterns(sentence.trim());
                return clean.replace(/\.$/, '');
              })
              .filter(t => t && t.length > 2);
          }

          topics.forEach((topic, index) => {
            const levelMatch = topic.match(/^(\d+(?:\.\d+)*)/);
            const level = levelMatch ? levelMatch[0].split('.').length : 1;

            noticeData.push({
              id: `${sectionTitle}-${subject.name}-${index}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`.replace(/\s/g, '-'),
              section: `${sectionTitle} - ${subject.name.trim()}`,
              topic: topic.trim(),
              indent: level,
              completed: false,
              leiSeca: false,
              juris: false,
              questoes: false,
              revisoes: false,
              revisaoNumero: null,
            });
          });
        }
      });
    };

    processAndAddTopics(basicSubjects, 'Conhecimentos Básicos');
    processAndAddTopics(specificSubjects, 'Conhecimentos Específicos');

    setVerticalizedNotice(noticeData);
  };

  // --- Handlers de marcação: atualizam apenas o estado; o useEffect salva automaticamente ---
  const handleToggleCompletion = (id) => {
    setVerticalizedNotice(prev => prev.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const handleToggleLeiSeca = (id) => {
    setVerticalizedNotice(prev => prev.map(item =>
      item.id === id ? { ...item, leiSeca: !item.leiSeca } : item
    ));
  };

  const handleToggleJuris = (id) => {
    setVerticalizedNotice(prev => prev.map(item =>
      item.id === id ? { ...item, juris: !item.juris } : item
    ));
  };

  const handleToggleQuestoes = (id) => {
    setVerticalizedNotice(prev => prev.map(item =>
      item.id === id ? { ...item, questoes: !item.questoes } : item
    ));
  };

  const handleToggleRevisoes = (id) => {
    setVerticalizedNotice(prev => prev.map(item =>
      item.id === id
        ? { ...item, revisoes: !item.revisoes, revisaoNumero: !item.revisoes ? 1 : null }
        : item
    ));
  };

  const handleChangeRevisaoNumero = (id, numero) => {
    const parsed = Number.isFinite(Number(numero)) ? Number(numero) : null;
    setVerticalizedNotice(prev => prev.map(item =>
      item.id === id ? { ...item, revisaoNumero: parsed } : item
    ));
  };

  // --- Salvamento completo do edital (POST ou PATCH) ---
  const handleSalvarEdital = async () => {
    const tokenLocal = token || localStorage.getItem('token');

    if (!tituloEdital.trim()) {
      alert("Dê um nome ao edital antes de salvar.");
      return;
    }

    if (verticalizedNotice.length === 0) {
      alert("Gere o edital antes de salvar.");
      return;
    }

    const conteudo = {};
    const marcacoes = {};

    verticalizedNotice.forEach(item => {
      const { section, topic, completed, leiSeca, juris, questoes, revisoes, revisaoNumero } = item;
      if (!conteudo[section]) {
        conteudo[section] = [];
        marcacoes[section] = {};
      }
      conteudo[section].push(topic);
      marcacoes[section][topic] = {
        completado: completed,
        leiSeca,
        juris,
        questoes,
        revisoes,
        revisaoNumero
      };
    });

    const payload = {
      nome: tituloEdital.trim(),
      disciplina: "Multidisciplinar",
      conteudo,
      marcacoes
    };

    const url = isEditing ? `http://localhost:8000/api/edital-verticalizado/${editalId}` : "http://localhost:8000/api/edital-verticalizado/";
    const method = isEditing ? "PATCH" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenLocal}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        console.error("Erro ao salvar:", error);
        alert("Erro ao salvar edital: " + (error?.detail ? JSON.stringify(error.detail) : response.statusText));
        return;
      }

      const data = await response.json();
      console.log("✅ Edital salvo com sucesso:", data);
      alert("Edital salvo com sucesso!");
    } catch (err) {
      console.error("Erro inesperado:", err);
      alert("Erro inesperado ao salvar edital.");
    }
  };

  // --- Renderização da tabela ---
  const renderNoticeTable = () => {
    const groupedBySubject = verticalizedNotice.reduce((acc, item) => {
      if (!acc[item.section]) acc[item.section] = [];
      acc[item.section].push(item);
      return acc;
    }, {});

    return (
      <div className="bg-white shadow-xl rounded-2xl p-6 md:p-8 overflow-x-auto">
        <h2 className="text-3xl font-extrabold text-blue-600 mb-2 text-center">
          {tituloEdital || 'Seu Edital Verticalizado'}
        </h2>
        <p className="text-gray-600 text-center text-sm mb-6">
          Visualização do edital salvo
        </p>

        {Object.entries(groupedBySubject).map(([section, items]) => (
          <div key={section} className="mb-8">
            <div className="text-center my-6">
              <h3 className="text-xl font-bold uppercase tracking-wide">
                {section.split(' - ')[1] || section}
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 mb-6 min-w-[800px]">
                <thead>
                  <tr>
                    <th className="bg-blue-100 border border-gray-300 p-3 text-center font-bold text-blue-800">Conteúdo</th>
                    <th className="bg-green-100 border border-gray-300 p-3 text-center font-bold text-green-800 w-20">Teoria</th>
                    <th className="bg-yellow-100 border border-gray-300 p-3 text-center font-bold text-yellow-800 w-20">Lei Seca</th>
                    <th className="bg-purple-100 border border-gray-300 p-3 text-center font-bold text-purple-800 w-20">Juris</th>
                    <th className="bg-red-100 border border-gray-300 p-3 text-center font-bold text-red-800 w-20">Questões</th>
                    <th className="bg-orange-100 border border-gray-300 p-3 text-center font-bold text-orange-800 w-32">Revisões</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className={`border border-gray-300 ${item.completed ? 'bg-green-50' : ''}`}>
                      <td className="p-3 border-r border-gray-300">
                        <div style={{ paddingLeft: `${(item.indent - 1) * 24}px` }} className={`${item.completed ? 'line-through text-gray-500' : ''}`}>
                          {item.topic}
                        </div>
                      </td>

                      <td className="w-20 p-2 text-center align-top">
                        <input type="checkbox" checked={item.completed} onChange={() => handleToggleCompletion(item.id)} className="h-4 w-4 cursor-pointer" />
                      </td>

                      <td className="w-20 p-2 text-center align-top">
                        <input type="checkbox" checked={item.leiSeca} onChange={() => handleToggleLeiSeca(item.id)} className="h-4 w-4 cursor-pointer" />
                      </td>

                      <td className="w-20 p-2 text-center align-top">
                        <input type="checkbox" checked={item.juris} onChange={() => handleToggleJuris(item.id)} className="h-4 w-4 cursor-pointer" />
                      </td>

                      <td className="w-20 p-2 text-center align-top">
                        <input type="checkbox" checked={item.questoes} onChange={() => handleToggleQuestoes(item.id)} className="h-4 w-4 cursor-pointer" />
                      </td>

                      <td className="w-32 p-2 text-center align-top">
                        <div className="flex items-center justify-center space-x-2">
                          <input type="checkbox" checked={item.revisoes} onChange={() => handleToggleRevisoes(item.id)} className="h-4 w-4 cursor-pointer" />
                          {item.revisoes && (
                            <select value={item.revisaoNumero || 1} onChange={(e) => handleChangeRevisaoNumero(item.id, parseInt(e.target.value))} className="text-xs border border-gray-300 rounded px-1 py-0.5 bg-white">
                              {[1,2,3,4,5,6,7,8,9,10].map(num => <option key={num} value={num}>{num}ª</option>)}
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {!isEditing && (
          <div className="flex justify-center mt-6">
            <button onClick={handleSalvarEdital} className="py-2 px-6 bg-indigo-600 text-white text-lg font-bold rounded-lg shadow-md hover:bg-indigo-700 transition-colors">
              Salvar Edital
            </button>
          </div>
        )}
      </div>
    );
  };

  // Retorno condicional somente após declarar hooks (evita erro de hooks)
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-2xl text-blue-600">Carregando seu edital...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="text-center">
        </header>

        {/* Só aparece no modo criação */}
        {!isEditing && (
          <div className="bg-white shadow-xl rounded-2xl p-6 md:p-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título do Edital</label>
              <input type="text" value={tituloEdital} onChange={(e) => setTituloEdital(e.target.value)} placeholder="Nome do edital" className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <SubjectSection title="Conhecimentos Básicos" subjects={basicSubjects} sectionType="basic" onAdd={handleAddSubject} onRemove={handleRemoveSubject} onChange={handleSubjectChange} />

            <SubjectSection title="Conhecimentos Específicos" subjects={specificSubjects} sectionType="specific" onAdd={handleAddSubject} onRemove={handleRemoveSubject} onChange={handleSubjectChange} />

            <button onClick={handleGenerateNotice} className="w-full py-2 px-4 bg-blue-500 text-white text-lg font-bold rounded-lg shadow-md hover:bg-blue-600 transition-colors">
              Gerar Edital Verticalizado
            </button>
          </div>
        )}

        {verticalizedNotice.length > 0 && renderNoticeTable()}
      </div>
    </div>
  );
};

export default EditalVerticalizado;














