import React, { useState, useEffect, useCallback } from 'react';
import { X, CheckSquare, Square, Loader2 } from 'lucide-react'; // Importe Loader2 para o ícone de carregamento

// Importações dos dados locais (certifique-se de que os caminhos estão corretos)
import { assuntosDireitoAdministrativo } from '../../data/assuntos/Direito/DireitoAdministrativo';
import { assuntosDireitoCivil } from '../../data/assuntos/Direito/DireitoCivil';
import { assuntosDireitoPenal } from '../../data/assuntos/Direito/DireitoPenal';
import { assuntosDireitoConstitucional } from '../../data/assuntos/Direito/DireitoConstitucional';
import { assuntosDireitoProcessualCivil } from '../../data/assuntos/Direito/DireitoProcessualCivil';
import { assuntosDireitoProcessualPenal } from '../../data/assuntos/Direito/DireitoProcessualPenal';
import { assuntosDireitoPrevidenciario } from '../../data/assuntos/Direito/DireitoPrevidenciario';
import { assuntosDireitoTributário } from '../../data/assuntos/Direito/DireitoTributario'; 

import { anos } from '../../data/anos/anos';
import { cargos } from '../../data/cargos/cargos';
import { bancas } from '../../data/bancas/bancas';
import { orgaos } from '../../data/orgaos/orgaos';
import { escolaridades } from '../../data/escolaridades/escolaridades';
import { dificuldades } from '../../data/dificuldades/dificuldades';
import { regioes } from '../../data/regioes/regioes';

// Mapeamento de matérias para seus respectivos arrays de assuntos (dados locais)
const assuntosPorMateria = {
    'Direito Administrativo': assuntosDireitoAdministrativo,
    'Direito Civil': assuntosDireitoCivil,
    'Direito Constitucional': assuntosDireitoConstitucional,
    'Direito Penal': assuntosDireitoPenal,
    'Direito Processual Civil - Novo Código de Processo Civil - CPC 2015': assuntosDireitoProcessualCivil, 
    'Direito Processual Penal': assuntosDireitoProcessualPenal,
    'Direito Previdenciário': assuntosDireitoPrevidenciario,
    'Direito Tributário': assuntosDireitoTributário,
    // Adicione outros mapeamentos conforme necessário
};

