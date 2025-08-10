import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/Tabs';
import { LogOut, Users, BookOpen, FileText, UploadCloud, Edit, Trash2, Loader2, XCircle, CheckCircle } from 'lucide-react'; // Adicionado CheckCircle
import QuestionForm from './QuestionForm';
import RichTextEditor from '../RichTextEditor'; // Certifique-se de que o caminho está correto
import MessageModal from '../ui/MessageModal'; // Certifique-se de que o caminho está correto
import ActionModal from '../ui/ActionModal'; // Importa o ActionModal para confirmação de exclusão
import { motion } from 'framer-motion';
import TheoryForm from './TheoryForm'; // Importação do TheoryForm - Certifique-se de que este arquivo existe

// Importa as matérias do arquivo local
import { allMaterias } from '../../data/materias/materias';

// Funções de mapeamento para converter entre frontend (camelCase) e backend (snake_case)
const mapBackendToFrontend = (backendData) => {
    // Garante que os campos de texto sejam strings, mesmo que venham como null
    const safeString = (value) => value === null || value === undefined ? '' : value;

    // Converte gabarito para índice numérico para 'multipla' e 'certo_errado'
    const getCorrectIndex = (gabarito, tipo, alternativasArray) => {
        if (tipo === 'multipla' && gabarito) {
            const letras = ['A', 'B', 'C', 'D', 'E'];
            return letras.indexOf(gabarito.toUpperCase());
        }
        if (tipo === 'certo_errado' && gabarito) {
            return gabarito.toLowerCase() === 'certo' ? 1 : 0; // 1 para Certo, 0 para Errado
        }
        return null;
    };

    const frontendData = {
        id: backendData.id,
        enunciado: safeString(backendData.enunciado),
        // Mapeia item_a a item_e diretamente do backendData
        itemA: safeString(backendData.item_a),
        itemB: safeString(backendData.item_b),
        itemC: safeString(backendData.item_c),
        itemD: safeString(backendData.item_d),
        itemE: safeString(backendData.item_e),
        materia: safeString(backendData.materia),
        assunto: safeString(backendData.assunto),
        banca: safeString(backendData.banca),
        orgao: safeString(backendData.orgao),
        cargo: safeString(backendData.cargo),
        ano: backendData.ano || '', // Ano pode ser número ou string vazia
        escolaridade: safeString(backendData.escolaridade),
        dificuldade: safeString(backendData.dificuldade),
        regiao: safeString(backendData.regiao),
        gabarito: safeString(backendData.gabarito), // Usa 'gabarito' do backend
        informacoes: safeString(backendData.informacoes),
        // Adapta para ambos os nomes de campo do comentário do professor
        comentarioProfessor: safeString(backendData.comentarioProfessor || backendData.comentario_professor), 
        tipo: safeString(backendData.tipo),
        isAnulada: backendData.is_anulada || false, // NOVO CAMPO
        isDesatualizada: backendData.is_desatualizada || false, // NOVO CAMPO
    };

    // Este bloco era o problema. Ele criava um array 'alternativas' e depois
    // sobrescrevia itemA-E com valores de 'alternativasArray'.
    // Como o backend já fornece item_a a item_e diretamente, este bloco é desnecessário para
    // popular os campos do formulário de edição e estava causando a perda de dados.
    // No entanto, se 'alternativas' for necessário para outras partes do frontend (ex: NotebookResolver),
    // ele deve ser gerado A PARTIR de itemA-E, e NÃO sobrescrevê-los.
    if (frontendData.tipo === 'multipla') {
        frontendData.alternativas = [
            frontendData.itemA,
            frontendData.itemB,
            frontendData.itemC,
            frontendData.itemD,
            frontendData.itemE
        ];
    } else if (frontendData.tipo === 'certo_errado') {
        frontendData.alternativas = ['Certo', 'Errado']; // Para consistência em outros lugares
    } else {
        frontendData.alternativas = [];
    }

    // Define o índice correto com base no gabarito e tipo
    frontendData.correta = getCorrectIndex(frontendData.gabarito, frontendData.tipo, frontendData.alternativas);

    return frontendData;
};

const mapFrontendToBackend = (frontendData) => {
    // Garante que os campos de texto sejam strings, mesmo que vazias, para o backend
    const safeString = (value) => value === null || value === undefined ? '' : value;

    return {
        enunciado: safeString(frontendData.enunciado),
        item_a: safeString(frontendData.itemA),
        item_b: safeString(frontendData.itemB),
        item_c: safeString(frontendData.itemC),
        item_d: safeString(frontendData.itemD),
        item_e: safeString(frontendData.itemE),
        materia: safeString(frontendData.materia),
        assunto: safeString(frontendData.assunto),
        banca: safeString(frontendData.banca),
        orgao: safeString(frontendData.orgao),
        cargo: safeString(frontendData.cargo),
        ano: frontendData.ano ? parseInt(frontendData.ano, 10) : null, // Converte para int ou null
        escolaridade: safeString(frontendData.escolaridade),
        dificuldade: safeString(frontendData.dificuldade),
        regiao: safeString(frontendData.regiao),
        gabarito: safeString(frontendData.gabarito),
        informacoes: safeString(frontendData.informacoes),
        comentarioProfessor: safeString(frontendData.comentarioProfessor), // Mapeia corretamente
        tipo: safeString(frontendData.tipo),
        is_anulada: frontendData.isAnulada, // NOVO CAMPO
        is_desatualizada: frontendData.isDesatualizada, // NOVO CAMPO
    };
};


