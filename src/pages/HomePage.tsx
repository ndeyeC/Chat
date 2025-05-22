import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth/AuthContext';
import { auth, db } from '../services/firebase';
import { signOut } from 'firebase/auth';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';

import {
  Typography,
  List,
  ListItem,
  ListItemText,
  Button,
  Box,
  
  Divider,
} from '@mui/material';

import ChatIcon from '@mui/icons-material/Chat';
import SecurityIcon from '@mui/icons-material/Security';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import PeopleIcon from '@mui/icons-material/People';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

import { motion } from 'framer-motion';

import AdminPage from './AdminPage';
import './styles.css';

interface Group {
  id: string;
  name: string;
  description?: string;
}
/*const testimonials = [
  {
    name: 'Amadou',
    message: "EduChat m'a vraiment aidé à collaborer avec mes collègues efficacement.",
  },
  {
    name: 'Fatou',
    message: "Plateforme intuitive et sécurisée, je recommande à tous les enseignants.",
  },
  {
    name: 'Mamadou',
    message: "Une application rapide avec une communauté active, top !",
  },
];*/
const HomePage: React.FC = () => {
  const { currentUser, isAdmin, userData } = useAuth();
  const navigate = useNavigate();

  const [joinedGroups, setJoinedGroups] = useState<Group[]>([]);
  const [joinedGroupIds, setJoinedGroupIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Déconnexion
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion :', error);
    }
  };

  // Bouton "retour en haut"
  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // Scroll listener
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Récupérer tous les groupes auxquels l'utilisateur est inscrit + ids
  useEffect(() => {
    if (!currentUser) {
      setJoinedGroups([]);
      setJoinedGroupIds([]);
      setLoading(false);
      return;
    }

    const qUserGroups = query(
      collection(db, 'userGroups'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribeUserGroups = onSnapshot(qUserGroups, async (snapshot) => {
      const groupIds = snapshot.docs.map((doc) => doc.data().groupId);
      setJoinedGroupIds(groupIds);

      const groupsData: Group[] = [];
      for (const groupId of groupIds) {
        const groupDoc = await getDocs(
          query(collection(db, 'groups'), where('__name__', '==', groupId))
        );

        groupDoc.forEach((docSnap) => {
          const data = docSnap.data();
          groupsData.push({
            id: docSnap.id,
            name: data.name,
            description: data.description,
          });
        });
      }

      setJoinedGroups(groupsData);
      setLoading(false);
    });

    return () => unsubscribeUserGroups();
  }, [currentUser]);

  // Quitter un groupe
  const handleLeaveGroup = async (groupId: string) => {
    if (!currentUser) {
      alert('Vous devez être connecté !');
      return;
    }

    const q = query(
      collection(db, 'userGroups'),
      where('userId', '==', currentUser.uid),
      where('groupId', '==', groupId)
    );

    try {
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach(async (docSnap) => {
        await deleteDoc(doc(db, 'userGroups', docSnap.id));
      });
    } catch (error) {
      console.error('Erreur lors du retrait du groupe :', error);
      alert('Impossible de quitter le groupe.');
    }
  };

  // Rejoindre un groupe (fonctionnalité ajoutée si besoin)
  const handleJoinGroup = async (groupId: string) => {
    if (!currentUser) {
      alert('Vous devez être connecté !');
      return;
    }
    if (joinedGroupIds.includes(groupId)) {
      navigate(`/group/${groupId}`);
      return;
    }
    try {
      await addDoc(collection(db, 'userGroups'), {
        userId: currentUser.uid,
        groupId,
        joinedAt: new Date(),
      });
      navigate(`/group/${groupId}`);
    } catch (error) {
      console.error('Erreur en rejoignant le groupe :', error);
      alert("Erreur lors de l'ajout au groupe.");
    }
  };

  if (loading) {
    return (
      <Box
        className="home-container"
        sx={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="h6" color="text.secondary">
          Chargement...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      className="home-container"
      sx={{
        maxWidth: 900,
        margin: 'auto',
        px: 3,
        pb: 6,
        pt: 4,
      }}
    >
      <motion.header
        className="home-header"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7 }}
        style={{ textAlign: 'center', marginBottom: 40 }}
      >
        <Typography variant="h3" component="h1" gutterBottom>
          Bienvenue {userData?.name || 'sur EduChat'}
        </Typography>
        <Typography variant="subtitle1" className="home-header">
          La plateforme idéale pour échanger, apprendre et collaborer en toute simplicité.
        </Typography>
      </motion.header>

      {currentUser ? (
        isAdmin ? (
          <AdminPage />
        ) : (
          <>
            <Box
              className="home-buttons"
              sx={{
                display: 'flex',
                justifyContent: 'center',
                gap: 2,
                flexWrap: 'wrap',
                mb: 4,
              }}
            >
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate('/user')}
                startIcon={<PeopleIcon />}
              >
                Voir tous les groupes
              </Button>

              <Button
                variant="outlined"
                color="primary"
                startIcon={<AccountCircleIcon />}
                onClick={() => navigate('/profile')}
              >
                Mon profil
              </Button>

              <Button
                variant="outlined"
                color="error"
                onClick={handleLogout}
                startIcon={<SecurityIcon />}
              >
                Déconnexion
              </Button>
            </Box>

            {/* Groupes de l'utilisateur */}
            <section className="user-groups">
              <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
                Mes groupes
              </Typography>

              {joinedGroups.length === 0 ? (
                <Typography color="text.secondary">
                  Vous n’avez rejoint aucun groupe pour le moment.
                </Typography>
              ) : (
                <List
                  sx={{
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    boxShadow: 3,
                  }}
                >
                  {joinedGroups.map((group) => (
                    <React.Fragment key={group.id}>
                      <ListItem
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: 'action.hover',
                          },
                        }}
                        onClick={() => navigate(`/group/${group.id}`)}
                      >
                        <ListItemText
                          primary={
                            <Typography
                              variant="h6"
                              sx={{ fontWeight: 'bold' }}
                            >
                              {group.name}
                            </Typography>
                          }
                          secondary={group.description || 'Pas de description'}
                          sx={{ flex: 1, mr: 2 }}
                        />
                        <Box>
                          <Button
                            variant="contained"
                            color="success"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/group/${group.id}`);
                            }}
                            sx={{ mr: 1 }}
                          >
                            Entrer
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            onClick={async (e) => {
                              e.stopPropagation();
                              await handleLeaveGroup(group.id);
                            }}
                          >
                            Quitter
                          </Button>
                        </Box>
                      </ListItem>
                      <Divider component="li" />
                    </React.Fragment>
                  ))}
                </List>
              )}
            </section>
          </>
        )
      ) : (
        <>
          <Box
            className="home-buttons"
            sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: 2,
              flexWrap: 'wrap',
              mb: 4,
            }}
          >
            <Button
            className="home-button-primary"
              onClick={() => navigate('/login')}
              sx={{ minWidth: 120 }}
            >
              Se connecter
            </Button>
            <Button
            className="home-button-secondary"
              onClick={() => navigate('/register')}
              sx={{ minWidth: 120 }}
            >
              Créer un compte
            </Button>
          </Box>

          {/* Avantages EduChat */}
          <section className="home-advantages" style={{ marginTop: 40 }}>
            <Typography variant="h4" component="h2" gutterBottom align="center">
              Pourquoi choisir EduChat ?
            </Typography>
            <Box
              className="advantages-grid"
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: '1fr 1fr',
                  md: 'repeat(3, 1fr)',
                },
                gap: 4,
                mt: 3,
              }}
            >
              {[
                {
                  icon: <ChatIcon fontSize="large" color="primary" />,
                  title: 'Discussions en groupe',
                  desc: 'Partagez vos idées et échangez facilement avec vos groupes.',
                },
                {
                  icon: <SecurityIcon fontSize="large" color="primary" />,
                  title: 'Sécurité',
                  desc: 'Vos données sont protégées grâce à une sécurité renforcée.',
                },
                {
                  icon: <AdminPanelSettingsIcon fontSize="large" color="primary" />,
                  title: 'Gestion Admin',
                  desc: 'Contrôlez vos groupes et utilisateurs facilement.',
                },
                {
                  icon: <RocketLaunchIcon fontSize="large" color="primary" />,
                  title: 'Performance',
                  desc: 'Une application rapide et réactive pour une expérience fluide.',
                },
                {
                  icon: <ThumbUpIcon fontSize="large" color="primary" />,
                  title: 'Satisfaction',
                  desc: 'Des milliers d’utilisateurs satisfaits à travers le monde.',
                },
                {
                  icon: <PeopleIcon fontSize="large" color="primary" />,
                  title: 'Communauté',
                  desc: 'Rejoignez une communauté active et bienveillante.',
                },
              ].map(({ icon, title, desc }, idx) => (
                <Box
                  key={idx}
                  sx={{
                    bgcolor: 'background.paper',
                    p: 3,
                    borderRadius: 3,
                    boxShadow: 2,
                    textAlign: 'center',
                  }}
                >
                  {icon}
                  <Typography
                    variant="h6"
                    component="h3"
                    sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}
                  >
                    {title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {desc}
                  </Typography>
                </Box>
              ))}
            </Box>
          </section>
        </>
      )}

      { /* <section className="testimonials" aria-label="Témoignages utilisateurs">
        <h2>Témoignages</h2>
        <div className="testimonials-grid">
          {testimonials.map(({ name, message }, idx) => (
            <motion.blockquote
              key={idx}
              className="testimonial"
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.3 }}
            >
              <p>"{message}"</p>
              <footer>— {name}</footer>
            </motion.blockquote>
          ))}
        </div>
      </section> */}

      {showScrollTop && (
        <Button
          onClick={scrollTop}
          variant="contained"
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 30,
            right: 30,
            borderRadius: '50%',
            minWidth: 0,
            width: 50,
            height: 50,
            boxShadow: 4,
          }}
          aria-label="Retour en haut"
        >
          <ArrowUpwardIcon />
        </Button>
        
      )}
      

      <footer className="home-footer">
        &copy; {new Date().getFullYear()} Ment@list - Tous droits réservés
      </footer>
    </Box>
  );
};

export default HomePage;
