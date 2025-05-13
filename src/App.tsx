import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthContext';
import PrivateRoute from './components/auth/PrivateRoute';
import AdminPage from './pages/AdminPage';
import UserPage from './pages/UserPage';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import CreateGroupPage from './pages/groupe/CreateGroup';  // Importer la page de création de groupe

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Page d'accueil */}
          <Route path="/" element={<HomePage />} />
          
          {/* Page de connexion */}
          <Route path="/login" element={<LoginPage />} />

          {/* Route admin protégée */}
          <Route path="/admin" element={
            <PrivateRoute adminOnly>
              <AdminPage />
            </PrivateRoute>
          } />

          {/* Page de création de groupe */}
          <Route path="/create-group" element={<CreateGroupPage />} />

          {/* Page utilisateur protégée */}
          <Route path="/user" element={
            <PrivateRoute>
              <UserPage />
            </PrivateRoute>
          } />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
