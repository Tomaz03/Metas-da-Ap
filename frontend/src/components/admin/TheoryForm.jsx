import React, { useState, useEffect, useCallback } from 'react';
import RichTextEditor from '../RichTextEditor';
import MessageModal from '../ui/MessageModal'; // Importa o MessageModal

// Importa todos os arquivos de assuntos de Direito
import { assuntosDireitoAdministrativo } from '../../data/assuntos/Direito/DireitoAdministrativo';
import { assuntosDireitoCivil } from '../../data/assuntos/Direito/DireitoCivil';
import { assuntosDireitoConstitucional } from '../../data/assuntos/Direito/DireitoConstitucional';
import { assuntosDireitoPenal } from '../../data/assuntos/Direito/DireitoPenal';
// Adicione outras importações de assuntos conforme necessário para outras matérias

// Mapeamento de matérias para seus respectivos arrays de assuntos
const assuntosPorMateria = {
  'Direito Administrativo': assuntosDireitoAdministrativo,
  'Direito Civil': assuntosDireitoCivil,
  'Direito Constitucional': assuntosDireitoConstitucional,
  'Direito Penal': assuntosDireitoPenal,
  // Adicione outros mapeamentos conforme necessário (ex: 'Matemática': assuntosMatematica)
};

// Recebe materiasDisponiveis como prop, que agora é a lista de strings de matérias
export default function TheoryForm({ token, onSuccess, theory, isLoading, onCancel, materiasDisponiveis }) {
  const [materia, setMateria] = useState('');
  const [assunto, setAssunto] = useState('');
  const [conteudo, setConteudo] = useState('');

  const [filteredMaterias, setFilteredMaterias] = useState([]);
  const [showMateriasSuggestions, setShowMateriasSuggestions] = useState(false);

  const [filteredAssuntos, setFilteredAssuntos] = useState([]);
  const [showAssuntosSuggestions, setShowAssuntosSuggestions] = useState(false);
  const [assuntosDinamicos, setAssuntosDinamicos] = useState([]); // Assuntos da matéria selecionada

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // Estado para controlar o carregamento do conteúdo da teoria
  const [isFetchingContent, setIsFetchingContent] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;

  // Efeito para preencher o formulário se estiver editando uma teoria existente
  useEffect(() => {
    if (theory) {
      setMateria(theory.materia || '');
      setAssunto(theory.assunto || '');
      setConteudo(theory.content || ''); // 'content' em vez de 'conteudo' para corresponder ao schema
    } else {
      // Limpa os campos quando não há teoria para edição (modo de criação)
      setMateria('');
      setAssunto('');
      setConteudo('');
    }
  }, [theory]);

  // Efeito para atualizar os assuntos dinâmicos quando a matéria muda
  // AGORA DEPENDE APENAS DE 'materia'
  useEffect(() => {
    const assuntosDaMateria = assuntosPorMateria[materia] || [];
    setAssuntosDinamicos(assuntosDaMateria);
    // Não limpa o assunto aqui, será limpo ao mudar a matéria no handleMateriaChange
  }, [materia]);

  // Efeito para carregar o conteúdo da teoria quando matéria e assunto são selecionados
  // Este useEffect só deve ser ativado se NÃO estivermos no modo de edição (theory é null)
  // ou se a teoria em edição for diferente da que está sendo buscada.
  useEffect(() => {
    const fetchTheoryContent = async () => {
      // Só busca se não estivermos editando uma teoria já carregada
      if (materia && assunto && (!theory || (theory.materia !== materia || theory.assunto !== assunto))) {
        setIsFetchingContent(true); // Define o estado de carregamento do conteúdo
        try {
          const response = await fetch(`${API_URL}/api/theories/${encodeURIComponent(materia)}/${encodeURIComponent(assunto)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) {
            // Se a teoria não for encontrada, limpa o conteúdo e não mostra erro
            if (response.status === 404) {
              setConteudo('');
              return;
            }
            throw new Error('Falha ao buscar conteúdo da teoria.');
          }
          const data = await response.json();
          setConteudo(data.content || '');
        } catch (error) {
          console.error('Erro ao buscar conteúdo da teoria:', error);
          setMessage('Erro ao carregar conteúdo da teoria.');
          setMessageType('error');
          setConteudo(''); // Limpa o conteúdo em caso de erro
        } finally {
          setIsFetchingContent(false); // Reseta o estado de carregamento do conteúdo
        }
      }
    };

    // Chama a função de busca apenas se não estivermos no modo de edição OU
    // se a matéria/assunto da teoria em edição for diferente da selecionada
    if (!theory || (theory.materia !== materia || theory.assunto !== assunto)) {
      fetchTheoryContent();
    }
  }, [materia, assunto, token, API_URL, theory]);

  // Função genérica para lidar com a seleção de sugestões
  const handleSuggestionClick = (value, setter, setShowSuggestions) => {
    setter(value);
    setShowSuggestions(false);
  };

  // Lógica de filtragem para matérias
  const handleMateriaChange = (e) => {
    const value = e.target.value;
    setMateria(value);
    setAssunto(''); // LIMPA O ASSUNTO AO MUDAR A MATÉRIA
    if (value) {
      const filtered = materiasDisponiveis.filter(m =>
        m.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredMaterias(filtered);
      setShowMateriasSuggestions(true);
    } else {
      setFilteredMaterias([]);
      setShowMateriasSuggestions(false);
    }
  };

  // Lógica de filtragem para assuntos
  const handleAssuntoChange = (e) => {
    const value = e.target.value;
    setAssunto(value);
    if (value) {
      const filtered = assuntosDinamicos.filter(a =>
        a.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredAssuntos(filtered);
      setShowAssuntosSuggestions(true);
    } else {
      setFilteredAssuntos([]);
      setShowAssuntosSuggestions(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!materia || !assunto || !conteudo) {
      setMessage('Por favor, preencha todos os campos obrigatórios.');
      setMessageType('error');
      return;
    }

    const theoryData = {
      materia,
      assunto,
      content: conteudo,
    };

    try {
      await onSuccess(theoryData); // Chama a função onSuccess passada via props
      setMessage(theory ? 'Teoria atualizada com sucesso!' : 'Teoria criada com sucesso!');
      setMessageType('success');
      // Limpa o formulário após o sucesso, se não estiver editando
      if (!theory) {
        setMateria('');
        setAssunto('');
        setConteudo('');
      }
    } catch (error) {
      console.error('Erro ao salvar teoria:', error);
      setMessage(`Erro ao salvar teoria: ${error.message}`);
      setMessageType('error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow-md">
      {message && (
        <MessageModal
          message={message}
          type={messageType}
          onClose={() => setMessage('')}
        />
      )}

      {/* Matéria */}
      <div className="mb-4 relative">
        <label htmlFor="materia" className="block text-gray-700 text-sm font-bold mb-2">Matéria:</label>
        <input
          type="text"
          id="materia"
          value={materia}
          onChange={handleMateriaChange}
          onFocus={() => setShowMateriasSuggestions(true)}
          onBlur={() => setTimeout(() => setShowMateriasSuggestions(false), 100)} // Pequeno delay para permitir o click
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Digite a matéria..."
          required
        />
        {showMateriasSuggestions && filteredMaterias.length > 0 && (
          <ul className="absolute z-10 bg-white border border-gray-300 w-full mt-1 rounded shadow-lg max-h-48 overflow-y-auto">
            {filteredMaterias.map((m) => (
              <li
                key={m}
                onClick={() => handleSuggestionClick(m, setMateria, setShowMateriasSuggestions)}
                className="px-3 py-2 cursor-pointer hover:bg-gray-100"
              >
                {m}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Assunto */}
      {materia && ( // Só mostra o campo de assunto se a matéria estiver selecionada
        <div className="mb-4 relative">
          <label htmlFor="assunto" className="block text-gray-700 text-sm font-bold mb-2">Assunto:</label>
          <input
            type="text"
            id="assunto"
            value={assunto}
            onChange={handleAssuntoChange}
            onFocus={() => setShowAssuntosSuggestions(true)}
            onBlur={() => setTimeout(() => setShowAssuntosSuggestions(false), 100)} // Pequeno delay
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Digite o assunto..."
            required
            disabled={!materia} // Desabilita se não houver matéria
          />
          {showAssuntosSuggestions && filteredAssuntos.length > 0 && (
            <ul className="absolute z-10 bg-white border border-gray-300 w-full mt-1 rounded shadow-lg max-h-48 overflow-y-auto">
              {filteredAssuntos.map((s) => (
                <li
                  key={s}
                  onClick={() => handleSuggestionClick(s, setAssunto, setShowAssuntosSuggestions)}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Conteúdo */}
      {materia && assunto && (
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">Conteúdo:</label>
          {/* Desabilita o RichTextEditor enquanto o conteúdo está sendo carregado */}
          <RichTextEditor value={conteudo} onChange={setConteudo} readOnly={isFetchingContent} />
          {isFetchingContent && <p className="text-sm text-gray-500 mt-1">Carregando conteúdo...</p>}
        </div>
      )}

      {/* Botões */}
      <button
        type="submit"
        // O botão é desabilitado se estiver salvando (isLoading) ou buscando conteúdo (isFetchingContent)
        disabled={isLoading || isFetchingContent}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition duration-300 ease-in-out"
      >
        {isLoading ? 'Salvando...' : (isFetchingContent ? 'Carregando...' : (theory ? 'Atualizar Teoria' : 'Criar Teoria'))}
      </button>
      {theory && ( // Só mostra o botão de cancelar se estiver em modo de edição
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading || isFetchingContent} // Desabilita também se estiver carregando
          className="ml-4 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-6 rounded-lg shadow-md transition duration-300 ease-in-out"
        >
          Cancelar
        </button>
      )}
    </form>
  );
}


























