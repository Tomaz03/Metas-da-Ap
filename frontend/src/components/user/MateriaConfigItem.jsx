import React, { useState, useEffect, useRef, useCallback } from 'react';
import { XCircle, Filter, Loader2 } from 'lucide-react'; // Importe Loader2
import FiltroAvancadoModal from './FiltroAvancadoModal'; // Importe o modal de filtros

export default function MateriaConfigItem({
    config,
    onRemove,
    onMateriaChange,
    onQuantidadeChange,
    allMaterias,
    assuntosPorMateriaLocal,
    token, // Adicione o token como prop
    onUpdateAdditionalFilters // Callback para atualizar os filtros no componente pai
}) {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    const [searchTermMateria, setSearchTermMateria] = useState(config.materia || '');
    const [showDropdownMateria, setShowDropdownMateria] = useState(false);
    const dropdownRefMateria = useRef(null);
    const inputRefMateria = useRef(null);

    const [showFiltroAvancadoModal, setShowFiltroAvancadoModal] = useState(false);
    const [itemAdditionalFilters, setItemAdditionalFilters] = useState(config.additionalFilters || {});

    // Novos estados para a contagem de questões
    const [questionCountForMateria, setQuestionCountForMateria] = useState(0);
    const [isLoadingMateriaCount, setIsLoadingMateriaCount] = useState(false);

    // Efeito para sincronizar os filtros adicionais de volta para o componente pai
    useEffect(() => {
        if (onUpdateAdditionalFilters) {
            onUpdateAdditionalFilters(config.id, itemAdditionalFilters);
        }
    }, [itemAdditionalFilters, config.id, onUpdateAdditionalFilters]);

    // Função para buscar a contagem de questões
    const fetchQuestionCount = useCallback(async () => {
        if (!config.materia) {
            setQuestionCountForMateria(0);
            return;
        }

        setIsLoadingMateriaCount(true);
        try {
            const filtersToQuery = { materia: config.materia };
            // Adiciona os filtros adicionais
            for (const category in itemAdditionalFilters) {
                if (itemAdditionalFilters[category] && itemAdditionalFilters[category].length > 0) {
                    filtersToQuery[category] = itemAdditionalFilters[category].join(',');
                }
            }

            const queryParams = new URLSearchParams();
            for (const key in filtersToQuery) {
                queryParams.append(key, filtersToQuery[key]);
            }

            const url = `${API_URL}/api/questions/count-filtered/?${queryParams.toString()}`;
            console.log("Buscando contagem de questões para matéria:", config.materia, "com filtros:", itemAdditionalFilters, "URL:", url);

            const res = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || 'Falha ao buscar contagem de questões para a matéria.');
            }

            const data = await res.json();
            setQuestionCountForMateria(data.count);
        } catch (error) {
            console.error("Erro ao buscar contagem de questões para matéria:", error);
            setQuestionCountForMateria(0);
        } finally {
            setIsLoadingMateriaCount(false);
        }
    }, [config.materia, itemAdditionalFilters, API_URL, token]);

    // Efeito para disparar a busca da contagem quando a matéria ou filtros mudam
    useEffect(() => {
        fetchQuestionCount();
    }, [fetchQuestionCount]); // Depende da função memoizada

    // Efeito para fechar dropdown de matéria ao clicar fora
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRefMateria.current && !dropdownRefMateria.current.contains(event.target) &&
                inputRefMateria.current && !inputRefMateria.current.contains(event.target)) {
                setShowDropdownMateria(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Atualiza o searchTermMateria quando a matéria inicial muda (ex: ao carregar configs existentes)
    useEffect(() => {
        if (config.materia && config.materia !== searchTermMateria) {
            setSearchTermMateria(config.materia);
        }
    }, [config.materia, searchTermMateria]);


    const handleSearchMateriaChange = (e) => {
        const value = e.target.value;
        setSearchTermMateria(value);
        setShowDropdownMateria(true);
        // Limpa a matéria no estado pai se o usuário estiver digitando algo novo
        // Isso força a seleção de uma matéria da lista de autocomplete
        if (config.materia !== value) {
            onMateriaChange(config.id, '');
        }
    };

    const handleSelectMateria = (materiaNome) => {
        setSearchTermMateria(materiaNome);
        onMateriaChange(config.id, materiaNome);
        setShowDropdownMateria(false);
        // Ao selecionar uma nova matéria, reseta os filtros adicionais para ela
        setItemAdditionalFilters({}); 
    };

    const handleInputMateriaFocus = () => {
        setShowDropdownMateria(true);
    };

    const filteredMaterias = allMaterias.filter(materia =>
        materia.toLowerCase().includes(searchTermMateria.toLowerCase())
    );

    const handleApplyItemFilters = (filters) => {
        setItemAdditionalFilters(filters);
        // A atualização para o pai será feita pelo useEffect
    };

    const handleOpenFiltersModal = () => {
        setShowFiltroAvancadoModal(true);
    };

    return (
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50 relative">
            <button
                onClick={() => onRemove(config.id)}
                className="absolute top-2 right-2 text-red-500 hover:text-red-700 transition-colors duration-200"
                title="Remover Matéria"
            >
                <XCircle className="h-6 w-6" />
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Campo de Matéria com Autocomplete */}
                <div className="relative">
                    <label htmlFor={`materia-${config.id}`} className="block text-sm font-medium text-gray-700 mb-1">Matéria:</label>
                    <input
                        id={`materia-${config.id}`}
                        type="text"
                        value={searchTermMateria}
                        onChange={handleSearchMateriaChange}
                        onFocus={handleInputMateriaFocus}
                        ref={inputRefMateria}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        placeholder="Digite para buscar matéria..."
                        autoComplete="off"
                    />
                    {showDropdownMateria && (
                        <div ref={dropdownRefMateria} className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                            {filteredMaterias.length > 0 ? (
                                filteredMaterias.map(materia => (
                                    <div
                                        key={materia}
                                        onClick={() => handleSelectMateria(materia)}
                                        className="px-3 py-2 cursor-pointer hover:bg-purple-100 text-gray-800 text-sm"
                                    >
                                        {materia}
                                    </div>
                                ))
                            ) : (
                                <div className="px-3 py-2 text-gray-500 text-sm">Nenhuma matéria encontrada.</div>
                            )}
                        </div>
                    )}
                    {/* Contador de Questões */}
                    {config.materia && (
                        <div className="mt-2 text-sm text-gray-600 flex items-center">
                            {isLoadingMateriaCount ? (
                                <Loader2 className="animate-spin h-4 w-4 mr-1 text-blue-500" />
                            ) : (
                                `Questões encontradas: ${questionCountForMateria}`
                            )}
                        </div>
                    )}
                </div>

                {/* Campo de Número de Questões */}
                <div>
                    <label htmlFor={`quantidade-${config.id}`} className="block text-sm font-medium text-gray-700 mb-1">Quantidade de Questões:</label>
                    <input
                        type="number"
                        id={`quantidade-${config.id}`}
                        value={config.quantidade}
                        onChange={(e) => onQuantidadeChange(config.id, e.target.value)}
                        min="0"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                    />
                </div>
            </div>

            {/* Botão "Mais Filtros" */}
            <div className="mt-4 text-right">
                <button
                    onClick={handleOpenFiltersModal}
                    className="inline-flex items-center px-4 py-2 bg-indigo-500 text-white font-medium rounded-md hover:bg-indigo-600 transition-colors duration-200 shadow-md text-sm"
                    disabled={!config.materia} // Desabilita se não houver matéria selecionada
                >
                    <Filter className="h-4 w-4 mr-2" />
                    Mais Filtros ({Object.keys(itemAdditionalFilters).length}) {/* Mostra a contagem de filtros aplicados */}
                </button>
            </div>

            {/* Renderiza o FiltroAvancadoModal */}
            <FiltroAvancadoModal
                isOpen={showFiltroAvancadoModal}
                onClose={() => setShowFiltroAvancadoModal(false)}
                onApplyFilters={handleApplyItemFilters}
                initialFilters={itemAdditionalFilters}
                materia={config.materia} // Passa a matéria selecionada para o modal
                token={token} // Passa o token para o modal
            />
        </div>
    );
}





