import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import Whiteboard from './components/Whiteboard';
import ProtectedRoute from './components/ProtectedRoute';

// This component consumes the auth context
function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/whiteboard/:id"
        element={
          <ProtectedRoute>
            <Whiteboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/note/:id"
        element={
          <ProtectedRoute>
            <Whiteboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

// This is the main App component
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <AppRoutes />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
