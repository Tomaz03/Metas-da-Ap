import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TopNav from '../TopNav';
import MessageModal from '../ui/MessageModal';
import DOMPurify from 'dompurify';
import { BookOpen, Loader2, ChevronLeft } from 'lucide-react';

export default function TheoryViewer({ token, onLogout }) {
    const { materia, assunto } = useParams();
    const navigate = useNavigate();
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    const [theoryContent, setTheoryContent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('info');

    const handleUnauthorized = useCallback(() => {
        setMessage('Sessão expirada ou não autorizada. Faça login novamente.');
        setMessageType('error');
        if (typeof onLogout === 'function') {
            onLogout();
        } else {
            console.error("onLogout não é uma função em TheoryViewer.");
        }
        navigate('/login');
    }, [onLogout, navigate]);

    useEffect(() => {
        const fetchTheory = async () => {
            if (!materia || !assunto || !token) {
                setMessage('Matéria ou assunto não especificados, ou token ausente.');
                setMessageType('error');
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setMessage('');
            setMessageType('info');

            try {
                const res = await fetch(`${API_URL}/api/theories/${encodeURIComponent(materia)}/${encodeURIComponent(assunto)}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (res.status === 401 || res.status === 403) {
                    handleUnauthorized();
                    return;
                }
                if (res.ok) {
                    const data = await res.json();
                    setTheoryContent(data.content);
                } else if (res.status === 404) {
                    setMessage('Teoria não encontrada para esta matéria e assunto.');
                    setMessageType('warning');
                    setTheoryContent(null);
                } else {
                    const errorData = await res.json();
                    setMessage(errorData.detail || 'Erro ao carregar a teoria.');
                    setMessageType('error');
                    setTheoryContent(null);
                }
            } catch (err) {
                console.error('Erro ao buscar teoria:', err);
                setMessage('Erro ao carregar a teoria. Verifique sua conexão.');
                setMessageType('error');
                setTheoryContent(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTheory();
    }, [materia, assunto, token, API_URL, handleUnauthorized]);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <TopNav onLogout={onLogout} />
            <main className="flex-1 container mx-auto px-4 py-8">
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 min-h-[600px] relative">
                    <button
                        onClick={() => navigate(-1)} // Volta para a página anterior
                        className="absolute top-4 left-4 flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        <ChevronLeft className="mr-2" size={20} /> Voltar
                    </button>
                    <h1 className="text-3xl font-extrabold text-gray-900 text-center mb-6 pt-12">
                        <BookOpen className="inline-block mr-3 text-blue-600" size={32} />
                        {decodeURIComponent(materia)} - {decodeURIComponent(assunto)}
                    </h1>

                    {message && (
                        <MessageModal
                            message={message}
                            type={messageType}
                            onClose={() => setMessage('')}
                        />
                    )}

                    {isLoading ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
                            <p className="ml-3 text-lg text-gray-700">Carregando teoria...</p>
                        </div>
                    ) : theoryContent ? (
                        <div
                            className="prose max-w-none p-4 rounded-lg bg-gray-50 overflow-auto"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(theoryContent) }}
                        />
                    ) : (
                        <div className="text-center py-10 text-gray-600">
                            Nenhum conteúdo teórico disponível para esta matéria e assunto.
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
