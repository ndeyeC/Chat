import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth/AuthContext';
import { Box, Button, Typography, Container, Stack } from '@mui/material';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';
import AdminPage from './AdminPage';

const HomePage: React.FC = () => {
  const { currentUser, isAdmin, userData } = useAuth(); // Assure-toi que userData contient `username`
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
          Bienvenue {userData?.name || 'sur EduChat'}
        </Typography>

        {currentUser ? (
          <>
            {isAdmin ? (
              <AdminPage />
            ) : (
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

            <Button
              variant="text"
              onClick={() => navigate('/register')}
              sx={{ mt: 2 }}
            >
              Créer un compte
            </Button>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default HomePage;
