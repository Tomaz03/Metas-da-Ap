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
  <div className="space-y-4">
    {questoesErradas.map((item, index) => (
      <div
        key={index}
        className="bg-white rounded-xl shadow-md border border-gray-100 p-6 flex flex-col md:flex-row md:items-center justify-between w-full"
      >
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">
            {item.question.materia} - {item.question.assunto}
          </h3>
          <p
            className="text-sm text-gray-600 mb-2 line-clamp-2"
            dangerouslySetInnerHTML={{ __html: item.question.enunciado }}
          ></p>
          <div className="flex items-center text-xs text-gray-500 space-x-4">
            <span className="flex items-center">
              <BookOpen className="h-4 w-4 mr-1" /> Caderno: {item.notebook_name}
            </span>
            <span className="flex items-center">
              <Clock className="h-4 w-4 mr-1" /> Erro registrado
            </span>
          </div>
        </div>
        <div className="mt-4 md:mt-0 md:ml-6 flex-shrink-0">
         <button
    onClick={() => navigate(`/resolver-caderno/${item.notebook_id}`)}
    className="ml-4 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition"
>
    Ver caderno
</button>
        </div>
      </div>
    ))}
  </div>
);
}






