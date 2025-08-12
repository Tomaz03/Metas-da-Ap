import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Folder, Book, Edit, Trash2, PlusCircle, Search, NotebookPen, FolderPlus, AreaChart, TestTubes, ClipboardCheck, XCircle, Loader2 } from 'lucide-react';
import ActionModal from '../ui/ActionModal';
import MessageModal from '../ui/MessageModal';
import logo from '../../assets/logo.png'; // Verifique se este caminho está correto!
import TopNav from "../TopNav";

export default function MyNotebooks({ token, onLogout }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchTerm, setSearchTerm] = useState('');
    const [notebooks, setNotebooks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [notebookToDelete, setNotebookToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [showRenameModal, setShowRenameModal] = useState(false);
    const [notebookToRename, setNotebookToRename] = useState(null);
    const [newNotebookName, setNewNotebookName] = useState('');
    const [isRenaming, setIsRenaming] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL;

    const handleUnauthorized = useCallback(() => {
        setMessage('Sessão expirada ou não autorizada. Faça login novamente.');
        setMessageType('error');
        if (typeof onLogout === 'function') {
            onLogout();
        } else {
            console.error("onLogout não é uma função em MyNotebooks.");
        }
        navigate('/login');
    }, [onLogout, navigate]);

    const fetchNotebooks = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/notebooks/`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('Resposta da API /api/notebooks/:', res);

            if (res.status === 401 || res.status === 403) {
                console.warn('Token inválido, expirado ou usuário inativo. Redirecionando para login.');
                handleUnauthorized();
                return;
            }
            if (!res.ok) {
                const errorData = await res.json();
                console.error('Erro na resposta da API /api/notebooks/:', errorData);
                throw new Error(errorData.detail || 'Falha ao carregar cadernos.');
            }

            const data = await res.json();
            console.log("Dados brutos de cadernos recebidos:", data);

            if (Array.isArray(data)) {
                const adaptedNotebooks = data.map(notebook => ({
                    ...notebook,
                    tipo: notebook.questoes_ids && notebook.questoes_ids.length > 0 ? 'caderno' : 'pasta',
                    descricao: '', // Definido como string vazia para ocultar
                    subitens_count: notebook.tipo === 'pasta' && notebook.subitens_count !== undefined ? notebook.subitens_count : 0,
                    totalQuestoes: notebook.total_questoes || 0, // Usar total_questoes do backend
                    acertos: notebook.acertos || 0,
                    respondidas: notebook.respondidas || 0,
                }));
                setNotebooks(adaptedNotebooks.filter(n => n.paiId === null));
            } else {
                console.error('Erro ao carregar cadernos: Dados inválidos', data);
                setMessage('Erro ao carregar cadernos. Formato de dados inválido.');
                setMessageType('error');
            }
        } catch (err) {
            console.error('Erro ao buscar cadernos (catch):', err);
            setMessage(err.message || 'Erro de conexão ou ao buscar cadernos.');
            setMessageType('error');
        } finally {
            setIsLoading(false);
            setTimeout(() => setMessage(''), 5000);
        }
    }, [API_URL, token, handleUnauthorized]);

    useEffect(() => {
        if (token) {
            fetchNotebooks();
        } else {
            handleUnauthorized();
        }
    }, [token, location.pathname, fetchNotebooks, handleUnauthorized]);

    const filteredNotebooks = notebooks.filter((notebook) =>
        notebook.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Ordenar notebooks: pastas primeiro, depois cadernos, ambos em ordem alfabética
    const sortedNotebooks = [...filteredNotebooks].sort((a, b) => {
        if (a.tipo === 'pasta' && b.tipo !== 'pasta') return -1;
        if (a.tipo !== 'pasta' && b.tipo === 'pasta') return 1;
        return a.nome.localeCompare(b.nome, 'pt', { sensitivity: 'base' });
    });

    const handleDeleteClick = (notebook) => {
        console.log('handleDeleteClick acionado para:', notebook.nome);
        setNotebookToDelete(notebook);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        console.log('confirmDelete acionado.');
        if (!notebookToDelete) {
            console.warn('Nenhum caderno para excluir definido.');
            return;
        }
        setIsDeleting(true);
        try {
            console.log(`Tentando excluir caderno/pasta com ID: ${notebookToDelete.id}`);
            const res = await fetch(`${API_URL}/api/notebooks/${notebookToDelete.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.status === 401 || res.status === 403) {
                handleUnauthorized();
                return;
            }

            if (res.ok) {
                console.log('Exclusão bem-sucedida no backend.');
                setNotebooks(prevNotebooks => prevNotebooks.filter((n) => n.id !== notebookToDelete.id));
                setMessage(`"${notebookToDelete.nome}" excluído(a) com sucesso!`);
                setMessageType('success');
            } else {
                const err = await res.json();
                console.error('Erro ao excluir no backend:', err);
                setMessage(err.detail || err.error || 'Erro ao excluir caderno/pasta.');
                setMessageType('error');
            }
        } catch (err) {
            console.error('Erro de rede/conexão ao tentar excluir:', err);
            setMessage('Erro de conexão ao tentar excluir.');
            setMessageType('error');
        } finally {
            console.log('Finalizando processo de exclusão.');
            setIsDeleting(false);
            setShowDeleteModal(false);
            setNotebookToDelete(null);
            setTimeout(() => setMessage(''), 5000);
        }
    };

    const handleRenameClick = (notebook) => {
        setNotebookToRename(notebook);
        setNewNotebookName(notebook.nome);
        setShowRenameModal(true);
    };

    const confirmRename = async () => {
        if (!notebookToRename || newNotebookName.trim() === '') {
            setMessage('O novo nome não pode ser vazio.');
            setMessageType('error');
            setTimeout(() => setMessage(''), 5000);
            return;
        }
        setIsRenaming(true);
        try {
            const res = await fetch(`${API_URL}/api/notebooks/${notebookToRename.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ nome: newNotebookName })
            });
            
            if (res.status === 401 || res.status === 403) {
                handleUnauthorized();
                return;
            }

            const data = await res.json();
            if (res.ok) {
                setNotebooks(notebooks.map(n => (n.id === notebookToRename.id ? { ...n, nome: data.nome } : n)));
                setMessage(`"${notebookToRename.nome}" renomeado(a) para "${data.nome}" com sucesso!`);
                setMessageType('success');
            } else {
                setMessage(data.detail || data.error || 'Erro ao renomear caderno/pasta.');
                setMessageType('error');
            }
        } catch (err) {
            console.error('Erro ao renomear:', err);
            setMessage('Erro de conexão ao tentar renomear.');
            setMessageType('error');
        } finally {
            setIsRenaming(false);
            setShowRenameModal(false);
            setNotebookToRename(null);
            setNewNotebookName('');
            setTimeout(() => setMessage(''), 5000);
        }
    };

    const handleOpenNotebook = (id, tipo) => {
        if (tipo === 'pasta') {
            navigate(`/pasta/${id}`);
        } else {
            navigate(`/resolver-caderno/${id}`);
        }
    };

    const renderEstatisticas = (notebook) => {
        const isFolder = !notebook.questoes_ids || notebook.questoes_ids.length === 0;
        const subitensCount = notebook.subitens_count !== undefined ? notebook.subitens_count : 0;

        if (isFolder) {
            const folderDescription = notebook.nome || 'Pasta sem nome.';
            return (
                <p className="text-sm text-gray-500 mt-1 flex items-center">
                    <Folder className="h-4 w-4 mr-1 text-yellow-600" />
                    {subitensCount > 0 ? `${subitensCount} item(s)` : folderDescription}
                </p>
            );
        }

        const acertos = notebook.acertos !== undefined ? notebook.acertos : 0;
        const respondidas = notebook.respondidas !== undefined ? notebook.respondidas : 0;
        const totalQuestoes = notebook.totalQuestoes !== undefined ? notebook.totalQuestoes : 0;

        const erros = respondidas - acertos;
        const percentualAcertos = respondidas > 0 ? ((acertos / respondidas) * 100).toFixed(0) : 0;

        return (
            <div className="text-sm text-gray-700 mt-1 space-y-0.5">
                <p className="flex items-center">
                    <ClipboardCheck className="h-4 w-4 mr-1 text-green-600" /> Acertos: {acertos}
                </p>
                <p className="flex items-center">
                    <XCircle className="h-4 w-4 mr-1 text-red-600" /> Erros: {erros}
                </p>
                <p className="flex items-center">
                    <NotebookPen className="h-4 w-4 mr-1 text-blue-600" /> Respondidas: {respondidas} de {totalQuestoes}
                </p>
                <p className="font-semibold flex items-center">
                    <AreaChart className="h-4 w-4 mr-1 text-indigo-600" /> Taxa de Acerto: {percentualAcertos}%
                </p>
            </div>
        );
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

            <main className="w-full p-6 pt-8"> {/* Removido max-w-7xl mx-auto que centralizava o conteúdo */}
    <div className="mb-8 flex justify-between items-center px-4"> {/* Adicionado px-4 para alinhamento lateral */}
        <h2 className="text-3xl font-bold text-gray-800">Meus Cadernos e Pastas</h2>
        <div className="flex gap-3">
            <button
                onClick={() => navigate('/novo-caderno')}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md flex items-center transition-transform transform hover:scale-105"
            >
                <PlusCircle className="h-5 w-5 mr-2" /> Novo Caderno
            </button>
            <button
                onClick={() => navigate('/nova-pasta')}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md flex items-center transition-transform transform hover:scale-105"
            >
                <FolderPlus className="h-5 w-5 mr-2" /> Nova Pasta
            </button>
        </div>
    </div>

    <div className="mb-8 relative px-4"> {/* Adicionado px-4 para alinhamento lateral */}
        <input
            type="text"
            placeholder="Pesquisar cadernos ou pastas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-gray-800 transition-colors"
        />
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" /> {/* Ajustado left-7 para compensar o padding */}
    </div>

    {isLoading ? (
    <div className="flex items-center justify-center py-10">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
        <p className="ml-3 text-lg text-gray-700">Carregando seus cadernos...</p>
    </div>
) : (
    <div className="grid grid-cols-1 gap-4 px-4"> {/* Uma coluna por vez */}
        {sortedNotebooks.length > 0 ? (
            sortedNotebooks.map((notebook) => (
                <div
                    key={notebook.id}
                    className={`bg-white rounded-xl shadow-md border border-gray-100 p-6 flex flex-col md:flex-row md:items-center justify-between w-full cursor-pointer hover:shadow-lg transition-all duration-300
                        ${notebook.tipo === 'pasta' ? 'bg-yellow-50 hover:bg-yellow-100' : 'bg-white hover:bg-gray-50'}
                    `}
                    onClick={() => handleOpenNotebook(notebook.id, notebook.tipo)}
                >
                    <div className="flex-1">
                        <h3 className={`text-lg font-semibold mb-1 flex items-center ${notebook.tipo === 'pasta' ? 'text-yellow-800' : 'text-blue-800'}`}>
                            {notebook.tipo === 'pasta'
                                ? <Folder className="h-5 w-5 mr-2" />
                                : <Book className="h-5 w-5 mr-2" />}
                            {notebook.nome}
                        </h3>
                        {renderEstatisticas(notebook)}
                    </div>
                    <div className="mt-4 md:mt-0 md:ml-6 flex-shrink-0 flex space-x-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRenameClick(notebook);
                            }}
                            className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition-colors"
                            title="Renomear"
                        >
                            <Edit className="h-5 w-5" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(notebook);
                            }}
                            className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50 transition-colors"
                            title="Excluir"
                        >
                            <Trash2 className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            ))
        ) : (
            <p className="text-gray-500 text-center py-10 col-span-full">
                Nenhum caderno ou pasta encontrado. Crie um novo para começar!
            </p>
        )}
    </div>
)}                      
</main>

            <ActionModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setIsDeleting(false);
                    setNotebookToDelete(null);
                }}
                title={`Excluir "${notebookToDelete?.nome}"?`}
                message={`Você tem certeza que deseja excluir ${notebookToDelete?.tipo === 'pasta' ? 'esta pasta e todo o seu conteúdo' : 'este caderno'}? Esta ação é irreversível.`}
                onConfirm={confirmDelete}
                confirmText={isDeleting ? <span className="flex items-center"><Loader2 className="animate-spin h-5 w-5 mr-2" /> Excluindo...</span> : 'Excluir'}
                isConfirming={isDeleting}
                type="danger"
            />

            <ActionModal
                isOpen={showRenameModal}
                onClose={() => {
                    setShowRenameModal(false);
                    setIsRenaming(false);
                    setNotebookToRename(null);
                    setNewNotebookName('');
                }}
                title={`Renomear "${notebookToRename?.nome}"`}
                onConfirm={confirmRename}
                confirmText={isRenaming ? <span className="flex items-center"><Loader2 className="animate-spin h-5 w-5 mr-2" /> Salvando...</span> : 'Salvar'}
                isConfirming={isRenaming}
                type="info"
            >
                <label htmlFor="newNotebookName" className="block text-sm font-semibold text-gray-700 mb-2">Novo Nome:</label>
                <input
                    id="newNotebookName"
                    type="text"
                    value={newNotebookName}
                    onChange={(e) => setNewNotebookName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                    placeholder="Digite o novo nome"
                />
            </ActionModal>
        </div>
    );
}











