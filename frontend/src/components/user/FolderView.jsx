import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LogOut, Folder, Book, Edit, Trash2, PlusCircle, Search, ArrowLeftCircle, Loader2, NotebookPen, ClipboardCheck, XCircle, AreaChart, TestTubes } from 'lucide-react';
import ActionModal from '../ui/ActionModal'; // Caminho correto, como verificamos nas últimas interações

export default function FolderView({ token, onLogout }) {
    const { id } = useParams(); // ID da pasta
    const navigate = useNavigate();
    const [folderName, setFolderName] = useState('');
    const [description, setDescription] = useState(''); // Para a descrição da pasta
    const [cadernos, setCadernos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState(''); // 'success' or 'error'
    const [searchTerm, setSearchTerm] = useState('');

    // Modal States (para cadernos dentro da pasta)
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [notebookToDelete, setNotebookToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [showRenameModal, setShowRenameModal] = useState(false);
    const [notebookToRename, setNotebookToRename] = useState(null);
    const [newNotebookName, setNewNotebookName] = useState('');
    const [isRenaming, setIsRenaming] = useState(false);

    // Define a URL da API diretamente
    const API_URL = 'http://localhost:8000';

    const fetchFolderContent = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/notebooks/${id}`, { // Busca o caderno/pasta pelo ID
                headers: { Authorization: `Bearer ${token}` },
                credentials: 'include',
            });

            if (res.status === 401) {
                onLogout();
                navigate('/login');
                return;
            }

            if (!res.ok) {
                const errorData = await res.json();
                let errorMessage = 'Falha ao carregar conteúdo da pasta.';
                if (errorData.detail) {
                    if (Array.isArray(errorData.detail)) {
                        errorMessage = errorData.detail.map(err => err.msg).join('; ');
                    } else if (typeof errorData.detail === 'string') {
                        errorMessage = errorData.detail;
                    } else {
                        errorMessage = JSON.stringify(errorData.detail);
                    }
                } else if (errorData.error) {
                    if (typeof errorData.error === 'string') {
                        errorMessage = errorData.error;
                    } else {
                        errorMessage = JSON.stringify(errorData.error);
                    }
                }
                throw new Error(errorMessage);
            }

            const data = await res.json();
            setFolderName(data.nome);
            setDescription(data.description || ''); // Define a descrição
            setCadernos(Array.isArray(data.children) ? data.children : []); // Assumindo que pastas têm 'children'
        } catch (err) {
            console.error('Erro ao buscar conteúdo da pasta:', err);
            setMessage(err.message || 'Erro ao carregar conteúdo da pasta.');
            setMessageType('error');
        } finally {
            setIsLoading(false);
            setTimeout(() => setMessage(''), 5000);
        }
    };

    useEffect(() => {
        if (token && id) {
            fetchFolderContent();
        } else if (!token) {
            onLogout();
            navigate('/login');
        }
    }, [token, id, navigate, onLogout]);


    const filteredCadernos = cadernos.filter(caderno =>
        caderno.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDeleteClick = (notebook) => {
        setNotebookToDelete(notebook);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!notebookToDelete) return;

        setIsDeleting(true);
        try {
            const res = await fetch(`${API_URL}/api/notebooks/${notebookToDelete.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
                credentials: 'include',
            });

            if (!res.ok) {
                const errorData = await res.json();
                let errorMessage = 'Falha ao deletar caderno/pasta.';
                if (errorData.detail) {
                    if (Array.isArray(errorData.detail)) {
                        errorMessage = errorData.detail.map(err => err.msg).join('; ');
                    } else if (typeof errorData.detail === 'string') {
                        errorMessage = errorData.detail;
                    } else {
                        errorMessage = JSON.stringify(errorData.detail);
                    }
                } else if (errorData.error) {
                    if (typeof errorData.error === 'string') {
                        errorMessage = errorData.error;
                    } else {
                        errorMessage = JSON.stringify(errorData.error);
                    }
                }
                throw new Error(errorMessage);
            }

            setMessage('Item deletado com sucesso!');
            setMessageType('success');
            setShowDeleteModal(false);
            fetchFolderContent(); // Recarrega a lista
        } catch (err) {
            console.error('Erro ao deletar item:', err);
            setMessage(err.message || 'Erro ao deletar item.');
            setMessageType('error');
        } finally {
            setIsDeleting(false);
            setTimeout(() => setMessage(''), 5000);
        }
    };

    const handleRenameClick = (notebook) => {
        setNotebookToRename(notebook);
        setNewNotebookName(notebook.nome);
        setShowRenameModal(true);
    };

    const confirmRename = async () => {
        if (!notebookToRename || !newNotebookName.trim()) {
            setMessage('Nome não pode ser vazio.');
            setMessageType('error');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        setIsRenaming(true);
        try {
            const res = await fetch(`${API_URL}/api/notebooks/${notebookToRename.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ nome: newNotebookName.trim() }),
                credentials: 'include',
            });

            if (!res.ok) {
                const errorData = await res.json();
                let errorMessage = 'Falha ao renomear.';
                if (errorData.detail) {
                    if (Array.isArray(errorData.detail)) {
                        errorMessage = errorData.detail.map(err => err.msg).join('; ');
                    } else if (typeof errorData.detail === 'string') {
                        errorMessage = errorData.detail;
                    } else {
                        errorMessage = JSON.stringify(errorData.detail);
                    }
                } else if (errorData.error) {
                    if (typeof errorData.error === 'string') {
                        errorMessage = errorData.error;
                    } else {
                        errorMessage = JSON.stringify(errorData.error);
                    }
                }
                throw new Error(errorMessage);
            }

            setMessage('Item renomeado com sucesso!');
            setMessageType('success');
            setShowRenameModal(false);
            fetchFolderContent(); // Recarrega a lista
        } catch (err) {
            console.error('Erro ao renomear item:', err);
            setMessage(err.message || 'Erro ao renomear item.');
            setMessageType('error');
        } finally {
            setIsRenaming(false);
            setTimeout(() => setMessage(''), 5000);
        }
    };

    const handleResolveNotebook = (notebookId) => {
        navigate(`/resolve-notebook/${notebookId}`);
    };

    const handleGoBack = () => {
        navigate(-1); // Volta para a página anterior
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 p-6 font-inter">
            {message && (
                <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg text-white ${messageType === 'success' ? 'bg-green-500' : 'bg-red-500'} z-50`}>
                    {message}
                </div>
            )}

            <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-xl mb-8 border border-gray-100">
                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight flex items-center">
                    <button onClick={handleGoBack} className="mr-4 text-gray-400 hover:text-gray-600 transition-colors">
                        <ArrowLeftCircle size={32} />
                    </button>
                    <Folder className="mr-3" size={32} /> {folderName}
                </h1>
                <button
                    onClick={onLogout}
                    className="flex items-center px-6 py-3 bg-red-600 text-white font-semibold rounded-xl shadow-lg hover:bg-red-700 transition-all duration-300 ease-in-out transform hover:scale-105"
                >
                    <LogOut className="mr-2" size={20} /> Sair
                </button>
            </header>

            <main className="max-w-7xl mx-auto space-y-8">
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
                    {description && (
                        <p className="text-gray-700 text-lg mb-6">{description}</p>
                    )}

                    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0">
                        <div className="relative w-full sm:w-1/2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar cadernos..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                            />
                        </div>
                        <div className="flex space-x-3">
                            {/* Botão para criar novo caderno dentro da pasta, se implementado */}
                            {/* <button
                                onClick={() => alert('Criar novo caderno nesta pasta (funcionalidade futura)')}
                                className="flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-md hover:bg-blue-700 transition-all duration-300 ease-in-out transform hover:scale-105"
                            >
                                <PlusCircle className="mr-2" size={20} /> Novo Caderno
                            </button> */}
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
                            <p className="ml-3 text-lg text-gray-700">Carregando conteúdo da pasta...</p>
                        </div>
                    ) : (
                        filteredCadernos.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredCadernos.map(caderno => (
                                    <div key={caderno.id} className="bg-gray-50 p-6 rounded-xl shadow-md border border-gray-100 flex flex-col justify-between transform transition-transform hover:scale-103 hover:shadow-lg">
                                        <div>
                                            <div className="flex items-center text-gray-700 mb-3">
                                                {caderno.is_folder ? <Folder className="mr-2" size={20} /> : <Book className="mr-2" size={20} />}
                                                <h3 className="text-xl font-semibold">{caderno.nome}</h3>
                                            </div>
                                            {caderno.is_folder && caderno.description && (
                                                <p className="text-gray-600 text-sm mb-3">{caderno.description}</p>
                                            )}
                                        </div>
                                        <div className="flex space-x-2 mt-4">
                                            {caderno.is_folder ? (
                                                <button
                                                    onClick={() => navigate(`/folder/${caderno.id}`)}
                                                    className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg shadow-sm hover:bg-blue-600 transition-colors text-sm font-medium"
                                                >
                                                    <Folder className="mr-1" size={16} /> Abrir Pasta
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleResolveNotebook(caderno.id)}
                                                    className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg shadow-sm hover:bg-blue-600 transition-colors text-sm font-medium"
                                                >
                                                    <NotebookPen className="mr-1" size={16} /> Resolver
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleRenameClick(caderno)}
                                                className="p-2 bg-yellow-500 text-white rounded-lg shadow-sm hover:bg-yellow-600 transition-colors"
                                                title="Renomear"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(caderno)}
                                                className="p-2 bg-red-500 text-white rounded-lg shadow-sm hover:bg-red-600 transition-colors"
                                                title="Deletar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-600 text-center py-10">Nenhum item nesta pasta.</p>
                        )
                    )}
                </div>
            </main>

            {/* Modal de Confirmação de Exclusão */}
            <ActionModal
                isOpen={showDeleteModal}
                onClose={() => { setShowDeleteModal(false); setNotebookToDelete(null); setIsDeleting(false); }}
                title={`Excluir "${notebookToDelete?.nome}"?`}
                message="Você tem certeza que deseja excluir este item? Esta ação é irreversível."
                onConfirm={confirmDelete}
                confirmText={isDeleting ? <span className="flex items-center"><Loader2 className="animate-spin h-5 w-5 mr-2" /> Excluindo...</span> : 'Excluir'}
                isConfirming={isDeleting}
                type="danger"
            />

            {/* Modal de Renomear */}
            <ActionModal
                isOpen={showRenameModal}
                onClose={() => {
                    setShowRenameModal(false);
                    setIsRenaming(false); // Garante que o loading state do modal seja resetado ao fechar
                    setNotebookToRename(null); // Limpa o item a ser renomeado
                    setNewNotebookName(''); // Limpa o nome do input
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





