import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { confirmPasswordReset } from "firebase/auth";
import { auth } from "../services/firebase";
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Paper,
} from "@mui/material";
import "../App.css"; // ou un fichier ResetPassword.css dédié

const ResetPasswordPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const oobCode = queryParams.get("oobCode");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleReset = async () => {
    setMessage("");
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (!oobCode) {
      setError("Lien invalide ou expiré.");
      return;
    }

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setMessage("Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.");
      setTimeout(() => navigate("/login"), 3000); // Redirection après succès
    } catch (err) {
      setError("Erreur lors de la réinitialisation. Essayez à nouveau.");
      console.error(err);
    }
  };

  return (
    <Box className="reset-container">
      <Paper elevation={3} className="reset-paper">
        <Typography variant="h4" gutterBottom>
          Réinitialiser le mot de passe
        </Typography>

        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}

        <TextField
          label="Nouveau mot de passe"
          type="password"
          fullWidth
          margin="normal"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <TextField
          label="Confirmer le mot de passe"
          type="password"
          fullWidth
          margin="normal"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={handleReset}
          sx={{ mt: 2 }}
        >
          Réinitialiser
        </Button>
      </Paper>
    </Box>
  );
};

export default ResetPasswordPage;
