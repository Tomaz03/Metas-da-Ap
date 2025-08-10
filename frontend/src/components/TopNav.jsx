    import React from 'react';
    import { NavLink, useNavigate } from 'react-router-dom';
    import { Book, Search, BookOpen, TestTubes, BarChart, FileText, LogOut, LayoutDashboard, User, Folder, Star } from 'lucide-react'; // Importe Star
    import logo from '../assets/logo.png'; 

    export default function TopNav({ onLogout }) {
        const navigate = useNavigate();

        const handleLogout = () => {
            if (typeof onLogout === 'function') {
                onLogout();
            }
            navigate('/login');
        };

        return (
            <nav className="bg-blue-950 shadow-md px-4 py-2 flex items-center justify-between z-10">
                                    <div className="flex items-center">
                        <NavLink to="/" className="flex items-center space-x-6">
                            <img src={logo} alt="Questões da Aprovação Logo" className="h-12 sm:h-16 w-auto object-contain mt-1" />
                        </NavLink>
                        <button
                            onClick={handleLogout}
                            className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-blue-200 hover:bg-red-700 hover:text-white transition-colors duration-200"
                        >
                            <LogOut className="h-5 w-5 mr-2" /> Sair
                        </button>                
                    </div>
                    <div className="flex items-center space-x-6">
                        <NavLink
    to="/meus-cadernos"
    className={({ isActive }) =>
        `flex items-center bg-blue-700 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105
        ${isActive ? 'bg-blue-500 text-white shadow-md' : 'text-white hover:bg-blue-600'}`
    }
>
    <Book className="h-5 w-5 mr-2" /> Cadernos
</NavLink>

<NavLink
    to="/search-questions"
    className={({ isActive }) =>
        `flex items-center bg-red-700 hover:bg-red-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105
        ${isActive ? 'bg-red-500 text-white shadow-md' : 'text-white hover:bg-red-600'}`
    }
>
    <Search className="h-5 w-5 mr-2" /> Questões
</NavLink>
                        <NavLink
                            to="/provas"
                            className={({ isActive }) =>
                                `flex items-center bg-green-700 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105
                                ${isActive ? 'bg-green-500 text-white shadow-md' : 'text-white hover:bg-green-600 hover:text-white'}`
                            }
                        >
                            <TestTubes className="h-5 w-5 mr-2" /> Provas
                        </NavLink>

                        <NavLink
                            to="/simulado"
                            className={({ isActive }) =>
                                `flex items-center bg-yellow-700 hover:bg-yellow-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105
                                ${isActive ? 'bg-yellow-500 text-white shadow-md' : 'text-white hover:bg-yellow-600 hover:text-white'}`
                            }
                        >
                            <TestTubes className="h-5 w-5 mr-2" /> Simulados
                        </NavLink>

                        {/* Novo botão Painel do Estudante */}
                        <NavLink
                            to="/painel-estudante"
                            className={({ isActive }) =>
                                `flex items-center bg-indigo-700 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105
                                ${isActive ? 'bg-indigo-500 text-white shadow-md' : 'text-blue-200 hover:bg-indigo-600 hover:text-white'}`
                            }
                        >
                            <User className="h-5 w-5 mr-2" /> Painel do Estudante
                        </NavLink>

                        
                    </div>
                
            </nav>
        );
    }
    