export default function FiltroAvancadoModal({ isOpen, onClose, onApplyFilters, initialFilters, materia, token }) {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    const [selectedFilterCategory, setSelectedFilterCategory] = useState(null);
    const [activeFilters, setActiveFilters] = useState({});
    const [questionCount, setQuestionCount] = useState(0);
    const [isLoadingCount, setIsLoadingCount] = useState(false);
    const [searchTerm, setSearchTerm] = useState(''); // Estado para o campo de busca

    useEffect(() => {
        if (isOpen) {
            // Inicializa os filtros ativos com base nos filtros iniciais passados
            const newActiveFilters = {};
            for (const category in initialFilters) {
                if (Array.isArray(initialFilters[category])) {
                    newActiveFilters[category] = new Set(initialFilters[category]);
                } else if (initialFilters[category]) {
                    newActiveFilters[category] = new Set([initialFilters[category]]);
                }
            }
            setActiveFilters(newActiveFilters);
            // Seleciona a primeira categoria por padrão ao abrir o modal
            if (Object.keys(allFilterData).length > 0) {
                setSelectedFilterCategory(Object.keys(allFilterData)[0]);
            }
        } else {
            // Reseta o estado quando o modal é fechado
            setSelectedFilterCategory(null);
            setSearchTerm(''); // Limpa o campo de busca ao fechar o modal
        }
    }, [isOpen, initialFilters]);

    // Limpa o campo de busca quando muda a categoria selecionada
    useEffect(() => {
        setSearchTerm('');
    }, [selectedFilterCategory]);

    // Mapeamento de todos os dados de filtro (dinâmico para 'assunto')
    const allFilterData = {
        assunto: {
            label: 'Assunto',
            data: materia && assuntosPorMateria[materia] 
                ? assuntosPorMateria[materia].sort() 
                : [], // Se não houver matéria, não mostra assuntos
        },
        banca: { label: 'Banca', data: bancas },
        orgao: { label: 'Órgão', data: orgaos },
        cargo: { label: 'Cargo', data: cargos },
        ano: { label: 'Ano', data: anos.map(String).sort((a, b) => parseInt(b) - parseInt(a)) },
        escolaridade: { label: 'Escolaridade', data: escolaridades },
        dificuldade: { label: 'Dificuldade', data: dificuldades },
        regiao: { label: 'Região', data: regioes },
    };

    const fetchQuestionCount = useCallback(async () => {
        setIsLoadingCount(true);
        try {
            const filtersToQuery = {};
            if (materia) {
                filtersToQuery.materia = materia;
            }

            for (const category in activeFilters) {
                if (activeFilters[category] && activeFilters[category].size > 0) {
                    filtersToQuery[category] = Array.from(activeFilters[category]).join(',');
                }
            }

            const queryParams = new URLSearchParams();
            for (const key in filtersToQuery) {
                queryParams.append(key, filtersToQuery[key]);
            }

            const url = `${API_URL}/api/questions/count-filtered/?${queryParams.toString()}`;
            console.log("Buscando contagem de questões de:", url);

            const res = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || 'Falha ao buscar contagem de questões.');
            }

            const data = await res.json();
            setQuestionCount(data.count);
        } catch (error) {
            console.error("Erro ao buscar contagem de questões:", error);
            setQuestionCount(0);
        } finally {
            setIsLoadingCount(false);
        }
    }, [materia, activeFilters, API_URL, token]);

    useEffect(() => {
        if (isOpen) {
            fetchQuestionCount();
        }
    }, [isOpen, activeFilters, materia, fetchQuestionCount]);

    const handleToggleFilterItem = useCallback((category, item) => {
        setActiveFilters(prev => {
            const newCategorySet = new Set(prev[category] || []);
            if (newCategorySet.has(item)) {
                newCategorySet.delete(item);
            } else {
                newCategorySet.add(item);
            }
            return {
                ...prev,
                [category]: newCategorySet,
            };
        });
    }, []);

    const handleRemoveActiveFilter = useCallback((category, itemToRemove) => {
        setActiveFilters(prev => {
            const newCategorySet = new Set(prev[category] || []);
            newCategorySet.delete(itemToRemove);
            if (newCategorySet.size === 0) {
                const newState = { ...prev };
                delete newState[category];
                return newState;
            }
            return {
                ...prev,
                [category]: newCategorySet,
            };
        });
    }, []);

    const handleSelectAll = useCallback((category) => {
        const allItems = allFilterData[category].data;
        setActiveFilters(prev => {
            const currentSelected = prev[category] || new Set();
            if (currentSelected.size === allItems.length) {
                const newState = { ...prev };
                delete newState[category];
                return newState;
            } else {
                return {
                    ...prev,
                    [category]: new Set(allItems),
                };
            }
        });
    }, [allFilterData]);

    const handleClearAllFilters = useCallback(() => {
        setActiveFilters({});
    }, []);

    const handleApplyAndClose = () => {
        const filtersToApply = {};
        for (const category in activeFilters) {
            if (activeFilters[category] && activeFilters[category].size > 0) {
                filtersToApply[category] = Array.from(activeFilters[category]);
            }
        }
        onApplyFilters(filtersToApply);
        onClose();
    };

    if (!isOpen) return null;

    const renderableActiveFilters = Object.entries(activeFilters).flatMap(([category, itemsSet]) =>
        Array.from(itemsSet).map(item => ({ category, item, label: allFilterData[category].label }))
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[1000] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-8xl h-[90vh] flex flex-col relative">
                {/* Cabeçalho do Modal */}
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-800">Mais Filtros para {materia || 'Matéria'}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                {/* Conteúdo do Modal (3 Colunas) */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Coluna 1: Categorias de Filtro */}
                    <div className="w-1/6 border-r border-gray-200 p-4 overflow-y-auto bg-gray-50">
                        <h3 className="text-lg font-semibold text-gray-700 mb-4">Categorias</h3>
                        <ul className="space-y-2">
                            {Object.keys(allFilterData).map(category => (
                                <li key={category}>
                                    <button
                                        onClick={() => setSelectedFilterCategory(category)}
                                        className={`w-full text-left p-3 rounded-lg transition-colors duration-200 
                                            ${selectedFilterCategory === category 
                                                ? 'bg-blue-600 text-white shadow-md' 
                                                : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                                    >
                                        {allFilterData[category].label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Coluna 2: Opções de Seleção */}
                    <div className="w-1/2 border-r border-gray-200 p-4 overflow-y-auto">
                        {selectedFilterCategory ? (
                            <>
                                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center justify-between">
                                    Opções de {allFilterData[selectedFilterCategory].label}
                                    <button
                                        onClick={() => handleSelectAll(selectedFilterCategory)}
                                        className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
                                    >
                                        {activeFilters[selectedFilterCategory]?.size === allFilterData[selectedFilterCategory].data.length && allFilterData[selectedFilterCategory].data.length > 0 ? (
                                            <CheckSquare size={16} className="mr-1" />
                                        ) : (
                                            <Square size={16} className="mr-1" />
                                        )}
                                        {activeFilters[selectedFilterCategory]?.size === allFilterData[selectedFilterCategory].data.length && allFilterData[selectedFilterCategory].data.length > 0 ? 'Deselecionar Todos' : 'Selecionar Todos'}
                                    </button>
                                </h3>
                                
                                {/* Campo de busca adicionado aqui */}
                                <input
                                    type="text"
                                    placeholder={`Buscar ${allFilterData[selectedFilterCategory].label.toLowerCase()}...`}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-3 py-2 mb-4 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                
                                <ul className="space-y-2">
    {[...new Set(
        allFilterData[selectedFilterCategory].data
            .filter(item =>
                item.toLowerCase().includes(searchTerm.toLowerCase())
            )
    )].map(item => {
        const isSelected = activeFilters[selectedFilterCategory]?.has(item);
        return (
            <li key={item}>
                <label className="flex items-center cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                    <input
                        type="checkbox"
                        checked={isSelected || false}
                        onChange={() => handleToggleFilterItem(selectedFilterCategory, item)}
                        className="form-checkbox h-5 w-5 text-blue-600 rounded"
                    />
                    <span className="ml-3 text-gray-800">{item}</span>
                </label>
            </li>
        );
    })}
</ul>
                            </>
                        ) : (
                            <p className="text-gray-500 text-center py-10">Selecione uma categoria de filtro na coluna à esquerda.</p>
                        )}
                    </div>

                    {/* Coluna 3: Filtros Ativos */}
                    <div className="w-1/4 p-4 overflow-y-auto bg-gray-50">
                        <h3 className="text-lg font-semibold text-gray-700 mb-4 flex justify-between items-center">
                            Filtros Ativos
                            <button onClick={handleClearAllFilters} className="text-red-500 hover:text-red-700 text-sm">
                                Limpar Todos
                            </button>
                        </h3>
                        {renderableActiveFilters.length === 0 ? (
                            <p className="text-gray-500 italic">Nenhum filtro ativo.</p>
                        ) : (
                            <ul className="space-y-2">
                                {renderableActiveFilters.map((filter, index) => (
                                    <li key={`${filter.category}-${filter.item}-${index}`} className="flex items-center justify-between bg-blue-100 text-blue-800 p-2 rounded-lg shadow-sm">
                                        <span className="text-sm font-medium">{filter.label}: {filter.item}</span>
                                        <button onClick={() => handleRemoveActiveFilter(filter.category, filter.item)} className="text-blue-600 hover:text-blue-900 ml-2">
                                            <X size={16} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Rodapé do Modal */}
                <div className="p-6 border-t border-gray-200 flex justify-between items-center">
                    <div className="flex items-center text-lg font-semibold text-gray-700">
                        Questões Encontradas:
                        {isLoadingCount ? (
                            <Loader2 className="animate-spin ml-2 h-5 w-5 text-blue-600" />
                        ) : (
                            <span className="ml-2 text-blue-800">{questionCount}</span>
                        )}
                    </div>
                    <div className="flex space-x-4">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors duration-200 font-semibold"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleApplyAndClose}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-semibold shadow-md"
                        >
                            Aplicar Filtros
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}





