// src/components/user/MeusComentariosPainel.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, FileText, Download, CheckSquare, Square, Search, XCircle } from 'lucide-react';
import MessageModal from '../ui/MessageModal';

// Função utilitária para remover tags <p> do conteúdo HTML
const removePTags = (html) => {
    if (typeof html !== 'string') return html;
    return html
        .replace(/^(\s*<p[^>]*>)+/i, '')
        .replace(/(<\/p>\s*)+$/i, '');
};

export default function MeusComentariosPainel({ token, onUnauthorized, API_URL }) {
    const [myComments, setMyComments] = useState([]);
    const [filteredMyComments, setFilteredMyComments] = useState([]);
    const [selectedCommentIds, setSelectedCommentIds] = useState(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    // Função para carregar o script html2pdf.js (se ainda não estiver carregado)
    const loadHtml2PdfScript = () => {
        return new Promise((resolve, reject) => {
            if (window.html2pdf) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    };

    // Função para buscar os comentários do usuário
    const fetchMyComments = useCallback(async () => {
        setIsLoading(true);
        if (!token) {
            setMessage('Token de autenticação ausente. Por favor, faça login novamente.');
            setMessageType('error');
            onUnauthorized();
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/users/me/comments`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.status === 401 || res.status === 403) {
                onUnauthorized();
                return;
            }
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || 'Erro ao buscar seus comentários.');
            }

            const data = await res.json();
            setMyComments(data);
            setFilteredMyComments(data); // Inicializa filteredMyComments com todos os dados
            setMessage('Comentários carregados com sucesso!');
            setMessageType('success');

        } catch (err) {
            console.error('Erro ao buscar comentários:', err);
            setMessage(`Erro ao carregar comentários: ${err.message}`);
            setMessageType('error');
        } finally {
            setIsLoading(false);
            setTimeout(() => setMessage(''), 5000); // Limpa a mensagem após 5 segundos
        }
    }, [token, navigate, onUnauthorized, API_URL]);

    // Efeito para carregar os comentários ao montar o componente
    useEffect(() => {
        fetchMyComments();
        loadHtml2PdfScript()
            .then(() => console.log('html2pdf.js carregado com sucesso para meus comentários'))
            .catch((err) => console.error('Erro ao carregar html2pdf.js para meus comentários:', err));
    }, [fetchMyComments]);

    // Efeito para filtrar os comentários quando o termo de busca ou os comentários mudam
    useEffect(() => {
        const lowercasedSearchTerm = searchTerm.toLowerCase();
        const filtered = myComments.filter(comment => {
            const commentMateria = comment.materia || '';
            const commentAssunto = comment.assunto || '';
            const commentQuestionId = String(comment.question_id || '');
            const commentAuthor = comment.user?.username || ''; // Inclui o nome do autor na busca
            const commentContent = removePTags(comment.content || ''); // Permite buscar no conteúdo

            return (
                commentMateria.toLowerCase().includes(lowercasedSearchTerm) ||
                commentAssunto.toLowerCase().includes(lowercasedSearchTerm) ||
                commentQuestionId.includes(lowercasedSearchTerm) ||
                commentAuthor.toLowerCase().includes(lowercasedSearchTerm) ||
                commentContent.toLowerCase().includes(lowercasedSearchTerm)
            );
        });
        setFilteredMyComments(filtered);
    }, [searchTerm, myComments]);

    // Lida com a seleção/desseleção de um comentário individual
    const handleSelectComment = (commentId) => {
        setSelectedCommentIds((prevSelected) => {
            const newSelected = new Set(prevSelected);
            if (newSelected.has(commentId)) {
                newSelected.delete(commentId);
            } else {
                newSelected.add(commentId);
            }
            return newSelected;
        });
    };

    // Lida com a seleção/desseleção de todos os comentários filtrados
    const handleSelectAllComments = () => {
        if (selectedCommentIds.size === filteredMyComments.length && filteredMyComments.length > 0) {
            setSelectedCommentIds(new Set()); // Desmarcar todas
        } else {
            const allCommentIds = new Set(filteredMyComments.map((comment) => comment.id));
            setSelectedCommentIds(allCommentIds); // Marcar todas
        }
    };

    // Navega para os detalhes de um comentário específico (reutiliza a rota existente)
    const handleViewCommentDetails = (commentId) => {
        navigate(`/comentarios/${commentId}`);
    };

    // Gera o PDF dos comentários selecionados
    const handleGeneratePdf = async () => {
        if (selectedCommentIds.size === 0) {
            setMessage('Selecione ao menos um comentário para gerar o PDF.');
            setMessageType('error');
            return;
        }

        if (!window.html2pdf) {
            setMessage('A biblioteca de PDF ainda não foi carregada. Tente novamente em instantes.');
            setMessageType('error');
            return;
        }

        setMessage('Gerando PDF... Isso pode levar alguns segundos.');
        setMessageType('success');

        try {
            const commentsToExport = myComments.filter(comment => selectedCommentIds.has(comment.id));

            const contentHtml = `
                <div style="font-family: 'Inter', sans-serif; padding: 20px; color: #333;">
                    <h1 style="text-align: center; color: #1a202c; margin-bottom: 30px;">Meus Comentários</h1>
                    ${commentsToExport.map(comment => {
                        const createdAtDate = comment.created_at ? new Date(comment.created_at) : null;
                        const updatedAtDate = comment.updated_at ? new Date(comment.updated_at) : null;

                        let dateDisplay = 'Data Indisponível';
                        if (updatedAtDate && createdAtDate && updatedAtDate.getTime() !== createdAtDate.getTime()) {
                            dateDisplay = `Alterado em: ${updatedAtDate.toLocaleDateString('pt-BR')}`;
                        } else if (createdAtDate) {
                            dateDisplay = `Criado em: ${createdAtDate.toLocaleDateString('pt-BR')}`;
                        }

                        return `
                            <div style="margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid #eee;">
                                <h2 style="color: #2c5282; margin-bottom: 10px;">Comentário da Questão ID: ${comment.question_id || 'N/A'}</h2>
                                <p style="font-size: 0.9em; color: #718096; margin-bottom: 5px;">
                                    Matéria: ${comment.materia || 'N/A'} | Assunto: ${comment.assunto || 'N/A'}
                                </p>
                                <p style="font-size: 0.9em; color: #718096; margin-bottom: 15px;">
                                    Autor: ${comment.user?.username || 'Desconhecido'} | ${dateDisplay}
                                </p>
                                <div style="line-height: 1.6; word-wrap: break-word;">
                                    ${comment.content || 'Sem conteúdo.'}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;

            const options = {
                margin: 10,
                filename: 'meus_comentarios.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            };

            await window.html2pdf().set(options).from(contentHtml).save();
            setMessage('PDF gerado com sucesso!');
            setMessageType('success');

        } catch (err) {
            console.error('Erro ao gerar PDF:', err);
            setMessage(`Erro ao gerar PDF: ${err.message}`);
            setMessageType('error');
        } finally {
            setTimeout(() => setMessage(''), 5000);
        }
    };

    return (
        <>
            {message && (
                <MessageModal message={message} type={messageType} onClose={() => setMessage('')} />
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
                <div className="relative w-full sm:w-1/2">
                    <input
                        type="text"
                        placeholder="Buscar comentários por ID da Questão, Matéria, Assunto ou Autor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <button
                        onClick={handleSelectAllComments}
                        className="flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-lg shadow hover:bg-gray-300 transition"
                    >
                        {selectedCommentIds.size === filteredMyComments.length && filteredMyComments.length > 0 ? (
                            <CheckSquare className="mr-2 w-5 h-5" />
                        ) : (
                            <Square className="mr-2 w-5 h-5" />
                        )}
                        {selectedCommentIds.size === filteredMyComments.length && filteredMyComments.length > 0 ? 'Desmarcar Todas' : 'Marcar Todas'}
                    </button>
                    <button
                        onClick={handleGeneratePdf}
                        disabled={selectedCommentIds.size === 0}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download className="mr-2 w-5 h-5" /> Gerar PDF ({selectedCommentIds.size})
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-10 text-gray-600">
                    <Loader2 className="animate-spin mr-2" />
                    Carregando comentários...
                </div>
            ) : filteredMyComments.length === 0 ? (
                <div className="text-center py-10 text-gray-600">
                    <p>Nenhum comentário encontrado.</p>
                    {searchTerm && <p className="mt-2">Tente ajustar o termo de busca.</p>}
                </div>
            ) : (
                <div className="space-y-4 overflow-y-auto flex-1">
                    {filteredMyComments.map((comment) => {
                        const createdAtDate = comment.created_at ? new Date(comment.created_at) : null;
                        const updatedAtDate = comment.updated_at ? new Date(comment.updated_at) : null;

                        let dateDisplay = 'Data Indisponível';
                        if (updatedAtDate && createdAtDate && updatedAtDate.getTime() !== createdAtDate.getTime()) {
                            dateDisplay = `Alterado em: ${updatedAtDate.toLocaleDateString('pt-BR')}`;
                        } else if (createdAtDate) {
                            dateDisplay = `Criado em: ${createdAtDate.toLocaleDateString('pt-BR')}`;
                        }

                        return (
                            <div
                                key={comment.id}
                                className="flex items-start p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedCommentIds.has(comment.id)}
                                    onChange={() => handleSelectComment(comment.id)}
                                    className="mt-1 mr-3 h-5 w-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                />
                                <div className="flex-grow">
                                    <h3 className="text-lg font-semibold text-gray-800">Comentário Feito</h3>
                                    <p className="text-sm text-gray-700 mt-1">
                                        ID da Questão: <span className="font-medium">{comment.question_id || 'N/A'}</span>
                                    </p>
                                    <p className="text-sm text-gray-700">
                                        Matéria: <span className="font-medium">{comment.materia || 'N/A'}</span> | Assunto: <span className="font-medium">{comment.assunto || 'N/A'}</span>
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {dateDisplay}
                                    </p>
                                </div>
                                <button
    onClick={() => handleViewCommentDetails(comment.id)}
    className="ml-4 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition"
>
    Ver comentário
</button>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
}