export default function AdminDashboard({ token, onLogout }) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('gerenciar-questoes');
    const [statusMessage, setStatusMessage] = useState('');
    const [statusType, setStatusType] = useState('');

    // Estados para Gerenciamento de Usuários Pendentes
    const [pendingUsers, setPendingUsers] = useState([]);

    // Estados para Gerenciamento de Questões
    const [questions, setQuestions] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const QUESTIONS_PER_PAGE = 50;
    const filteredQuestions = questions.filter((q) => {
        const search = searchTerm.toLowerCase();
        return (
            q.id.toString().includes(search) ||
            (q.enunciado && q.enunciado.toLowerCase().includes(search))
        );
    });

    const totalPages = Math.ceil(filteredQuestions.length / QUESTIONS_PER_PAGE);

    const paginatedQuestions = filteredQuestions.slice(
        (currentPage - 1) * QUESTIONS_PER_PAGE,
        currentPage * QUESTIONS_PER_PAGE
    );
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [isQuestionLoading, setIsQuestionLoading] = useState(false);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [questionToDelete, setQuestionToDelete] = useState(null);

    // Estados para Gerenciamento de Teoria
    const [materiasDisponiveis, setMateriasDisponiveis] = useState([]); 
    const [theories, setTheories] = useState([]); // Novo estado para armazenar as teorias existentes
    const [editingTheory, setEditingTheory] = useState(null); // Novo estado para a teoria em edição
    const [isTheoryLoading, setIsTheoryLoading] = useState(false);
    const [theoryStatusMessage, setTheoryStatusMessage] = useState('');
    const [theoryStatusType, setTheoryStatusType] = useState('');

    // Modal de confirmação de exclusão de teoria
    const [showDeleteTheoryConfirmModal, setShowDeleteTheoryConfirmModal] = useState(false);
    const [theoryToDelete, setTheoryToDelete] = useState(null); // Armazena { materia, assunto } da teoria a ser deletada

    // Estados para Upload de PDF
    const [file, setFile] = useState(null);
    const [isPdfUploadLoading, setIsPdfUploadLoading] = useState(false);
    const [pdfUploadMessage, setPdfUploadMessage] = useState('');
    const [pdfUploadMessageType, setPdfUploadMessageType] = useState('');

    // Estados para Gerenciar Status de Questões
    const [questionIdStatus, setQuestionIdStatus] = useState('');
    const [isAnulada, setIsAnulada] = useState(false);
    const [isDesatualizada, setIsDesatualizada] = useState(false);
    const [isStatusLoading, setIsStatusLoading] = useState(false);
    const [statusQuestionMessage, setStatusQuestionMessage] = useState('');
    const [statusQuestionMessageType, setStatusQuestionMessageType] = useState('');

    const API_URL = import.meta.env.VITE_API_URL;

    // === FUNÇÕES DE LÓGICA E BUSCA DE DADOS ===

    // Funções para Usuários Pendentes
    const fetchPendingUsers = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/api/users/pending`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            console.log('Response status for /api/users/pending:', response.status);
            if (response.status === 401) {
                console.log('Token expirado ou inválido para /api/users/pending, redirecionando para login.');
                return onLogout(navigate('/login'));
            }
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao buscar usuários pendentes');
            }
            const data = await response.json();
            console.log('Data received for /api/users/pending:', data);
            if (Array.isArray(data)) setPendingUsers(data);
        } catch (error) {
            console.error('Erro ao buscar usuários pendentes:', error);
            setStatusMessage('Erro ao carregar usuários pendentes.');
            setStatusType('error');
            setTimeout(() => setStatusMessage(''), 3000);
        }
    }, [API_URL, token, onLogout, navigate]);

    const handleUserAction = async (userId, action) => {
        try {
            const response = await fetch(`${API_URL}/api/users/${userId}/${action}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error(`Falha ao ${action} usuário`);
            await fetchPendingUsers();
            setStatusMessage(`Usuário ${action === 'approve' ? 'aprovado' : 'rejeitado'} com sucesso!`);
            setStatusType('success');
        } catch (error) {
            console.error('Erro:', error);
            setStatusMessage(`Erro ao ${action} usuário.`);
            setStatusType('error');
        } finally {
            setTimeout(() => setStatusMessage(''), 3000);
        }
    };

    // Funções para Gerenciamento de Questões
    const fetchQuestions = useCallback(async () => {
        setIsQuestionLoading(true);
        try {
            console.log('Iniciando fetchQuestions...');
            const res = await fetch(`${API_URL}/api/questions/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Response status for /api/questions:', res.status);
            if (res.status === 401) {
                console.log('Token expirado ou inválido para /api/questions, redirecionando para login.');
                return onLogout(navigate('/login'));
            }
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Falha ao buscar questões');
            }
            const data = await res.json();
            console.log('Data received for /api/questions:', data);
            if (Array.isArray(data)) setQuestions(data.map(mapBackendToFrontend)); // Mapeia aqui
            else {
                console.error('Dados de questões não são um array:', data);
                setQuestions([]);
            }
        } catch (err) {
            console.error('Erro geral na função fetchQuestions:', err);
            setStatusMessage('Erro ao carregar questões: ' + err.message);
            setStatusType('error');
            setTimeout(() => setStatusMessage(''), 3000);
        } finally {
            setIsQuestionLoading(false);
        }
    }, [API_URL, token, onLogout, navigate]);

    const handleQuestionFormSubmit = async (questionPayload) => {
        setIsQuestionLoading(true);
        setStatusMessage('');
        setStatusType('');

        try {
            let response;
            // Mapeia os dados do frontend para o formato do backend antes de enviar
            const backendPayload = mapFrontendToBackend(questionPayload);

            if (questionPayload && questionPayload.id) { // Se estiver editando (verificado pelo ID)
                response = await fetch(`${API_URL}/api/questions/${questionPayload.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify(backendPayload),
                });
            } else { // Se estiver adicionando
                response = await fetch(`${API_URL}/api/questions/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify(backendPayload),
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Falha ao salvar a questão.');
            }

            setStatusMessage(`Questão ${questionPayload.id ? 'atualizada' : 'adicionada'} com sucesso!`);
            setStatusType('success');
            setEditingQuestion(null); // Limpa o formulário
            fetchQuestions(); // Recarrega a lista de questões
            // Não muda a aba, pois o formulário estará na mesma aba
        }
        catch (error) {
            console.error('Erro ao salvar questão:', error);
            setStatusMessage('Erro ao salvar questão: ' + error.message);
            setStatusType('error');
        } finally {
            setIsQuestionLoading(false);
            setTimeout(() => setStatusMessage(''), 3000);
        }
    };

    const handleEditQuestion = useCallback((question) => {
        console.log('handleEditQuestion chamado com (já em formato frontend):', question); // DEBUG LOG
        setEditingQuestion(question); // CORREÇÃO: Não chama mapBackendToFrontend aqui novamente
        console.log('editingQuestion setado para (diretamente):', question); // DEBUG LOG
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const handleDeleteQuestionClick = (questionId) => {
        setQuestionToDelete(questionId);
        setShowDeleteConfirmModal(true);
    };

    const confirmDeleteQuestion = async () => {
        setIsQuestionLoading(true);
        setStatusMessage('');
        setStatusType('');
        setShowDeleteConfirmModal(false);

        try {
            const response = await fetch(`${API_URL}/api/questions/${questionToDelete}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Falha ao deletar a questão.');
            }

            setStatusMessage('Questão deletada com sucesso!');
            setStatusType('success');
            fetchQuestions(); // Recarrega a lista
        } catch (error) {
            console.error('Erro ao deletar questão:', error);
            setStatusMessage('Erro ao deletar questão: ' + error.message);
            setStatusType('error');
        } finally {
            setIsQuestionLoading(false);
            setQuestionToDelete(null);
            setTimeout(() => setStatusMessage(''), 3000);
        }
    };

    const handleCancelEditQuestion = () => {
        setEditingQuestion(null);
        // Não muda a aba
    };

    // Funções para Gerenciamento de Teoria
    // Popula materiasDisponiveis com dados locais (apenas nomes das matérias)
    useEffect(() => {
        setMateriasDisponiveis(allMaterias); // allMaterias já é um array de strings
    }, []);

    // Função para buscar TODAS as teorias existentes (matéria e assunto)
    const fetchTheories = useCallback(async () => {
        setIsTheoryLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/theories/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                throw new Error('Falha ao buscar teorias existentes.');
            }
            const data = await response.json();
            // Flatten the data to a list of {materia, assunto} objects for the table
            const flattenedTheories = [];
            data.forEach(materiaData => {
                materiaData.assuntos.forEach(assunto => {
                    flattenedTheories.push({ materia: materiaData.materia, assunto: assunto });
                });
            });
            setTheories(flattenedTheories);
        } catch (error) {
            console.error('Erro ao buscar teorias:', error);
            setTheoryStatusMessage('Erro ao carregar teorias: ' + error.message);
            setTheoryStatusType('error');
        } finally {
            setIsTheoryLoading(false);
        }
    }, [API_URL, token]);

    // Função para buscar metadados de teoria (matérias e assuntos disponíveis)
    const fetchMateriasEAssuntos = useCallback(async () => { // ENVOLVIDO EM useCallback
        try {
            const response = await fetch(`${API_URL}/api/theory/meta`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            console.log('Response status for /api/theory/meta:', response.status);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao buscar metadados de teoria');
            }
            const data = await response.json();
            console.log('Data received for /api/theory/meta:', data);
            setMateriasDisponiveis(data);
        } catch (error) {
            console.error('Erro ao buscar matérias e assuntos para teoria:', error);
            setMateriasDisponiveis([]);
        }
    }, [API_URL, token]); // Dependências adicionadas

    // Função para lidar com o payload do TheoryForm (criação/atualização)
    const handleSaveTheoryForm = async (payload) => {
        setIsTheoryLoading(true);
        setTheoryStatusMessage('');
        setTheoryStatusType('');

        try {
            const response = await fetch(`${API_URL}/api/theories/`, {
                method: 'POST', // O backend já lida com PUT/POST no mesmo endpoint para criar/atualizar
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Falha ao salvar a teoria.');
            }

            setTheoryStatusMessage('Teoria salva com sucesso!');
            setTheoryStatusType('success');
            setEditingTheory(null); // Limpa o formulário de edição após salvar
            fetchTheories(); // Recarrega a lista de teorias
        } catch (error) {
            console.error('Erro ao salvar teoria:', error);
            setTheoryStatusMessage('Erro ao salvar teoria: ' + error.message);
            setTheoryStatusType('error'); 
        } finally {
            setIsTheoryLoading(false);
            setTimeout(() => setTheoryStatusMessage(''), 3000);
        }
    };

    // Função para iniciar a edição de uma teoria
    const handleEditTheory = useCallback(async (materia, assunto) => {
        setIsTheoryLoading(true);
        setTheoryStatusMessage('');
        setTheoryStatusType('');
        try {
            // Busca o conteúdo completo da teoria para edição
            const response = await fetch(`${API_URL}/api/theories/${encodeURIComponent(materia)}/${encodeURIComponent(assunto)}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Falha ao carregar teoria para edição.');
            }
            const data = await response.json();
            setEditingTheory(data); // Define a teoria para edição
            setTheoryStatusMessage(`Editando teoria: ${materia} - ${assunto}`);
            setTheoryStatusType('info');
        } catch (error) {
            console.error('Erro ao carregar teoria para edição:', error);
            setTheoryStatusMessage('Erro ao carregar teoria para edição: ' + error.message);
            setTheoryStatusType('error');
        } finally {
            setIsTheoryLoading(false);
            setTimeout(() => setTheoryStatusMessage(''), 3000);
        }
    }, [API_URL, token]);

    // Função para cancelar a edição da teoria
    const handleCancelEditTheory = () => {
        setEditingTheory(null);
        setTheoryStatusMessage('');
        setTheoryStatusType('');
    };

    // Função para lidar com o clique no botão de deletar teoria (abre modal)
    const handleDeleteTheoryClick = (materia, assunto) => {
        setTheoryToDelete({ materia, assunto });
        setShowDeleteTheoryConfirmModal(true);
    };

    // Função para confirmar a exclusão da teoria
    const confirmDeleteTheory = async () => {
        if (!theoryToDelete) return;

        setIsTheoryLoading(true);
        setTheoryStatusMessage('');
        setTheoryStatusType('');
        setShowDeleteTheoryConfirmModal(false);

        try {
            const response = await fetch(`${API_URL}/api/theories/${encodeURIComponent(theoryToDelete.materia)}/${encodeURIComponent(theoryToDelete.assunto)}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Falha ao deletar a teoria.');
            }

            setTheoryStatusMessage('Teoria deletada com sucesso!');
            setTheoryStatusType('success');
            fetchTheories(); // Recarrega a lista de teorias
        } catch (error) {
            console.error('Erro ao deletar teoria:', error);
            setTheoryStatusMessage('Erro ao deletar teoria: ' + error.message);
            setTheoryStatusType('error');
        } finally {
            setIsTheoryLoading(false);
            setTheoryToDelete(null);
            setTimeout(() => setTheoryStatusMessage(''), 3000);
        }
    };


    // Funções para Upload de PDF
    const handlePdfFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handlePdfUpload = async (e) => {
        e.preventDefault();
        if (!file) {
            setPdfUploadMessage('Por favor, selecione um arquivo PDF.');
            setPdfUploadMessageType('error');
            return;
        }

        setIsPdfUploadLoading(true);
        setPdfUploadMessage('');
        setPdfUploadMessageType('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_URL}/api/upload-pdf/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Falha ao processar o PDF.');
            }

            setPdfUploadMessage('PDF enviado e processado com sucesso! Questões adicionadas.');
            setPdfUploadMessageType('success');
            setFile(null); // Limpa o arquivo selecionado
            fetchQuestions(); // Recarrega a lista de questões
        } catch (error) {
            console.error('Erro no upload de PDF:', error);
            setPdfUploadMessage('Erro no upload de PDF: ' + error.message);
            setPdfUploadMessageType('error');
        } finally {
            setIsPdfUploadLoading(false);
            setTimeout(() => setPdfUploadMessage(''), 3000);
        }
    };

    // Funções para Gerenciar Status de Questões
    const fetchQuestionStatus = useCallback(async (id) => {
        if (!id) return;
        setIsStatusLoading(true);
        setStatusQuestionMessage('');
        setStatusQuestionMessageType('');
        try {
            const response = await fetch(`${API_URL}/api/questions/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.status === 401) {
                onLogout(navigate('/login'));
                return;
            }
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Questão não encontrada.');
            }
            const data = await response.json();
            setIsAnulada(data.is_anulada || false);
            setIsDesatualizada(data.is_desatualizada || false);
            setStatusQuestionMessage(`Status atual da questão ${id} carregado.`);
            setStatusQuestionMessageType('success');
        } catch (error) {
            console.error('Erro ao buscar status da questão:', error);
            setStatusQuestionMessage('Erro ao buscar status da questão: ' + error.message);
            setStatusQuestionMessageType('error');
            setIsAnulada(false);
            setIsDesatualizada(false);
        } finally {
            setIsStatusLoading(false);
            setTimeout(() => setStatusQuestionMessage(''), 3000);
        }
    }, [API_URL, token, onLogout, navigate]);

    const handleUpdateQuestionStatus = async () => {
        if (!questionIdStatus) {
            setStatusQuestionMessage('Por favor, insira um ID de questão.');
            setStatusQuestionMessageType('error');
            return;
        }
        setIsStatusLoading(true);
        setStatusQuestionMessage('');
        setStatusQuestionMessageType('');

        try {
            const response = await fetch(`${API_URL}/api/questions/${questionIdStatus}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ is_anulada: isAnulada, is_desatualizada: isDesatualizada }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Falha ao atualizar o status da questão.');
            }

            setStatusQuestionMessage('Status da questão atualizado com sucesso!');
            setStatusQuestionMessageType('success');
        } catch (error) {
            console.error('Erro ao atualizar status da questão:', error);
            setStatusQuestionMessage('Erro ao atualizar status da questão: ' + error.message);
            setStatusQuestionMessageType('error');
        } finally {
            setIsStatusLoading(false);
            setTimeout(() => setStatusQuestionMessage(''), 3000);
        }
    };


    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        console.log('useEffect disparado. activeTab atual:', activeTab);
        if (activeTab === 'pendingUsers') {
            fetchPendingUsers();
        } else if (activeTab === 'gerenciar-questoes') {
            console.log('Ativada aba "Gerenciar Questões", chamando fetchQuestions().');
            fetchQuestions(); // Busca questões ao ativar a aba
        } else if (activeTab === 'gerenciar-teoria') {
            fetchMateriasEAssuntos(); // Busca metadados de teoria ao ativar a aba
            fetchTheories(); // Busca as teorias ao ativar a aba
        }
    }, [token, navigate, activeTab, fetchPendingUsers, fetchQuestions, fetchMateriasEAssuntos, fetchTheories]);

    // Efeito para buscar o status da questão quando o ID muda na aba "Gerenciar Status"
    useEffect(() => {
        if (activeTab === 'gerenciar-status' && questionIdStatus) {
            fetchQuestionStatus(questionIdStatus);
        }
    }, [activeTab, questionIdStatus, fetchQuestionStatus]);


    // === RENDERIZAÇÃO DO COMPONENTE ===
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 font-inter">
            <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-xl mb-8 border border-gray-100">
                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Painel do Administrador</h1>
                <button
                    onClick={onLogout}
                    className="flex items-center px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl shadow-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 ease-in-out transform hover:scale-105"
                >
                    <LogOut className="mr-2" size={20} /> Sair
                </button>
            </header>

            {statusMessage && (
                <MessageModal
                    message={statusMessage}
                    type={statusType}
                    onClose={() => setStatusMessage('')}
                />
            )}
            {theoryStatusMessage && (
                <MessageModal
                    message={theoryStatusMessage}
                    type={theoryStatusType}
                    onClose={() => setTheoryStatusMessage('')}
                />
            )}
            {pdfUploadMessage && (
                <MessageModal
                    message={pdfUploadMessage}
                    type={pdfUploadMessageType}
                    onClose={() => setPdfUploadMessage('')}
                />
            )}
            {statusQuestionMessage && (
                <MessageModal
                    message={statusQuestionMessage}
                    type={statusQuestionMessageType}
                    onClose={() => setStatusQuestionMessage('')}
                />
            )}


            {/* Modal de Confirmação de Exclusão de Questão */}
            {showDeleteConfirmModal && (
                <ActionModal
                    isOpen={showDeleteConfirmModal}
                    onClose={() => setShowDeleteConfirmModal(false)}
                    title="Confirmar Exclusão de Questão"
                    message="Tem certeza que deseja deletar esta questão? Esta ação não pode ser desfeita."
                    onConfirm={confirmDeleteQuestion}
                    confirmText={isQuestionLoading ? <span className="flex items-center"><Loader2 className="animate-spin h-5 w-5 mr-2" /> Deletando...</span> : 'Deletar'}
                    isConfirming={isQuestionLoading}
                    type="danger"
                />
            )}

            {/* Modal de Confirmação de Exclusão de Teoria */}
            {showDeleteTheoryConfirmModal && (
                <ActionModal
                    isOpen={showDeleteTheoryConfirmModal}
                    onClose={() => setShowDeleteTheoryConfirmModal(false)}
                    title="Confirmar Exclusão de Teoria"
                    message={`Tem certeza que deseja deletar a teoria de "${theoryToDelete?.materia}" - "${theoryToDelete?.assunto}"? Esta ação não pode ser desfeita.`}
                    onConfirm={confirmDeleteTheory}
                    confirmText={isTheoryLoading ? <span className="flex items-center"><Loader2 className="animate-spin h-5 w-5 mr-2" /> Deletando...</span> : 'Deletar'}
                    isConfirming={isTheoryLoading}
                    type="danger"
                />
            )}

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-100"
            >
                <Tabs defaultValue="gerenciar-questoes" value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-5 bg-gray-100 rounded-xl p-2 mb-8 shadow-inner"> {/* Alterado para grid-cols-5 */}
                        <TabsTrigger value="pendingUsers" className="flex items-center justify-center py-3 px-4 text-lg font-semibold rounded-lg hover:bg-white hover:shadow-md transition-all duration-300">
                            <Users className="mr-2" size={20} /> Usuários Pendentes
                        </TabsTrigger>
                        <TabsTrigger value="gerenciar-questoes" className="flex items-center justify-center py-3 px-4 text-lg font-semibold rounded-lg hover:bg-white hover:shadow-md transition-all duration-300">
                            <FileText className="mr-2" size={20} /> Gerenciar Questões
                        </TabsTrigger>
                        <TabsTrigger value="upload-pdf" className="flex items-center justify-center py-3 px-4 text-lg font-semibold rounded-lg hover:bg-white hover:shadow-md transition-all duration-300">
                            <UploadCloud className="mr-2" size={20} /> Upload de PDF
                        </TabsTrigger>
                        <TabsTrigger value="gerenciar-teoria" className="flex items-center justify-center py-3 px-4 text-lg font-semibold rounded-lg hover:bg-white hover:hover:shadow-md transition-all duration-300">
                            <BookOpen className="mr-2" size={20} /> Gerenciar Teoria
                        </TabsTrigger>
                        <TabsTrigger value="gerenciar-status" className="flex items-center justify-center py-3 px-4 text-lg font-semibold rounded-lg hover:bg-white hover:shadow-md transition-all duration-300">
                            <CheckCircle className="mr-2" size={20} /> Status Questões {/* Novo Trigger */}
                        </TabsTrigger>
                    </TabsList>

                    {statusMessage && (
                        <div className={`p-3 mb-4 rounded-lg text-center ${statusType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {statusMessage}
                        </div>
                    )}

                    {/* Conteúdo da Aba: Usuários Pendentes */}
                    <TabsContent value="pendingUsers">
                        <div className="bg-white p-6 rounded-b-lg shadow-md">
                            <h2 className="text-2xl font-bold mb-6 text-gray-800">Usuários Pendentes para Aprovação</h2>
                            {pendingUsers.length === 0 ? (
                                <p className="text-gray-500 italic">Nenhum usuário pendente no momento.</p>
                            ) : (
                                <ul className="space-y-4">
                                    {pendingUsers.map((user) => (
                                        <li key={user.id} className="flex justify-between items-center border border-gray-200 p-3 rounded hover:bg-gray-50">
                                            <div>
                                                <p className="text-lg font-semibold text-gray-900">{user.name}</p>
                                                <p className="text-gray-600 text-sm">{user.email}</p>
                                            </div>
                                            <div className="space-x-2">
                                                <button
                                                    onClick={() => handleUserAction(user.id, 'approve')}
                                                    className="flex items-center px-4 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition-all duration-300 text-xs"
                                                >
                                                    Aprovar
                                                </button>
                                                <button
                                                    onClick={() => handleUserAction(user.id, 'reject')}
                                                    className="flex items-center px-4 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 transition-all duration-300 text-xs"
                                                >
                                                    Rejeitar
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </TabsContent>

                    {/* Conteúdo da Aba: Gerenciar Questões (agora com o formulário integrado) */}
                    <TabsContent value="gerenciar-questoes">
                        {/* Formulário de Criação/Edição de Questão - MOVIDO PARA CIMA */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            className="p-8 mb-8 rounded-2xl shadow-xl bg-gradient-to-br from-blue-50 to-white border border-blue-100"
                        >
                            <h3 className="text-2xl font-semibold text-blue-800 mb-4">{editingQuestion ? 'Editar Questão' : 'Criar Nova Questão'}</h3>
                            <QuestionForm
                                question={editingQuestion}
                                token={token}
                                onSuccess={handleQuestionFormSubmit}
                                isLoading={isQuestionLoading}
                                onCancel={handleCancelEditQuestion}
                            />
                        </motion.div>

                        <h2 className="text-3xl font-bold text-gray-800 mb-4">Questões Existentes</h2>

                        {/* Campo de busca */}
                        <div className="mb-4">
                            <input
                                type="text"
                                placeholder="Buscar por ID ou enunciado"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg shadow-sm"
                            />
                        </div>

                        {/* Tabela de questões */}
                        <div className="overflow-x-auto bg-white rounded-xl shadow-lg border border-gray-100">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="py-3 px-4 text-left text-sm font-bold text-gray-600 uppercase tracking-wider">ID</th>
                                        <th className="py-3 px-4 text-left text-sm font-bold text-gray-600 uppercase tracking-wider">Matéria</th>
                                        <th className="py-3 px-4 text-left text-sm font-bold text-gray-600 uppercase tracking-wider">Assunto</th>
                                        <th className="py-3 px-4 text-left text-sm font-bold text-gray-600 uppercase tracking-wider">Banca</th>
                                        <th className="py-3 px-4 text-left text-sm font-bold text-gray-600 uppercase tracking-wider">Tipo</th>
                                        <th className="py-3 px-4 text-left text-sm font-bold text-gray-600 uppercase tracking-wider">Anulada</th> {/* NOVO */}
                                        <th className="py-3 px-4 text-left text-sm font-bold text-gray-600 uppercase tracking-wider">Desatualizada</th> {/* NOVO */}
                                        <th className="py-3 px-4 text-left text-sm font-bold text-gray-600 uppercase tracking-wider">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {paginatedQuestions.map((question) => (
                                        <tr key={question.id} className="hover:bg-gray-50 transition-colors duration-200">
                                            <td className="py-3 px-4 text-sm text-gray-800">{question.id}</td>
                                            <td className="py-3 px-4 text-sm text-gray-800">{question.materia}</td>
                                            <td className="py-3 px-4 text-sm text-gray-800">{question.assunto}</td>
                                            <td className="py-3 px-4 text-sm text-gray-800">{question.banca}</td>
                                            <td className="py-3 px-4 text-sm text-gray-800">{question.tipo === 'multipla' ? 'Múltipla Escolha' : 'Certo ou Errado'}</td>
                                            <td className="py-3 px-4 text-sm text-gray-800">{question.isAnulada ? 'Sim' : 'Não'}</td> {/* NOVO */}
                                            <td className="py-3 px-4 text-sm text-gray-800">{question.isDesatualizada ? 'Sim' : 'Não'}</td> {/* NOVO */}
                                            <td className="py-3 px-4 text-sm text-gray-800">
                                                <div className="flex space-x-3">
                                                    <button
                                                        onClick={() => handleEditQuestion(question)}
                                                        className="text-blue-600 hover:text-blue-800 transition"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteQuestionClick(question.id)}
                                                        className="text-red-600 hover:text-red-800 transition"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Paginação */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center mt-4 space-x-2">
                                {Array.from({ length: totalPages }, (_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`px-3 py-1 rounded-lg border ${
                                            currentPage === i + 1
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-white text-gray-800'
                                        } hover:bg-blue-500 hover:text-white`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Conteúdo da Aba: Upload de PDF */}
                    <TabsContent value="upload-pdf">
                        <h2 className="text-3xl font-bold text-gray-800 mb-6">Upload de PDF para IA</h2>
                        <form onSubmit={handlePdfUpload} className="space-y-6 p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
                            <div className="mb-4">
                                <label className="block text-gray-700 text-lg font-semibold mb-3">
                                    Selecione o arquivo PDF:
                                </label>
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={handlePdfFileChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4
                                    file:rounded-full file:border-0 file:text-sm file:font-semibold
                                    file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            </div>
                            {file && (
                                <p className="text-md text-gray-700 flex items-center bg-blue-50 p-3 rounded-lg shadow-inner">
                                    <FileText className="mr-3 text-blue-600" size={20} /> Arquivo selecionado: <span className="font-medium ml-1">{file.name}</span>
                                </p>
                            )}
                            <button
                                type="submit"
                                className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500"
                                disabled={isPdfUploadLoading || !file}
                            >
                                {isPdfUploadLoading ? (
                                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                                ) : (
                                    <>
                                        <UploadCloud className="mr-2" size={20} /> Processar PDF
                                    </>
                                )}
                            </button>
                        </form>
                    </TabsContent>

                    {/* Conteúdo da Aba: Gerenciar Teoria */}
                    <TabsContent value="gerenciar-teoria">
                        <h2 className="text-3xl font-bold text-gray-800 mb-6">Adicionar/Editar Teoria</h2>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                            className="p-8 mb-8 rounded-2xl shadow-xl bg-gradient-to-br from-blue-50 to-white border border-blue-100"
                        >
                            <TheoryForm
                                token={token}
                                onSuccess={handleSaveTheoryForm}
                                isLoading={isTheoryLoading}
                                materiasDisponiveis={allMaterias} 
                                theory={editingTheory} // Passa a teoria para edição
                                onCancel={handleCancelEditTheory} // Passa a função de cancelamento
                            />
                        </motion.div>

                        <h2 className="text-3xl font-bold text-gray-800 mb-6">Teorias Existentes</h2>
                        {isTheoryLoading && <p className="text-center text-gray-600 text-lg py-8 bg-gray-50 rounded-xl shadow-inner">Carregando teorias...</p>}
                        {!isTheoryLoading && theories.length === 0 && <p className="text-center text-gray-600 text-lg py-8 bg-gray-50 rounded-xl shadow-inner">Nenhuma teoria encontrada.</p>}
                        {!isTheoryLoading && theories.length > 0 && (
                            <div className="overflow-x-auto bg-white rounded-xl shadow-lg border border-gray-100">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="py-4 px-6 text-left text-sm font-bold text-gray-600 uppercase tracking-wider">Matéria</th>
                                            <th className="py-4 px-6 text-left text-sm font-bold text-gray-600 uppercase tracking-wider">Assunto</th>
                                            <th className="py-4 px-6 text-left text-sm font-bold text-gray-600 uppercase tracking-wider">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {theories.map((t, index) => (
                                            <tr key={`${t.materia}-${t.assunto}-${index}`} className="hover:bg-gray-50 transition-colors duration-200">
                                                <td className="py-4 px-6 text-sm text-gray-800">{t.materia}</td>
                                                <td className="py-4 px-6 text-sm text-gray-800">{t.assunto}</td>
                                                <td className="py-4 px-6 text-sm">
                                                    <div className="flex space-x-3">
                                                        <button
                                                            onClick={() => handleEditTheory(t.materia, t.assunto)}
                                                            className="text-blue-600 hover:text-blue-800 transition-all duration-300 transform hover:scale-110"
                                                            title="Editar Teoria"
                                                        >
                                                            <Edit size={22} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteTheoryClick(t.materia, t.assunto)}
                                                            className="text-red-600 hover:text-red-800 transition-all duration-300 transform hover:scale-110"
                                                            title="Deletar Teoria"
                                                        >
                                                            <Trash2 size={22} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </TabsContent>

                    {/* Conteúdo da Aba: Gerenciar Status de Questões */}
                    <TabsContent value="gerenciar-status">
                        <h2 className="text-3xl font-bold text-gray-800 mb-6">Gerenciar Status de Questões</h2>
                        <div className="p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
                            <p className="text-gray-700 mb-4">Atualize o status de anulação ou desatualização de uma questão pelo seu ID.</p>
                            
                            <div className="mb-4">
                                <label htmlFor="questionIdStatus" className="block text-gray-700 font-semibold mb-1">ID da Questão:</label>
                                <input
                                    id="questionIdStatus"
                                    type="number"
                                    value={questionIdStatus}
                                    onChange={(e) => setQuestionIdStatus(e.target.value)}
                                    onBlur={() => fetchQuestionStatus(questionIdStatus)} // Busca o status ao sair do campo
                                    placeholder="Ex: 12345"
                                    className="w-full max-w-sm border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition"
                                />
                            </div>

                            <div className="flex items-center space-x-6 mb-6">
                                <label className="flex items-center text-lg text-gray-800 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isAnulada}
                                        onChange={(e) => setIsAnulada(e.target.checked)}
                                        className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <span className="ml-2">Anulada</span>
                                </label>
                                <label className="flex items-center text-lg text-gray-800 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isDesatualizada}
                                        onChange={(e) => setIsDesatualizada(e.target.checked)}
                                        className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <span className="ml-2">Desatualizada</span>
                                </label>
                            </div>

                            <button
                                onClick={handleUpdateQuestionStatus}
                                className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:from-green-600 hover:to-teal-700 transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500"
                                disabled={isStatusLoading || !questionIdStatus}
                            >
                                {isStatusLoading ? (
                                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                                ) : (
                                    <>
                                        <CheckCircle className="mr-2" size={20} /> Atualizar Status
                                    </>
                                )}
                            </button>
                        </div>
                    </TabsContent>
                </Tabs>
            </motion.div>
        </div>
    );
}












































