import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

export default function Home() {
  const navigate = useNavigate();
  const [showMessage, setShowMessage] = useState(false);
  const [message, setMessage] = useState('');

  // Simula mensagem de logout via URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const logoutMessage = urlParams.get('message');
    if (logoutMessage === 'logout') {
      setMessage('Você foi desconectado');
      setShowMessage(true);
      const timer = setTimeout(() => {
        setShowMessage(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Mensagem temporária */}
      {showMessage && (
        <div className="fixed top-0 left-0 w-full bg-green-500 text-white text-center py-2 animate-fade-in-out z-20">
          {message}
        </div>
      )}

      {/* Cabeçalho */}
      <header className="bg-blue-950 shadow-md px-4 py-2 flex items-center justify-between z-10">
  <div className="flex items-center gap-3">
    <img src={logo} alt="Questões da Aprovação Logo" className="h-12 sm:h-16 w-auto object-contain mt-1" />
  </div>
  <button
    onClick={() => navigate('/login')}
    className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md flex items-center transition-transform transform hover:scale-105"
  >
    Login
  </button>
</header>

      {/* Seção principal */}
      <main className="flex flex-col items-center text-center bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-16">
        <h1 className="text-3xl sm:text-5xl font-extrabold mb-6 leading-tight max-w-4xl">
          Bem-vindo ao Questões da Aprovação!
        </h1>
        <p className="text-lg sm:text-xl max-w-3xl mb-8 leading-relaxed text-justify md:text-center">
          Preparar-se para um concurso público nunca foi tão dinâmico e eficiente! Aqui você encontra a ferramenta ideal para turbinar seus estudos e conquistar a tão sonhada vaga.
        </p>
        <button
          onClick={() => navigate('/register')}
          className="bg-green-600 text-white hover:bg-blue-950 hover:text-white font-semibold px-6 py-3 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105"
        >
          CADASTRE-SE GRATUITAMENTE
        </button>
      </main>

      {/* Benefícios - Cards responsivos */}
      <section className="py-12 px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto text-center">
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105">
          <div className="text-5xl mb-3 text-pink-500">🧠</div>
          <h3 className="text-xl font-bold mb-2 text-gray-800">Pratique com questões reais</h3>
          <p className="text-gray-600">Milhares de questões de concursos anteriores para dominar temas e ganhar segurança.</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105">
          <div className="text-5xl mb-3 text-blue-500">📊</div>
          <h3 className="text-xl font-bold mb-2 text-gray-800">Acompanhe sua evolução</h3>
          <p className="text-gray-600">Relatórios e gráficos que mostram onde melhorar e como evoluir com eficiência.</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105">
          <div className="text-5xl mb-3 text-teal-500">🚀</div>
          <h3 className="text-xl font-bold mb-2 text-gray-800">Estude onde e quando quiser</h3>
          <p className="text-gray-600">Acesse do celular ou computador, com interface pensada para seu ritmo de estudo.</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105">
          <div className="text-5xl mb-3 text-yellow-500">🏆</div>
          <h3 className="text-xl font-bold mb-2 text-gray-800">Rumo à aprovação</h3>
          <p className="text-gray-600">Com prática e foco, você acerta mais e fica cada vez mais perto da aprovação.</p>
        </div>
      </section>

      {/* Chamada final */}
      <section className="bg-white text-center py-12 px-4">
        <p className="text-lg sm:text-xl text-gray-700 max-w-3xl mx-auto mb-6 text-justify md:text-center">
          Não deixe para depois o que pode mudar seu futuro hoje. Cadastre-se grátis no{' '}
          <strong>Questões da Aprovação</strong> e comece a transformar seus estudos em resultados.
        </p>
        <p className="text-xl font-semibold text-blue-700 mb-6">A prática leva à perfeição – e sua aprovação está a apenas um clique!</p>
        <button
          onClick={() => navigate('/register')}
          className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold px-6 py-3 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105"
        >
          Junte-se à comunidade dos aprovados. Vamos juntos?
        </button>
      </section>

      {/* Rodapé */}
      <footer className="bg-gray-800 text-center text-sm text-gray-300 py-6 mt-8">
        © {new Date().getFullYear()} Questões da Aprovação. Todos os direitos reservados.
      </footer>
    </div>
  );
}