import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth/AuthContext';
import { Box, Button, Typography, Container, Stack } from '@mui/material';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';
import AdminPage from './AdminPage'; // ou le bon chemin


const HomePage: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  return (
    <Container maxWidth="md">
      <Box textAlign="center" mt={8}>
        <Typography variant="h2" component="h1" gutterBottom>
          Bienvenue sur EduChat
        </Typography>
        
        {currentUser ? (
  <>
    <Typography variant="h5" sx={{ mb: 4 }}>
      Vous êtes connecté en tant que {isAdmin ? 'administrateur' : 'utilisateur'}
    </Typography>

    {isAdmin ? (
      // Si admin, on affiche le dashboard admin
      <AdminPage />
    ) : (
      // Sinon, boutons pour utilisateur normal
      <Stack direction="column" spacing={2} alignItems="center">
        <Button 
          variant="contained" 
          size="large"
          onClick={() => navigate('/user')}
          sx={{ width: 'fit-content' }}
        >
          Accéder au tableau de bord
        </Button>
        
        <Button
          variant="outlined"
          color="secondary"
          onClick={handleLogout}
          sx={{ width: 'fit-content' }}
        >
          Déconnexion
        </Button>
      </Stack>
    )}
  </>
) : (
  <Box mt={4}>
    <Button 
      variant="contained" 
      size="large"
      onClick={() => navigate('/login')}
      sx={{ px: 4, py: 2 }}
    >
      Se connecter
    </Button>
  </Box>
)}

        </Box>
        </Container>
    );
};

export default HomePage;