import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";

// Auth
import AuthPage from "./pages/Auth/AuthPage";
import ForgotPassword from "./pages/Auth/ForgotPassword";
import ResetPassword from "./pages/Auth/ResetPassword";

// Chef
import ChefDashboard from "./pages/Chef/ChefDashboard";

// Customer
import CustomerDashboard from "./pages/Customer/CustomerDashboard";

// Rider
import RiderDashboard from "./pages/Rider/RiderDashboard";

// Loading
const Loader = () => (
  <div className="min-h-screen mesh-bg flex items-center justify-center">
    <div className="text-center animate-fade-in">
      <div className="text-5xl mb-4 animate-bounce-gentle">🍽️</div>
      <div className="text-white/40 text-sm font-body">
        Loading Society HomeChef...
      </div>
    </div>
  </div>
);

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (role && user.role !== role)
    return <Navigate to={`/${user.role}`} replace />;
  return children;
};

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <Loader />;

  return (
    <Routes>
      <Route
        path="/auth"
        element={
          user ? <Navigate to={`/${user.role}`} replace /> : <AuthPage />
        }
      />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        path="/chef/*"
        element={
          <ProtectedRoute role="chef">
            <ChefDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/*"
        element={
          <ProtectedRoute role="customer">
            <CustomerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rider/*"
        element={
          <ProtectedRoute role="rider">
            <RiderDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/"
        element={
          user ? (
            <Navigate to={`/${user.role}`} replace />
          ) : (
            <Navigate to="/auth" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
