import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const VisualizarEditalVerticalizado = () => {
  const { id } = useParams();
  const [tituloEdital, setTituloEdital] = useState('');
  const [verticalizedNotice, setVerticalizedNotice] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchEditalData = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/edital-verticalizado/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error("Falha ao buscar dados do edital.");
        }

        const data = await response.json();
        setTituloEdital(data.nome);
        const noticeData = [];
        Object.keys(data.conteudo).forEach(section => {
          data.conteudo[section].forEach((topic, index) => {
            const marcacao = data.marcacoes[section]?.[topic] || {};
            const levelMatch = topic.match(/^(\d+(?:\.\d+)*)/);
            const level = levelMatch ? levelMatch[0].split('.').length : 1;

            noticeData.push({
              id: `${section}-${index}-${Date.now()}`,
              section,
              topic,
              indent: level,
              completed: marcacao.completado || false,
              leiSeca: marcacao.leiSeca || false,
              juris: marcacao.juris || false,
              questoes: marcacao.questoes || false,
              revisoes: marcacao.revisoes || false,
              revisaoNumero: marcacao.revisaoNumero || null,
            });
          });
        });

        setVerticalizedNotice(noticeData);
      } catch (error) {
        console.error(error);
        alert("Não foi possível carregar o edital.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEditalData();
  }, [id, token]);

  const renderNoticeTable = () => {
    const groupedBySubject = verticalizedNotice.reduce((acc, item) => {
      if (!acc[item.section]) {
        acc[item.section] = [];
      }
      acc[item.section].push(item);
      return acc;
    }, {});

    return (
      <div className="bg-white shadow-xl rounded-2xl p-6 md:p-8 overflow-x-auto">
        <h2 className="text-3xl font-extrabold text-blue-600 mb-6 text-center">
          Edital Verticalizado: {tituloEdital}
        </h2>
        
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
                    <th className="bg-blue-100 border border-gray-300 p-3 text-center font-bold text-blue-800">
                      Conteúdo
                    </th>
                    <th className="bg-green-100 border border-gray-300 p-3 text-center font-bold text-green-800 w-20">
                      Teoria
                    </th>
                    <th className="bg-yellow-100 border border-gray-300 p-3 text-center font-bold text-yellow-800 w-20">
                      Lei Seca
                    </th>
                    <th className="bg-purple-100 border border-gray-300 p-3 text-center font-bold text-purple-800 w-20">
                      Juris
                    </th>
                    <th className="bg-red-100 border border-gray-300 p-3 text-center font-bold text-red-800 w-20">
                      Questões
                    </th>
                    <th className="bg-orange-100 border border-gray-300 p-3 text-center font-bold text-orange-800 w-32">
                      Revisões
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr 
                      key={item.id} 
                      className={`border border-gray-300 ${item.completed ? 'bg-green-50' : ''}`}
                    >
                      <td className="p-3 border-r border-gray-300">
                        <div 
                          style={{ paddingLeft: `${(item.indent - 1) * 24}px` }}
                          className={`${item.completed ? 'line-through text-gray-500' : ''}`}
                        >
                          {item.topic}
                        </div>
                      </td>
                      
                      <td className="w-20 p-2 text-center align-top">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          disabled
                          className="h-4 w-4 cursor-pointer"
                        />
                      </td>

                      <td className="w-20 p-2 text-center align-top">
                        <input
                          type="checkbox"
                          checked={item.leiSeca}
                          disabled
                          className="h-4 w-4 cursor-pointer"
                        />
                      </td>

                      <td className="w-20 p-2 text-center align-top">
                        <input
                          type="checkbox"
                          checked={item.juris}
                          disabled
                          className="h-4 w-4 cursor-pointer"
                        />
                      </td>

                      <td className="w-20 p-2 text-center align-top">
                        <input
                          type="checkbox"
                          checked={item.questoes}
                          disabled
                          className="h-4 w-4 cursor-pointer"
                        />
                      </td>

                      <td className="w-32 p-2 text-center align-top">
                        <div className="flex items-center justify-center space-x-2">
                          <input
                            type="checkbox"
                            checked={item.revisoes}
                            disabled
                            className="h-4 w-4 cursor-pointer"
                          />
                          {item.revisoes && (
                            <span className="text-xs border border-gray-300 rounded px-1 py-0.5 bg-white">
                              {item.revisaoNumero}ª
                            </span>
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
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-2xl text-blue-600">Carregando seu edital...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        {renderNoticeTable()}
      </div>
    </div>
  );
};

export default VisualizarEditalVerticalizado;





