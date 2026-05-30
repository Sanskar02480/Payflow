import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './routes/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Transfer from './pages/Transfer';
import History from './pages/History';
import AdminTransactions from './pages/AdminTransactions';
import NotFound from './pages/NotFound';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { token } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />

      <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route
        path="/register"
        element={token ? <Navigate to="/dashboard" replace /> : <Register />}
      />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/transfer" element={<Transfer />} />
        <Route path="/history" element={<History />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireRole="ADMIN">
              <AdminTransactions />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
