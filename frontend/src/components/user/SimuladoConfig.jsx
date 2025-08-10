import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Play, Loader2, BookOpen, FlaskConical } from 'lucide-react';
import MessageModal from '../ui/MessageModal';
import MateriaConfigItem from './MateriaConfigItem';
import TopNav from "../TopNav"; // Importação adicionada

// IMPORTAÇÕES DOS DADOS LOCAIS
import { allMaterias } from '../../data/materias/materias';
import { assuntosDireitoAdministrativo } from '../../data/assuntos/Direito/DireitoAdministrativo';
import { assuntosDireitoCivil } from '../../data/assuntos/Direito/DireitoCivil';
import { assuntosDireitoConstitucional } from '../../data/assuntos/Direito/DireitoConstitucional';
import { assuntosDireitoPenal } from '../../data/assuntos/Direito/DireitoPenal';
import { assuntosDireitoProcessualCivil } from '../../data/assuntos/Direito/DireitoProcessualCivil';
import { assuntosDireitoProcessualPenal } from '../../data/assuntos/Direito/DireitoProcessualPenal';
import { assuntosDireitoPrevidenciario } from '../../data/assuntos/Direito/DireitoPrevidenciario';
import { assuntosDireitoTributário } from '../../data/assuntos/Direito/DireitoTributario'; 

// Mapeamento de matérias para seus respectivos arrays de assuntos (dados locais)
const assuntosPorMateriaLocal = {
  'Direito Administrativo': assuntosDireitoAdministrativo,
  'Direito Civil': assuntosDireitoCivil,
  'Direito Constitucional': assuntosDireitoConstitucional,
  'Direito Penal': assuntosDireitoPenal,
  'Direito Processual Civil - Novo Código de Processo Civil - CPC 2015': assuntosDireitoProcessualCivil, 
  'Direito Processual Penal': assuntosDireitoProcessualPenal,
  'Direito Previdenciário': assuntosDireitoPrevidenciario,
  'Direito Tributário': assuntosDireitoTributário,
};

