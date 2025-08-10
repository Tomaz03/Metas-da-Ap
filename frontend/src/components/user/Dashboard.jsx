import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, BookOpen, BarChart2, ClipboardCheck, FileText, PlusCircle, GraduationCap, Target, Award, Loader2, NotebookPen } from 'lucide-react';
import logo from '../../assets/logo.png';
import MessageModal from '../ui/MessageModal';
import TopNav from "../TopNav";

export default function Dashboard({ token, onLogout }) {
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [userName, setUserName] = useState('Usuário');
    const [userStats, setUserStats] = useState(null);

    const navigate = useNavigate();

    const decodeToken = () => {
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUserName(payload.sub || 'Usuário');
            } catch (error) {
                console.error("Erro ao decodificar token:", error);
                setUserName('Usuário');
            }
        }
    };

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        if (!token) {
            console.warn('Token ausente! Redirecionando para login...');
            onLogout();
            navigate('/login');
            return;
        }

        try {
            decodeToken();

            const statsRes = await fetch(`${import.meta.env.VITE_API_URL}/api/users/me/stats`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (statsRes.status === 401 || statsRes.status === 403) {
                console.warn('Token inválido, expirado ou usuário inativo, fazendo logout...');
                onLogout();
                navigate('/login');
                return;
            }
            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setUserStats(statsData);
            } else {
                console.warn('Não foi possível buscar estatísticas do usuário. Usando dados padrão.');
                setUserStats({
                    total_questoes_resolvidas: 0,
                    total_acertos: 0,
                    total_erros: 0,
                    percentual_acerto: 0.0
                });
            }

        } catch (err) {
            console.error('Erro ao buscar dados do dashboard:', err);
            setMessage('Erro ao carregar dados. Tente novamente.');
            setMessageType('error');
            setUserStats(null);
        } finally {
            setIsLoading(false);
            setTimeout(() => setMessage(''), 5000);
        }
    }, [token, navigate, onLogout]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100 font-inter">
            <TopNav onLogout={onLogout} />
        
            {message && (
                <MessageModal
                    message={message}
                    type={messageType}
                    onClose={() => setMessage('')}
                />
            )}

            <main className="flex-grow max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20 text-gray-700">
                        <Loader2 className="animate-spin h-8 w-8 mr-3 text-blue-600" />
                        <p className="text-lg">Carregando seu Dashboard...</p>
                    </div>
                ) : (
                    <>
                        <section className="bg-white rounded-2xl shadow-xl p-8 mb-8 text-center md:text-left animate-fade-in-up">
                            <h2 className="text-4xl font-extrabold text-gray-900 mb-2">
                                Olá, <span className="text-blue-600">{userName}!</span>
                            </h2>
                            <p className="text-lg text-gray-700 leading-relaxed max-w-2xl mx-auto md:mx-0">
                                Bem-vindo(a) de volta! Continue sua jornada rumo à aprovação com nossas ferramentas e recursos.
                            </p>
                            <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                                <button
                                    onClick={() => navigate('/novo-caderno')}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition duration-300 transform hover:scale-105 flex items-center justify-center"
                                >
                                    <PlusCircle className="h-5 w-5 mr-2" /> Criar Novo Caderno
                                </button>
                                <button
                                    onClick={() => navigate('/simulados/novo')}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition duration-300 transform hover:scale-105 flex items-center justify-center"
                                >
                                    <GraduationCap className="h-5 w-5 mr-2" /> Iniciar Simulado Rápido
                                </button>
                            </div>
                        </section>

                        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fade-in-up delay-100">
                            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 flex items-center space-x-4">
                                <div className="p-3 bg-blue-100 rounded-full">
                                    <NotebookPen className="h-8 w-8 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm text-gray-500 font-medium">Questões Resolvidas</h3>
                                    <p className="text-3xl font-bold text-gray-900">{userStats?.total_questoes_resolvidas || 0}</p>
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 flex items-center space-x-4">
                                <div className="p-3 bg-green-100 rounded-full">
                                    <Award className="h-8 w-8 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm text-gray-500 font-medium">Total de Acertos</h3>
                                    <p className="text-3xl font-bold text-gray-900">{userStats?.total_acertos || 0}</p>
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 flex items-center space-x-4">
                                <div className="p-3 bg-yellow-100 rounded-full">
                                    <Target className="h-8 w-8 text-yellow-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm text-gray-500 font-medium">Taxa de Acerto</h3>
                                    <p className="text-3xl font-bold text-gray-900">
                                        {userStats?.percentual_acerto_geral !== undefined ? userStats.percentual_acerto_geral.toFixed(0) : 0}%
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up delay-200">
                            <div
                                onClick={() => navigate('/meus-cadernos')}
                                className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100 cursor-pointer transform hover:scale-[1.02]"
                            >
                                <div className="text-3xl mb-4 text-blue-500 flex items-center">
                                    <BookOpen className="h-8 w-8 mr-2" />
                                    <h3 className="text-xl font-semibold text-gray-800">Meus Cadernos</h3>
                                </div>
                                <p className="text-gray-600 mt-2 text-sm">
                                    Organize e estude por cadernos personalizados.
                                </p>
                            </div>
                            <div
                                onClick={() => navigate('/estatisticas-gerais')}
                                className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100 cursor-pointer transform hover:scale-[1.02]"
                            >
                                <div className="text-3xl mb-4 text-indigo-500 flex items-center">
                                    <BarChart2 className="h-8 w-8 mr-2" />
                                    <h3 className="text-xl font-semibold text-gray-800">Estatísticas Detalhadas</h3>
                                </div>
                                <p className="text-gray-600 mt-2 text-sm">
                                    Analise seu desempenho e identifique pontos fracos.
                                </p>
                            </div>
                            <div
                                onClick={() => navigate('/provas')}
                                className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100 cursor-pointer transform hover:scale-[1.02]"
                            >
                                <div className="text-3xl mb-4 text-green-500 flex items-center">
                                    <ClipboardCheck className="h-8 w-8 mr-2" />
                                    <h3 className="text-xl font-semibold text-gray-800">Provas Anteriores</h3>
                                </div>
                                <p className="text-gray-600 mt-2 text-sm">
                                    Resolva provas reais e teste seus conhecimentos.
                                </p>
                            </div>
                            <div
                                onClick={() => navigate('/simulados')}
                                className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100 cursor-pointer transform hover:scale-[1.02]"
                            >
                                <div className="text-3xl mb-4 text-yellow-500 flex items-center">
                                    <FileText className="h-8 w-8 mr-2" />
                                    <h3 className="text-xl font-semibold text-gray-800">Simulados Personalizados</h3>
                                </div>
                                <p className="text-gray-600 mt-2 text-sm">
                                    Crie simulados com seus próprios critérios.
                                </p>
                            </div>
                        </section>
                    </>
                )}
            </main>

            <footer className="mt-auto bg-blue-950 text-center text-sm text-gray-500 py-4 shadow-inner border-t border-gray-100">
                ©{new Date().getFullYear()} Questões da Aprovação. Todos os direitos reservados.
            </footer>

            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fade-in-down {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
                .animate-fade-in-up.delay-100 { animation-delay: 0.1s; }
                .animate-fade-in-up.delay-200 { animation-delay: 0.2s; }
                .animate-fade-in-down { animation: fade-in-down 0.5s ease-out forwards; }
            `}</style>
        </div>
    );
}
