// src/components/user/MinhasCurtidas.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react'; // Importe useRef
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

export default function MinhasCurtidas({
  token,
  onUnauthorized,
  API_URL,
  message, 
  messageType, 
  setMessage, 
  setMessageType, 
}) {
  // --- INÍCIO DA DEPURAÇÃO (Mantenha este log!) ---
  console.log("MinhasCurtidas props recebidas:", { token, onUnauthorized, API_URL, message, messageType, setMessage, setMessageType });
  // --- FIM DA DEPURAÇÃO ---

  const navigate = useNavigate();
  const [likedComments, setLikedComments] = useState([]);
  const [filteredLikes, setFilteredLikes] = useState([]);
  const [selectedLikeIds, setSelectedLikeIds] = useState(new Set());
  const [isLoadingLikedComments, setIsLoadingLikedComments] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Crie refs para as funções de setter de estado
  const setMessageRef = useRef(setMessage);
  const setMessageTypeRef = useRef(setMessageType);

  // Atualize os refs sempre que as props mudarem
  useEffect(() => {
    setMessageRef.current = setMessage;
    setMessageTypeRef.current = setMessageType;
  }, [setMessage, setMessageType]);

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

  // Função para buscar os comentários curtidos do usuário
  const fetchLikedComments = useCallback(async () => {
    setIsLoadingLikedComments(true);
    if (!token) {
        // Use os refs para chamar as funções
        setMessageRef.current('Token de autenticação ausente. Por favor, faça login novamente.');
        setMessageTypeRef.current('error'); 
        onUnauthorized();
        setIsLoadingLikedComments(false);
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/users/me/liked-comments`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401 || res.status === 403) {
            onUnauthorized();
            return;
        }
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || 'Erro ao buscar seus comentários curtidos.');
        }

        const data = await res.json();
        setLikedComments(data);
        setFilteredLikes(data); // Inicializa filteredLikes com todos os dados
        setMessageRef.current('Comentários curtidos carregados com sucesso!');
        setMessageTypeRef.current('success');

    } catch (err) {
        console.error('Erro ao buscar comentários curtidos:', err);
        setMessageRef.current(`Erro ao carregar comentários curtidos: ${err.message}`);
        setMessageTypeRef.current('error');
    } finally {
        setIsLoadingLikedComments(false);
        setTimeout(() => setMessageRef.current(''), 5000); // Limpa a mensagem após 5 segundos
    }
  }, [token, navigate, onUnauthorized, API_URL]); // setMessage e setMessageType REMOVIDOS das dependências

  // Efeito para carregar os comentários curtidos ao montar o componente
  useEffect(() => {
      fetchLikedComments();
      loadHtml2PdfScript()
          .then(() => console.log('html2pdf.js carregado com sucesso para minhas curtidas'))
          .catch((err) => console.error('Erro ao carregar html2pdf.js para minhas curtidas:', err));
  }, [fetchLikedComments]);

  // Efeito para filtrar os comentários curtidos quando o termo de busca ou os comentários mudam
  useEffect(() => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    const filtered = likedComments.filter(like =>
      like.materia?.toLowerCase().includes(lowercasedSearchTerm) ||
      like.assunto?.toLowerCase().includes(lowercasedSearchTerm) ||
      String(like.question_id).includes(lowercasedSearchTerm) ||
      like.autor?.toLowerCase().includes(lowercasedSearchTerm) || // Inclui o nome do autor na busca
      removePTags(like.content || '').toLowerCase().includes(lowercasedSearchTerm) // Adicionado busca por conteúdo
    );
    setFilteredLikes(filtered);
  }, [searchTerm, likedComments]);

  // Lida com a seleção/desseleção de um comentário individual
  const handleSelectLike = (id) => {
    setSelectedLikeIds((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  };

  // Lida com a seleção/desseleção de todos os comentários filtrados
  const handleSelectAllLikes = () => {
    if (selectedLikeIds.size === filteredLikes.length && filteredLikes.length > 0) {
      setSelectedLikeIds(new Set()); // Desmarcar todas
    } else {
      const allLikeIds = new Set(filteredLikes.map((like) => like.comment_id));
      setSelectedLikeIds(allLikeIds); // Marcar todas
    }
  };

  // Navega para os detalhes de um comentário específico (reutiliza a rota existente)
  const handleViewCommentDetails = (commentId) => {
    navigate(`/comentarios/${commentId}`);
  };

  // Gera o PDF dos comentários selecionados
  const handleGeneratePdfLikes = async () => {
    if (selectedLikeIds.size === 0) {
      setMessageRef.current('Selecione ao menos um comentário curtido para gerar o PDF.');
      setMessageTypeRef.current('error');
      return;
    }
  
    if (!window.html2pdf) {
        setMessageRef.current('A biblioteca de PDF ainda não foi carregada. Tente novamente em instantes.');
        setMessageTypeRef.current('error');
        return;
    }
  
    setMessageRef.current('Gerando PDF... Isso pode levar alguns segundos.');
    setMessageTypeRef.current('success');
  
    try {
        const likesToExport = likedComments.filter(l => selectedLikeIds.has(l.comment_id));
  
        const contentHtml = `
            <div style="font-family: 'Inter', sans-serif; padding: 20px; color: #333;">
                <h1 style="text-align: center; color: #1a202c; margin-bottom: 30px;">Meus Comentários Curtidos</h1>
                ${likesToExport.map(c => `
                    <div style="margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid #eee;">
                        <h2 style="color: #2c5282; margin-bottom: 10px;">Comentário da Questão ID: ${c.question_id || 'N/A'}</h2>
                        <p style="font-size: 0.9em; color: #718096; margin-bottom: 5px;">
                            Matéria: ${c.materia || 'N/A'} | Assunto: ${c.assunto || 'N/A'}
                        </p>
                          <p style="font-size: 0.9em; color: #718096; margin-bottom: 5px;">
                              Autor do Comentário: ${c.autor || 'Desconhecido'}
                          </p>
                        <div style="line-height: 1.6; word-wrap: break-word;">
                            ${removePTags(c.content) || 'Sem conteúdo.'}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
  
        const options = {
            margin: 10,
            filename: 'meus_comentarios_curtidos.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        };
  
        await window.html2pdf().set(options).from(contentHtml).save();
        setMessageRef.current('PDF gerado com sucesso!');
        setMessageTypeRef.current('success');
  
    } catch (err) {
        console.error('Erro ao gerar PDF de curtidas:', err);
        setMessageRef.current(`Erro ao gerar PDF: ${err.message}`);
        setMessageTypeRef.current('error');
    } finally {
        setTimeout(() => setMessageRef.current(''), 5000);
    }
  };

  return (
    <>
      {message && (
        <MessageModal message={message} type={messageType} onClose={() => setMessage('')} />
      )}

      <h2 className="text-3xl font-extrabold text-gray-900 mb-6">Meus Comentários Curtidos</h2>
      <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
        <div className="relative w-full sm:w-1/2">
          <input
            type="text"
            placeholder="Buscar por ID da Questão, Matéria, Assunto ou Autor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={handleSelectAllLikes}
            className="flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-lg shadow hover:bg-gray-300 transition"
          >
            {selectedLikeIds.size === filteredLikes.length && filteredLikes.length > 0 ? (
              <CheckSquare className="mr-2 w-5 h-5" />
            ) : (
              <Square className="mr-2 w-5 h-5" />
            )}
            {selectedLikeIds.size === filteredLikes.length && filteredLikes.length > 0 ? 'Desmarcar Todas' : 'Marcar Todas'}
          </button>
          <button
            onClick={handleGeneratePdfLikes}
            disabled={selectedLikeIds.size === 0}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="mr-2 w-5 h-5" /> Gerar PDF ({selectedLikeIds.size})
          </button>
        </div>
      </div>

      {isLoadingLikedComments ? (
        <div className="flex justify-center items-center py-10 text-gray-600">
          <Loader2 className="animate-spin mr-2" />
          Carregando comentários curtidos...
        </div>
      ) : filteredLikes.length === 0 ? (
        <div className="text-center py-10 text-gray-600">
          <p>Nenhum comentário curtido encontrado.</p>
          {searchTerm && <p className="mt-2">Tente ajustar o termo de busca.</p>}
        </div>
      ) : (
        <div className="space-y-4 overflow-y-auto flex-1">
          {filteredLikes.map((like) => {
            const createdAtDate = like.created_at ? new Date(like.created_at) : null;
            const updatedAtDate = like.updated_at ? new Date(like.updated_at) : null;

            let dateDisplay = 'Data Indisponível';
            if (updatedAtDate && createdAtDate && updatedAtDate.getTime() !== createdAtDate.getTime()) {
                dateDisplay = `Alterado em: ${updatedAtDate.toLocaleDateString('pt-BR')}`;
            } else if (createdAtDate) {
                dateDisplay = `Criado em: ${createdAtDate.toLocaleDateString('pt-BR')}`;
            }

            return (
              <div
                key={like.comment_id} 
                className="flex items-start p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md"
              >
                <input
                  type="checkbox"
                  checked={selectedLikeIds.has(like.comment_id)}
                  onChange={() => handleSelectLike(like.comment_id)}
                  className="mt-1 mr-3 h-5 w-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                />
                <div className="flex-grow">
                  {/* Título padronizado "Comentário Feito" */}
                  <h3 className="text-lg font-semibold text-gray-800">Comentário Feito</h3>
                  <p className="text-sm text-gray-700 mt-1">
                      ID da Questão: <span className="font-medium">{like.question_id || 'N/A'}</span>
                  </p>
                  <p className="text-sm text-gray-700">
                      Matéria: <span className="font-medium">{like.materia || 'N/A'}</span> | Assunto: <span className="font-medium">{like.assunto || 'N/A'}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                      Autor: <span className="text-indigo-600 font-semibold">{like.autor || 'Desconhecido'}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                      {dateDisplay}
                  </p>
                </div>
                <button
                  onClick={() => handleViewCommentDetails(like.comment_id)}
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

















