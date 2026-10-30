import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';

import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import NewChatPage from './pages/NewChatPage';
import ChatWorkspacePage from './pages/ChatWorkspacePage';
import MainLayout from './components/layout/MainLayout';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AuthPage />} />
          
          {/* Protected Routes Wrapper */}
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/chat/new" element={<NewChatPage />} />
            <Route path="/chat/:id" element={<ChatWorkspacePage />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
