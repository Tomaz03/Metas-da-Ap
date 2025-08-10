import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PlusCircle, FileText, Trash2, BookPlus, Loader2, Edit, Search, CalendarDays } from 'lucide-react';
import MessageModal from '../ui/MessageModal';
import ActionModal from '../ui/ActionModal';

// O TopNav foi removido daqui para evitar a duplicação.
// Ele deve ser renderizado no componente pai.

// Componente MeusEditais
const MeusEditais = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const API_URL = import.meta.env.VITE_API_URL;

  // Recupera o token do localStorage
  const token = localStorage.getItem('token');

  // Estados
  const [editais, setEditais] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); // Estado para o termo de busca

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editalToDelete, setEditalToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [editalToRename, setEditalToRename] = useState(null);
  const [newEditalName, setNewEditalName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  // Função para lidar com erros de autorização
  const handleUnauthorized = () => {
    setMessage('Sessão expirada ou não autorizada. Por favor, faça login novamente.');
    setMessageType('error');
    setTimeout(() => {
      // Verifica se onLogout é uma função antes de chamar para evitar o erro
      if (typeof onLogout === 'function') {
        onLogout();
      }
      navigate('/login');
    }, 3000);
  };

  // Buscar editais do backend ao carregar a página
  const fetchEditais = async () => {
    if (!token) {
        handleUnauthorized();
        return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/edital-verticalizado`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEditais(data);
      } else if (response.status === 401) {
        handleUnauthorized();
      } else {
        console.error('Erro ao buscar editais');
        setMessage('Erro ao buscar editais.');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Erro de conexão:', error);
      setMessage('Erro de conexão com o servidor.');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEditais();
    if (location.state?.message) {
      setMessage(location.state.message);
      setMessageType(location.state.type);
      window.history.replaceState({}, document.title); // Limpar o estado para não reexibir
    }
  }, [token, location]);

  const handleGerarCadernoDoEdital = async (edital) => {
    if (!token) {
        handleUnauthorized();
        return;
    }

    try {
      setMessage('Gerando caderno...');
      setMessageType('info');

      const response = await fetch(`${API_URL}/api/edital-verticalizado/${edital.id}/gerar-caderno`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        // REDIRECIONAR PARA A PÁGINA MyNotebooks.jsx APÓS O SUCESSO
        navigate('/meus-cadernos', { 
            state: { 
                message: `Caderno "${result.name || result.notebook_id}" gerado com sucesso!`, 
                type: 'success' 
            } 
        });
      } else if (response.status === 404) {
        setMessage('Nenhuma questão encontrada para este edital.');
        setMessageType('error');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erro ao gerar o caderno.');
      }
    } catch (error) {
      setMessage(error.message);
      setMessageType('error');
      console.error("Erro ao gerar o caderno:", error);
    }
  };

  const handleDeleteEdital = async (id) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`${API_URL}/api/edital-verticalizado/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        setMessage('Edital excluído com sucesso!');
        setMessageType('success');
        fetchEditais();
      } else if (response.status === 401) {
        handleUnauthorized();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erro ao excluir o edital.');
      }
    } catch (error) {
      setMessage(error.message);
      setMessageType('error');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setEditalToDelete(null);
    }
  };

  const handleRenameClick = (edital) => {
    setEditalToRename(edital);
    setNewEditalName(edital.nome);
    setShowRenameModal(true);
  };

  const confirmRename = async () => {
    if (!editalToRename || !newEditalName.trim()) return;

    setIsRenaming(true);
    try {
        const response = await fetch(`${API_URL}/api/edital-verticalizado/${editalToRename.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ nome: newEditalName })
        });
        if (response.ok) {
            setMessage('Edital renomeado com sucesso!');
            setMessageType('success');
            fetchEditais();
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Erro ao renomear o edital.');
        }
    } catch (error) {
        setMessage(error.message);
        setMessageType('error');
    } finally {
        setIsRenaming(false);
        setShowRenameModal(false);
        setEditalToRename(null);
        setNewEditalName('');
    }
  };

  const filteredEditais = editais.filter(edital => 
    edital.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 font-sans">
      <main className="flex-grow container mx-auto px-4 py-8">
        {message && <MessageModal message={message} type={messageType} onClose={() => setMessage('')} />}

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Meus Editais Verticalizados</h1>
          <button
            onClick={() => navigate('/gerar-edital-verticalizado')}
            className="flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105"
          >
            <PlusCircle size={20} className="mr-2" />
            Gerar Edital Verticalizado
          </button>
        </div>
        
        {/* Campo de busca adicionado novamente */}
        <div className="mb-6">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder="Buscar editais..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
            </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin h-10 w-10 text-blue-500" />
          </div>
        ) : filteredEditais.length > 0 ? (
          // ALTERAÇÃO AQUI: De grid para flexbox de coluna
          <div className="flex flex-col space-y-4">
            {filteredEditais.map(edital => (
              <div key={edital.id} className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-300 ease-in-out flex flex-col justify-between">
                <div className="flex-grow">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2 flex items-center">
                    <FileText className="mr-2 text-blue-500" size={20} /> {edital.nome}
                  </h3>
                  <p className="text-gray-600 text-sm">Salvo em: {new Date(edital.criado_em).toLocaleDateString()}</p>
                </div>
                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    onClick={() => navigate(`/gerar-edital-verticalizado?id=${edital.id}`)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200 text-sm"
                  >
                    Visualizar
                  </button>
                  <button
                    onClick={() => handleGerarCadernoDoEdital(edital)}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors duration-200 text-sm flex items-center"
                  >
                    <BookPlus size={16} className="mr-1" /> Gerar Caderno
                  </button>
                  <button
                    onClick={() => navigate(`/calendario/${edital.id}`)}
                    className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors duration-200 text-sm flex items-center"
                  >
                    <CalendarDays size={16} className="mr-1" /> Meu Calendário
                  </button>
                  <button
                    onClick={() => handleRenameClick(edital)}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors duration-200 text-sm"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => {
                        setEditalToDelete(edital);
                        setShowDeleteModal(true);
                    }}
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200 text-sm"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 text-center">
            <p className="text-gray-500">Nenhum edital verticalizado encontrado. Crie um novo edital a partir de um PDF.</p>
          </div>
        )}
      </main>

      {/* Modals para confirmação */}
      <ActionModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setEditalToDelete(null);
        }}
        title="Excluir Edital?"
        message="Você tem certeza que deseja excluir este edital? Esta ação é irreversível."
        onConfirm={() => handleDeleteEdital(editalToDelete.id)}
        confirmText={isDeleting ? <span className="flex items-center"><Loader2 className="animate-spin h-5 w-5 mr-2" /> Excluindo...</span> : 'Excluir'}
        isConfirming={isDeleting}
        type="danger"
      />

      <ActionModal
        isOpen={showRenameModal}
        onClose={() => {
          setShowRenameModal(false);
          setIsRenaming(false);
          setEditalToRename(null);
          setNewEditalName('');
        }}
        title={`Renomear "${editalToRename?.nome}"`}
        onConfirm={confirmRename}
        confirmText={isRenaming ? <span className="flex items-center"><Loader2 className="animate-spin h-5 w-5 mr-2" /> Salvando...</span> : 'Salvar'}
        isConfirming={isRenaming}
        type="info"
      >
        <label htmlFor="newEditalName" className="block text-sm font-semibold text-gray-700 mb-2">Novo Nome:</label>
        <input
            id="newEditalName"
            type="text"
            value={newEditalName}
            onChange={(e) => setNewEditalName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
            placeholder="Digite o novo nome"
        />
      </ActionModal>
    </div>
  );
};

export default MeusEditais;







