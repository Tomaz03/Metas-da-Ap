import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, Loader2 } from 'lucide-react';

export default function MeusErrosPainel({ token, API_URL, onUnauthorized }) {
  const [questoesErradas, setQuestoesErradas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchErros = async () => {
      try {
        const res = await fetch(`${API_URL}/api/users/me/wrong-questions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403) {
          onUnauthorized();
          return;
        }
        const data = await res.json();
        setQuestoesErradas(data);
      } catch (error) {
        console.error('Erro ao buscar questões erradas:', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (token) fetchErros();
  }, [token, API_URL, onUnauthorized]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
        <p className="ml-3 text-lg text-gray-700">Carregando questões erradas...</p>
      </div>
    );
  }

  if (!questoesErradas.length) {
    return <div className="text-center py-10 text-gray-600">Você ainda não errou nenhuma questão.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {questoesErradas.map((item, index) => (
        <div key={index} className="bg-white p-6 rounded-xl shadow-md border border-gray-100 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {item.question.materia} - {item.question.assunto}
            </h3>
            <p className="text-sm text-gray-600 mb-3 line-clamp-3" dangerouslySetInnerHTML={{ __html: item.question.enunciado }}></p>
            <p className="text-xs text-gray-500 flex items-center">
              <BookOpen className="h-4 w-4 mr-1" /> Caderno: {item.notebook_name}
            </p>
            <p className="text-xs text-gray-500 flex items-center mt-1">
              <Clock className="h-4 w-4 mr-1" /> Erro registrado
            </p>
          </div>
          <div className="flex space-x-2 mt-4">
            <button
              onClick={() => navigate(`/resolver-caderno/${item.notebook_id}`)}
              className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg shadow-sm hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              <BookOpen className="mr-1" size={16} /> Ver Caderno
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}