export default function SimuladoConfig({ token, onLogout }) { // Adicionei onLogout nas props
    const navigate = useNavigate();
    const [tempoLimite, setTempoLimite] = useState(60);
    const [materiasConfig, setMateriasConfig] = useState([]); 
    const [isGenerating, setIsGenerating] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('info');

    const apiUrl = import.meta.env.VITE_API_URL || ''; 

    useEffect(() => {
        console.log("Conteúdo de allMaterias:", allMaterias);
        if (!allMaterias || allMaterias.length === 0) {
            console.warn("allMaterias está vazio ou não foi carregado corretamente. Verifique o arquivo materias.js.");
        }
        if (!apiUrl) {
            console.error("VITE_API_URL não está definida. Verifique seu arquivo .env na raiz do frontend e reinicie o servidor.");
        } else {
            console.log("URL da API:", apiUrl);
        }
    }, [apiUrl]);

    const addMateriaConfig = (tipo) => {
        setMateriasConfig(prevConfigs => [
            ...prevConfigs,
            {
                id: Date.now(),
                materia: '',
                tipo: tipo,
                quantidade: 0,
                assuntos: [],
                additionalFilters: {},
            }
        ]);
    };

    const removeMateriaConfig = (id) => {
        setMateriasConfig(prevConfigs => prevConfigs.filter(config => config.id !== id));
    };

    const handleMateriaChange = (id, value) => {
        setMateriasConfig(prevConfigs =>
            prevConfigs.map(config =>
                config.id === id
                    ? { ...config, materia: value, assuntos: [], additionalFilters: {} }
                    : config
            )
        );
    };

    const handleQuantidadeChange = (id, value) => {
        const quantidade = Math.max(0, parseInt(value, 10) || 0);
        setMateriasConfig(prevConfigs =>
            prevConfigs.map(config =>
                config.id === id
                    ? { ...config, quantidade: quantidade }
                    : config
            )
        );
    };

    const handleAssuntoChange = (id, assunto, isChecked) => {
        setMateriasConfig(prevConfigs =>
            prevConfigs.map(config => {
                if (config.id === id) {
                    const newAssuntos = isChecked
                        ? [...config.assuntos, assunto]
                        : config.assuntos.filter(a => a !== assunto);
                    return { ...config, assuntos: newAssuntos };
                }
                return config;
            })
        );
    };

    const handleUpdateItemAdditionalFilters = useCallback((id, filters) => {
        setMateriasConfig(prevConfigs =>
            prevConfigs.map(config =>
                config.id === id
                    ? { ...config, additionalFilters: filters }
                    : config
            )
        );
    }, []);

    const renderMateriaSection = (tipo, title, icon) => (
        <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4 flex items-center text-gray-800">
                {icon}
                <span className="ml-3">{title}</span>
                <button
                    onClick={() => addMateriaConfig(tipo)}
                    className="ml-auto p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors duration-200 shadow-md"
                    title={`Adicionar Matéria ${title}`}
                >
                    <PlusCircle className="h-6 w-6" />
                </button>
            </h2>
            {materiasConfig
                .filter(config => config.tipo === tipo)
                .map(config => (
                    <MateriaConfigItem
                        key={config.id}
                        config={config}
                        onRemove={removeMateriaConfig}
                        onMateriaChange={handleMateriaChange}
                        onQuantidadeChange={handleQuantidadeChange}
                        onAssuntoChange={handleAssuntoChange}
                        allMaterias={allMaterias}
                        assuntosPorMateriaLocal={assuntosPorMateriaLocal}
                        token={token}
                        onUpdateAdditionalFilters={handleUpdateItemAdditionalFilters}
                    />
                ))}
            {materiasConfig.filter(config => config.tipo === tipo).length === 0 && (
                <p className="text-gray-500 text-center py-4">Nenhuma matéria adicionada para {title}. Clique no '+' para adicionar.</p>
            )}
        </div>
    );

    const handleGenerateSimulado = async () => {
        setIsGenerating(true);
        setMessage('');
        setMessageType('info');

        if (!apiUrl) {
            setMessage('Erro de configuração: A URL da API não está definida. Verifique seu arquivo .env e reinicie o servidor.');
            setMessageType('error');
            setShowModal(true);
            setIsGenerating(false);
            console.error("VITE_API_URL não está definida.");
            return;
        }

        if (materiasConfig.length === 0) {
            setMessage('Por favor, adicione pelo menos uma matéria para gerar o simulado.');
            setMessageType('error');
            setShowModal(true);
            setIsGenerating(false);
            return;
        }

        const totalQuestoes = materiasConfig.reduce((sum, config) => sum + config.quantidade, 0);
        if (totalQuestoes === 0) {
            setMessage('A quantidade total de questões deve ser maior que zero.');
            setMessageType('error');
            setShowModal(true);
            setIsGenerating(false);
            return;
        }

        const validConfigs = materiasConfig.filter(config => config.materia && config.quantidade > 0);
        if (validConfigs.length !== materiasConfig.length) {
            setMessage('Por favor, preencha a matéria e a quantidade de questões para todas as configurações adicionadas.');
            setMessageType('error');
            setShowModal(true);
            setIsGenerating(false);
            return;
        }

        try {
            const payload = {
                tempo_limite_minutos: tempoLimite,
                materias_config: materiasConfig.map(config => ({
                    materia: config.materia,
                    tipo: config.tipo,
                    quantidade_total: config.quantidade,
                    assuntos: config.assuntos.map(assunto => ({ assunto: assunto })), 
                    additional_filters: config.additionalFilters,
                })),
            };

            const response = await fetch(`${apiUrl}/api/simulados/generate/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                let errorData = {};
                try {
                    errorData = await response.json();
                } catch (jsonError) {
                    console.warn("Não foi possível parsear a resposta de erro como JSON:", jsonError);
                    errorData = { detail: `Erro do servidor: ${response.status} ${response.statusText}` };
                }
                if (Array.isArray(errorData.detail)) {
                    const validationErrors = errorData.detail.map(err => `${err.loc.join('.')} - ${err.msg}`).join('; ');
                    throw new Error(`Erros de validação: ${validationErrors}`);
                }
                throw new Error(errorData.detail || 'Erro desconhecido ao gerar simulado.');
            }

            const simuladoDataResponse = await response.json(); 
            console.log('Simulado gerado:', simuladoDataResponse);

            navigate('/simulado', { 
                state: { 
                    simuladoData: simuladoDataResponse, 
                    tempoLimite: simuladoDataResponse.tempo_limite_minutos 
                } 
            });

        } catch (error) {
            console.error('Erro ao gerar simulado:', error);
            setMessage(`Erro: ${error.message}`);
            setMessageType('error');
            setShowModal(true);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            {/* Adicionei o TopNav aqui */}
            <TopNav onLogout={onLogout} />
            
            <MessageModal
                show={showModal}
                onClose={() => setShowModal(false)}
                message={message}
                type={messageType}
            />

            <main className="flex-grow flex flex-col items-center py-10 px-4 sm:px-6 lg:px-8">
                <div className="w-full max-w-4xl">
                    <div className="bg-white p-8 rounded-lg shadow-xl mb-8">
                        <h1 className="text-4xl font-extrabold text-center text-purple-800 mb-6">Configurar Simulado</h1>
                        <p className="text-center text-gray-600 mb-8">Defina as matérias, assuntos e quantidade de questões para o seu simulado personalizado.</p>

                        <div className="mb-6">
                            <label htmlFor="tempoLimite" className="block text-lg font-medium text-gray-700 mb-2">Tempo Limite (minutos):</label>
                            <input
                                type="number"
                                id="tempoLimite"
                                value={tempoLimite}
                                onChange={(e) => setTempoLimite(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                min="1"
                                className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 text-lg"
                            />
                        </div>
                    </div>

                    {/* Seções de Matérias */}
                    {materiasConfig.length === 0 && (
                        <div className="bg-white p-8 rounded-lg shadow-xl mb-8 text-center">
                            <p className="text-gray-700 text-lg mb-4">Comece adicionando matérias ao seu simulado:</p>
                            <div className="flex justify-center space-x-4">
                                <button
                                    onClick={() => addMateriaConfig('basico')}
                                    className="flex items-center px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors duration-300 shadow-md"
                                >
                                    <BookOpen className="mr-2 h-5 w-5" />
                                    Adicionar Conhecimentos Básicos
                                </button>
                                <button
                                    onClick={() => addMateriaConfig('especifico')}
                                    className="flex items-center px-6 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors duration-300 shadow-md"
                                >
                                    <FlaskConical className="mr-2 h-5 w-5" />
                                    Adicionar Conhecimentos Específicos
                                </button>
                            </div>
                        </div>
                    )}

                    {materiasConfig.length > 0 && (
                        <div className="bg-white p-8 rounded-lg shadow-xl">
                            {/* Seção de Conhecimentos Básicos */}
                            {renderMateriaSection('basico', 'Conhecimentos Básicos', <BookOpen className="h-6 w-6 text-blue-600" />)}

                            {/* Seção de Conhecimentos Específicos */}
                            {renderMateriaSection('especifico', 'Conhecimentos Específicos', <FlaskConical className="h-6 w-6 text-purple-600" />)}

                            <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
                                <button
                                    onClick={handleGenerateSimulado}
                                    disabled={isGenerating}
                                    className="flex items-center px-8 py-4 bg-purple-600 text-white text-xl font-bold rounded-lg hover:bg-purple-700 transition-colors duration-300 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                                            Gerando Simulado...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="mr-3 h-6 w-6" />
                                            Iniciar Simulado
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

















