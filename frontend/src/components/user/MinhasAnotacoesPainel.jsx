// src/components/user/MinhasAnotacoesPainel.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, FileText, Download, CheckSquare, Square, Search, XCircle } from 'lucide-react';
import MessageModal from '../ui/MessageModal';

// Função para carregar o script html2pdf.js
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

// Função utilitária para remover tags <p> do conteúdo HTML
const removePTags = (html) => {
    if (typeof html !== 'string') return html;
    return html
        .replace(/^(\s*<p[^>]*>)+/i, '')
        .replace(/(<\/p>\s*)+$/i, '');
};

export default function MinhasAnotacoesPainel({ token, onUnauthorized, API_URL }) {
    const [notes, setNotes] = useState([]);
    const [filteredNotes, setFilteredNotes] = useState([]);
    const [selectedNoteIds, setSelectedNoteIds] = useState(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    // Função para buscar as anotações do usuário
    const fetchNotes = useCallback(async () => {
        setIsLoading(true);
        if (!token) {
            setMessage('Token de autenticação ausente. Por favor, faça login novamente.');
            setMessageType('error');
            onUnauthorized();
            // Não retorna aqui para que o componente possa exibir a mensagem de erro
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/notes/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.status === 401 || res.status === 403) {
                onUnauthorized();
                return;
            }
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || 'Erro ao buscar anotações.');
            }

            const data = await res.json();
            setNotes(data);
            setFilteredNotes(data); // Inicializa filteredNotes com todos os dados
            setMessage('Anotações carregadas com sucesso!');
            setMessageType('success');

        } catch (err) {
            console.error('Erro ao buscar anotações:', err);
            setMessage(`Erro ao carregar anotações: ${err.message}`);
            setMessageType('error');
        } finally {
            setIsLoading(false);
            setTimeout(() => setMessage(''), 5000); // Limpa a mensagem após 5 segundos
        }
    }, [token, navigate, onUnauthorized, API_URL]);

    // Efeito para carregar as anotações ao montar o componente
    useEffect(() => {
        fetchNotes();
        // Carrega o script html2pdf.js
        loadHtml2PdfScript()
            .then(() => console.log('html2pdf.js carregado com sucesso'))
            .catch((err) => console.error('Erro ao carregar html2pdf.js:', err));
    }, [fetchNotes]);

    // Efeito para filtrar as anotações quando o termo de busca ou as anotações mudam
    useEffect(() => {
        const lowercasedSearchTerm = searchTerm.toLowerCase();
        const filtered = notes.filter(note => {
            const noteMateria = note.materia || '';
            const noteAssunto = note.assunto || '';
            const noteQuestionId = String(note.question_id || '');

            return (
                noteMateria.toLowerCase().includes(lowercasedSearchTerm) ||
                noteAssunto.toLowerCase().includes(lowercasedSearchTerm) ||
                noteQuestionId.includes(lowercasedSearchTerm)
            );
        });
        setFilteredNotes(filtered);
    }, [searchTerm, notes]);

    // Lida com a seleção/desseleção de uma anotação individual
    const handleSelectNote = (noteId) => {
        setSelectedNoteIds((prevSelected) => {
            const newSelected = new Set(prevSelected);
            if (newSelected.has(noteId)) {
                newSelected.delete(noteId);
            } else {
                newSelected.add(noteId);
            }
            return newSelected;
        });
    };

    // Lida com a seleção/desseleção de todas as anotações filtradas
    const handleSelectAllNotes = () => {
        if (selectedNoteIds.size === filteredNotes.length && filteredNotes.length > 0) {
            setSelectedNoteIds(new Set()); // Desmarcar todas
        } else {
            const allNoteIds = new Set(filteredNotes.map((note) => note.id));
            setSelectedNoteIds(allNoteIds); // Marcar todas
        }
    };

    // Navega para os detalhes de uma anotação específica
    const handleViewNoteDetails = (noteId) => {
        navigate(`/minhas-anotacoes/${noteId}`);
    };

    // Gera o PDF das anotações selecionadas
    const handleGeneratePdf = async () => {
        if (selectedNoteIds.size === 0) {
            setMessage('Selecione ao menos uma anotação para gerar o PDF.');
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
            const notesToExport = notes.filter(note => selectedNoteIds.has(note.id));

            const contentHtml = `
                <div style="font-family: 'Inter', sans-serif; padding: 20px; color: #333;">
                    <h1 style="text-align: center; color: #1a202c; margin-bottom: 30px;">Minhas Anotações</h1>
                    ${notesToExport.map(note => {
                        const createdAtDate = note.created_at ? new Date(note.created_at) : null;
                        const updatedAtDate = note.updated_at ? new Date(note.updated_at) : null;

                        let dateDisplay = 'Data Indisponível';
                        if (updatedAtDate && createdAtDate && updatedAtDate.getTime() !== createdAtDate.getTime()) {
                            dateDisplay = `Alterado em: ${updatedAtDate.toLocaleDateString('pt-BR')}`;
                        } else if (createdAtDate) {
                            dateDisplay = `Criado em: ${createdAtDate.toLocaleDateString('pt-BR')}`;
                        }

                        return `
                            <div style="margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid #eee;">
                                <h2 style="color: #2c5282; margin-bottom: 10px;">Anotação da Questão ID: ${note.question_id || 'N/A'}</h2>
                                <p style="font-size: 0.9em; color: #718096; margin-bottom: 5px;">
                                    Matéria: ${note.materia || 'N/A'} | Assunto: ${note.assunto || 'N/A'}
                                </p>
                                <p style="font-size: 0.9em; color: #718096; margin-bottom: 15px;">
                                    ${dateDisplay}
                                </p>
                                <div style="line-height: 1.6; word-wrap: break-word;">
                                    ${note.content || 'Sem conteúdo.'}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;

            const options = {
                margin: 10,
                filename: 'minhas_anotacoes.pdf',
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
                        placeholder="Buscar anotações por ID da Questão, Matéria ou Assunto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <button
                        onClick={handleSelectAllNotes}
                        className="flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-lg shadow hover:bg-gray-300 transition"
                    >
                        {selectedNoteIds.size === filteredNotes.length && filteredNotes.length > 0 ? (
                            <CheckSquare className="mr-2 w-5 h-5" />
                        ) : (
                            <Square className="mr-2 w-5 h-5" />
                        )}
                        {selectedNoteIds.size === filteredNotes.length && filteredNotes.length > 0 ? 'Desmarcar Todas' : 'Marcar Todas'}
                    </button>
                    <button
                        onClick={handleGeneratePdf}
                        disabled={selectedNoteIds.size === 0}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download className="mr-2 w-5 h-5" /> Gerar PDF ({selectedNoteIds.size})
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-10 text-gray-600">
                    <Loader2 className="animate-spin mr-2" />
                    Carregando anotações...
                </div>
            ) : filteredNotes.length === 0 ? (
                <div className="text-center py-10 text-gray-600">
                    <p>Nenhuma anotação encontrada.</p>
                    {searchTerm && <p className="mt-2">Tente ajustar o termo de busca.</p>}
                </div>
            ) : (
                <div className="space-y-4 overflow-y-auto flex-1">
                    {filteredNotes.map((note) => {
                        const createdAtDate = note.created_at ? new Date(note.created_at) : null;
                        const updatedAtDate = note.updated_at ? new Date(note.updated_at) : null;

                        let dateDisplay = 'Data Indisponível';
                        if (updatedAtDate && createdAtDate && updatedAtDate.getTime() !== createdAtDate.getTime()) {
                            dateDisplay = `Alterado em: ${updatedAtDate.toLocaleDateString('pt-BR')}`;
                        } else if (createdAtDate) {
                            dateDisplay = `Criado em: ${createdAtDate.toLocaleDateString('pt-BR')}`;
                        }

                        return (
                            <div
                                key={note.id}
                                className="flex items-start p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedNoteIds.has(note.id)}
                                    onChange={() => handleSelectNote(note.id)}
                                    className="mt-1 mr-3 h-5 w-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                />
                                <div className="flex-grow">
                                    <h3 className="text-lg font-semibold text-gray-800">Anotação</h3>
                                    <p className="text-sm text-gray-700 mt-1">
                                        ID da Questão: <span className="font-medium">{note.question_id || 'N/A'}</span>
                                    </p>
                                    <p className="text-sm text-gray-700">
                                        Matéria: <span className="font-medium">{note.materia || 'N/A'}</span> | Assunto: <span className="font-medium">{note.assunto || 'N/A'}</span>
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {dateDisplay}
                                    </p>
                                </div>
                                <button
    onClick={() => handleViewNoteDetails(note.id)}
    className="ml-4 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition"
>
    Ver Anotação
</button>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
}
