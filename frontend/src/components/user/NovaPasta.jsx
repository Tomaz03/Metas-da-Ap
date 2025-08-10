import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FolderPlus, ArrowLeftCircle, Loader2, LogOut, Book, AreaChart, TestTubes, ClipboardCheck } from 'lucide-react';

export default function NovaPasta({ token, onLogout }) {
    const [nome, setNome] = useState('');
    const [descricao, setDescricao] = useState('');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState(''); // 'success' or 'error'
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Extrai o paiId dos query parameters (ex: /nova-pasta?paiId=123)
    const queryParams = new URLSearchParams(location.search);
    const parentFolderId = queryParams.get('paiId');
    const paiId = parentFolderId ? parseInt(parentFolderId) : null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setMessageType('');
        setIsLoading(true);

        const data = {
            nome,
            descricao,
            tipo: 'pasta',
            paiId: paiId
        };

        if (!nome.trim()) {
            setMessage('O nome da pasta é obrigatório.');
            setMessageType('error');
            setIsLoading(false);
            setTimeout(() => setMessage(''), 5000);
            return;
        }

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notebooks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                setMessage('Pasta criada com sucesso!');
                setMessageType('success');
                setTimeout(() => {
                    if (paiId) {
                        navigate(`/pasta/${paiId}`);
                    } else {
                        navigate('/meus-cadernos');
                    }
                }, 1500);
            } else {
                const error = await res.json();
                setMessage(error.error || 'Erro ao criar nova pasta.');
                setMessageType('error');
            }
        } catch (err) {
            console.error(err);
            setMessage('Erro de conexão com o servidor.');
            setMessageType('error');
        } finally {
            setIsLoading(false);
            setTimeout(() => setMessage(''), 5000);
        }
    };

    const handleBack = () => {
        if (paiId) {
            navigate(`/pasta/${paiId}`);
        } else {
            navigate('/meus-cadernos');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col font-inter">
            {/* Mensagens de Status Flutuantes */}
            {message && (
                <div className={`fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-lg z-50 animate-fade-in-down
                    ${messageType === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    {message}
                </div>
            )}

            {/* Header (mantido inalterado) */}
            <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 shadow-lg sticky top-0 z-20">
                <div className="flex justify-between items-center max-w-7xl mx-auto">
                    <div className="flex items-center space-x-6">
                        <h1 className="text-3xl font-extrabold tracking-tight">
                            <button onClick={handleBack} className="text-white hover:text-gray-200 transition duration-300 flex items-center">
                                <ArrowLeftCircle className="h-7 w-7 mr-3" />
                                {paiId ? 'Voltar para Pasta' : 'Meus Cadernos'}
                            </button>
                        </h1>
                        <button
                            onClick={onLogout}
                            className="flex items-center text-white hover:text-gray-200 transition duration-300 font-medium px-3 py-1 rounded-md bg-blue-500 hover:bg-blue-600"
                        >
                            <LogOut className="mr-2 h-5 w-5" /> Sair
                        </button>
                    </div>

                    <div className="flex space-x-3">
                        <button
                            onClick={() => navigate('/meus-cadernos')}
                            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md flex items-center"
                        >
                            <Book className="h-5 w-5 mr-2" /> Cadernos
                        </button>
                        <button
                            onClick={() => navigate('/estatisticas-gerais')}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md flex items-center"
                        >
                            <AreaChart className="h-5 w-5 mr-2" /> Estatísticas
                        </button>
                        <button
                            onClick={() => navigate('/provas')}
                            className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md flex items-center"
                        >
                            <TestTubes className="h-5 w-5 mr-2" /> Provas
                        </button>
                        <button
                            onClick={() => navigate('/simulados')}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md flex items-center"
                        >
                            <ClipboardCheck className="h-5 w-5 mr-2" /> Simulados
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-grow flex items-center justify-center px-4 py-8">
                <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8 md:p-10 animate-fade-in-up">
                    <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center flex items-center justify-center">
                        <FolderPlus className="h-8 w-8 mr-3 text-blue-600" />
                        Criar Nova Pasta {paiId && `em ${paiId}`}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="nome" className="block text-sm font-semibold text-gray-700 mb-2">Nome da Pasta</label>
                            <input
                                type="text"
                                id="nome"
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition duration-200 shadow-sm text-gray-800"
                                placeholder="Ex: Direito Constitucional"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="descricao" className="block text-sm font-semibold text-gray-700 mb-2">Descrição (opcional)</label>
                            <textarea
                                id="descricao"
                                value={descricao}
                                onChange={(e) => setDescricao(e.target.value)}
                                className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition duration-200 shadow-sm text-gray-800 resize-y"
                                rows="3"
                                placeholder="Breve descrição sobre o conteúdo da pasta"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition duration-300 shadow-md transform hover:scale-[1.02] flex items-center justify-center
                                ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? (
                                <span className="flex items-center">
                                    <Loader2 className="animate-spin h-5 w-5 mr-2" /> Criando Pasta...
                                </span>
                            ) : (
                                <span className="flex items-center">
                                    <FolderPlus className="h-5 w-5 mr-2" /> Criar Pasta
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={handleBack}
                            className="w-full py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-xl transition duration-300 shadow-sm transform hover:scale-[1.01] flex items-center justify-center mt-3"
                        >
                            <ArrowLeftCircle className="h-5 w-5 mr-2" /> Voltar
                        </button>
                    </form>
                </div>
            </main>

            {/* Footer aprimorado */}
            <footer className="bg-white text-center text-sm text-gray-500 py-4 shadow-inner border-t border-gray-100">
                ©{new Date().getFullYear()} Questões da Aprovação. Todos os direitos reservados.
            </footer>

            {/* Animações CSS personalizadas */}
            <style jsx>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fade-in-down {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
                .animate-fade-in-down { animation: fade-in-down 0.5s ease-out forwards; }
            `}</style>
        </div>
    );
}



