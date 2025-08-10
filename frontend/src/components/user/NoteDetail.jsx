import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TopNav from '../TopNav';
import MessageModal from '../ui/MessageModal';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function NoteDetail({ token, onLogout }) {
  const { id } = useParams();
  const [note, setNote] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;

  const fetchNote = useCallback(async () => {
    setIsLoading(true);
    if (!token) {
      setMessage('Token de autenticação ausente. Por favor, faça login novamente.');
      setMessageType('error');
      onLogout();
      navigate('/login');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/notes/detail/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        setMessage('Sessão expirada ou não autorizada. Faça login novamente.');
        setMessageType('error');
        onLogout();
        navigate('/login');
        return;
      }
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Erro ao buscar anotação.');
      }

      const data = await res.json();
      setNote(data);
      setMessage('Anotação carregada com sucesso!');
      setMessageType('success');

    } catch (err) {
      console.error('Erro ao buscar anotação:', err);
      setMessage(`Erro ao carregar anotação: ${err.message}`);
      setMessageType('error');
    } finally {
      setTimeout(() => setMessage(''), 5000);
      setIsLoading(false);
    }
  }, [token, navigate, onLogout, API_URL, id]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  const createdAtDate = note?.created_at ? new Date(note.created_at) : null;
  const updatedAtDate = note?.updated_at ? new Date(note.updated_at) : null;

  let dateDisplay = 'Data Indisponível';
  if (updatedAtDate && createdAtDate && updatedAtDate.getTime() !== createdAtDate.getTime()) {
      dateDisplay = `Alterado em: ${updatedAtDate.toLocaleDateString('pt-BR')}`;
  } else if (createdAtDate) {
      dateDisplay = `Criado em: ${createdAtDate.toLocaleDateString('pt-BR')}`;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col font-inter">
        <TopNav onLogout={onLogout} />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="animate-spin mr-2 w-8 h-8 text-blue-600" />
          <p className="text-lg text-gray-700">Carregando anotação...</p>
        </main>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col font-inter">
        <TopNav onLogout={onLogout} />
        <main className="flex-grow flex items-center justify-center">
          <p className="text-lg text-red-600">Anotação não encontrada ou erro ao carregar.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col font-inter">
      {message && (
        <MessageModal
          message={message}
          type={messageType}
          onClose={() => setMessage('')}
        />
      )}

      <TopNav onLogout={onLogout} />

      <main className="flex-grow max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/painel-estudante')}
          className="flex items-center text-blue-600 hover:text-blue-800 font-semibold mb-6 transition duration-300"
        >
          <ArrowLeft className="mr-2 h-5 w-5" /> Voltar para Anotações
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <h1 className="text-3xl font-bold mb-4 text-gray-800">Detalhes da Anotação</h1>
          <p className="text-lg text-gray-700 mb-2">
            ID da Questão: <span className="font-semibold">{note.question_id || 'N/A'}</span>
          </p>
          <p className="text-lg text-gray-700 mb-2">
            Matéria: <span className="font-semibold">{note.materia || 'N/A'}</span>
          </p>
          <p className="text-lg text-gray-700 mb-4">
            Assunto: <span className="font-semibold">{note.assunto || 'N/A'}</span>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            {dateDisplay}
          </p>

          <div className="prose max-w-none text-gray-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: note.content || 'Nenhum conteúdo para esta anotação.' }}></div>
        </div>
      </main>

      <footer className="bg-white text-center text-sm text-gray-500 py-4 shadow-inner border-t border-gray-100">
        ©{new Date().getFullYear()} Questões da Aprovação. Todos os direitos reservados.
      </footer>
    </div>
  );
}

