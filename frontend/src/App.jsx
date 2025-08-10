import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import NotebookCreate from './components/user/NotebookCreate';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import AdminDashboard from './components/admin/AdminDashboard';
import Dashboard from './components/user/Dashboard';
import MyNotebooks from './components/user/MyNotebooks';
import Home from './components/Home';
import MessageModal from './components/ui/MessageModal';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import NotebookResolve from './components/user/NotebookResolver';
import NovaPasta from './components/user/NovaPasta';
import FolderView from './components/user/FolderView'; 
import StudentDashboard from './components/user/StudentDashboard'; 
import NoteDetail from './components/user/NoteDetail';
import CommentDetails from "./components/user/CommentDetails"; 
import TheoryViewer from './components/user/TheoryViewer'; // Importar o novo componente
import QuestionSearch from './components/QuestionSearch';
import SimuladoPage from './components/user/SimuladoPage';
import SimuladoConfig from './components/user/SimuladoConfig';
import EstatisticasPage from './components/user/EstatisticasPage';
import EditalVerticalizado from './components/user/EditalVerticalizado';
import Calendario from './components/user/Calendario'; 
import PlanoDeEstudos from './components/user/PlanoDeEstudos';


export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(null); 
  const [messageModal, setMessageModal] = useState('');
  const [loadingToken, setLoadingToken] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      try {
        const parts = storedToken.split('.');
        if (parts.length !== 3) throw new Error('Token malformado');
        const payload = JSON.parse(atob(parts[1]));
        setToken(storedToken); 
        setUserRole(payload.role || 'user');
        console.log("Token decoded role on load:", payload.role); 
      } catch (e) {
        console.error("Erro ao decodificar token no carregamento:", e); 
        localStorage.removeItem('token');
        localStorage.removeItem('userRole'); 
        setToken(null);
        setUserRole(null);
      }
    } else {
      setToken(null);
      setUserRole(null);
    }
    setLoadingToken(false);
  }, []); 

  const handleLoginSuccess = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    const parts = newToken.split('.');
    const payload = JSON.parse(atob(parts[1]));
    setUserRole(payload.role || 'user');
    localStorage.setItem('userRole', payload.role || 'user'); 
  };

  const handleRegisterSuccess = () => {
    setMessageModal('Cadastro enviado com sucesso! Aguarde aprovação.');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole'); 
    setToken(null);
    setUserRole(null);
    setMessageModal('Você foi desconectado.');
  };

  if (loadingToken) {
    return <div className="text-center py-10">Carregando...</div>;
  }

  return (
    <Router>
      <main className="min-h-screen bg-gray-100">
        <MessageModal message={messageModal} onClose={() => setMessageModal('')} />
        <Routes>
          <Route path="/" element={!token ? <Home /> : <Navigate to={userRole === 'admin' ? '/admin' : '/dashboard'} replace />} />
          <Route path="/login" element={!token ? <Login onLoginSuccess={handleLoginSuccess} /> : <Navigate to={userRole === 'admin' ? '/admin' : '/dashboard'} replace />} />
          <Route path="/register" element={!token ? <Register onRegisterSuccess={handleRegisterSuccess} /> : <Navigate to={userRole === 'admin' ? '/admin' : '/dashboard'} replace />} />
          <Route path="/forgot-password" element={<ForgotPassword onSendRecoveryEmail={() => setMessageModal('E-mail de recuperação enviado')} />} />
          <Route path="/redefinir-senha" element={<ResetPassword onSubmit={() => setMessageModal('Senha redefinida com sucesso')} />} />

          <Route 
            path="/admin" 
            element={token && userRole === 'admin' ? <AdminDashboard token={token} onLogout={handleLogout} /> : <Navigate to="/" replace />} 
          />

          <Route path="/dashboard" element={token && userRole !== 'admin' ? <Dashboard token={token} onLogout={handleLogout} /> : <Navigate to="/" replace />} />
          <Route path="/meus-cadernos" element={token && userRole !== 'admin' ? <MyNotebooks token={token} onLogout={handleLogout} /> : <Navigate to="/" replace />} />
          <Route path="/novo-caderno" element={token && userRole !== 'admin' ? <NotebookCreate token={token} /> : <Navigate to="/login" />} />
          <Route path="/resolver-caderno/:id" element={token && userRole !== 'admin' ? (<NotebookResolve token={token} />) : (<Navigate to="/" replace />)} />
          <Route path="/nova-pasta" element={token && userRole !== 'admin' ? <NovaPasta token={token} /> : <Navigate to="/login" />} />
          <Route path="/pasta/:id" element={token && userRole !== 'admin' ? <FolderView token={token} onLogout={handleLogout} /> : <Navigate to="/" replace />} />
          <Route path="/painel-estudante" element={token ? <StudentDashboard token={token} onLogout={handleLogout} /> : <Navigate to="/login" />} />
          <Route path="/minhas-anotacoes/:id" element={token && userRole !== 'admin' ? <NoteDetail token={token} onLogout={handleLogout} /> : <Navigate to="/" replace />} />
          <Route path="/comentarios/:id" element={token ? <CommentDetails token={token} /> : <Navigate to="/login" />} /> {/* NOVA ROTA */}
          <Route path="/teoria/:materia/:assunto" element={<TheoryViewer token={token} onLogout={handleLogout} />} />
          <Route path="/search-questions" element={token && userRole !== 'admin'? <QuestionSearch token={token} onLogout={handleLogout} />: <Navigate to="/" replace />} />
          <Route path="/simulado" element={token && userRole !== 'admin' ? <SimuladoPage token={token} /> : <Navigate to="/login" />} />
          <Route path="/simulado-config" element={token && userRole !== 'admin' ? <SimuladoConfig token={token} /> : <Navigate to="/login" />} />
          <Route path="/estatisticas" element={token && userRole !== 'admin' ? <EstatisticasPage token={token} />: <Navigate to="/login" />} />
          <Route path="/gerar-edital-verticalizado" element={token && userRole !== 'admin' ? <EditalVerticalizado token={token} />: <Navigate to="/login" />} />
          <Route path="/calendario/:editalId" element={token && userRole !== 'admin' ? <Calendario token={token} />: <Navigate to="/login" />} />
        

          
          <Route path="*" element={<Navigate to={token ? (userRole === 'admin' ? '/admin' : '/dashboard') : '/'} replace />} />

        </Routes>
      </main>
    </Router>
  );
}






