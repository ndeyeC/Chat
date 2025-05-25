import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { CircularProgress } from "@mui/material";

interface PrivateRouteProps {
  children: React.ReactElement;
  adminOnly?: boolean;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  adminOnly = false,
}) => {
  const { currentUser, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          width: "100vw",
          backgroundColor: "rgba(255, 255, 255, 0.8)",
        }}
      >
        <CircularProgress />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/user" replace />;
  }

  return children;
};

export default PrivateRoute;
