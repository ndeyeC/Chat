import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const AdminRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { currentUser, isAdmin, loading } = useAuth();

  if (loading) {
    return <div>Chargement...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/user" replace />;
  }

  return children;
};

export default AdminRoute;