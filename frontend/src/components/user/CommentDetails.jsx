// CommentDetails.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; 

export default function CommentDetails({ token }) {
  const { id } = useParams(); // ID do comentário
  const [comment, setComment] = useState(null);
  const [error, setError] = useState('');
  // Adiciona um fallback para API_URL caso a variável de ambiente não esteja definida
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const navigate = useNavigate(); 

  useEffect(() => {
    const fetchComment = async () => {
      if (!token) { 
        setError('Token de autenticação ausente. Faça login novamente.');
        navigate('/login'); 
        return;
      }
      try {
        // CORRIGIDO: Endpoint da API para /api/comments/by-id/{comment_id}
        const res = await fetch(`${API_URL}/api/comments/by-id/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            setError('Sessão expirada ou não autorizada. Faça login novamente.');
            navigate('/login'); 
            return;
          }
          throw new Error('Comentário não encontrado');
        }
        const data = await res.json();
        setComment(data);
      } catch (err) {
        console.error(err);
        setError(err.message);
      }
    };

    fetchComment();
  }, [id, API_URL, token, navigate]); 

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!comment) return <div className="p-6">Carregando comentário...</div>;

  return (
    <div className="max-w-3xl mx-auto mt-8 bg-white p-6 rounded-lg shadow">
      {/* Botão de Voltar - Ajustado para ir para a aba correta */}
      <button
        onClick={() => navigate('/painel-estudante?tab=likedComments')} 
        className="flex items-center text-blue-600 hover:text-blue-800 font-semibold mb-6 transition duration-300"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Voltar para o Painel do Estudante
      </button>

      <h1 className="text-2xl font-bold mb-4 text-blue-700">Comentário na Questão #{comment.question_id}</h1>
      <p className="text-gray-600 mb-2">
        <strong>Autor:</strong> {comment.user?.username || 'Desconhecido'}
      </p>
      <p className="text-gray-600 mb-2">
        <strong>Questão ID:</strong> {comment.question_id || 'N/A'}
      </p>
      <p className="text-gray-600 mb-2">
        <strong>Matéria:</strong> {comment.materia || 'N/A'}
      </p>
      <p className="text-gray-600 mb-2">
        <strong>Assunto:</strong> {comment.assunto || 'N/A'}
      </p>
      <p className="text-gray-600 mb-2">
        <strong>Pontos:</strong> {comment.points}
      </p>
      <p className="text-gray-600 mb-2">
        <strong>Criado em:</strong> {new Date(comment.created_at).toLocaleDateString('pt-BR')}
      </p>
      {comment.updated_at && comment.updated_at !== comment.created_at && (
        <p className="text-gray-600 mb-2">
          <strong>Última atualização:</strong> {new Date(comment.updated_at).toLocaleDateString('pt-BR')}
        </p>
      )}
      <div className="mt-4 text-gray-800 border-t pt-4" dangerouslySetInnerHTML={{ __html: comment.content }} />
    </div>
  );
}



