import React, { useState, useEffect } from 'react';
import {
  Typography, Button, List, ListItem,
  ListItemText, Paper, Container, CircularProgress
} from '@mui/material';
import {
  collection, query, onSnapshot, where, addDoc, deleteDoc, getDocs, doc
} from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { useNavigate } from 'react-router-dom';

interface Group {
  id: string;
  name: string;
  description?: string;
  createdAt?: Date;
}

const UserPage: React.FC = () => {
  const [chatGroups, setChatGroups] = useState<Group[]>([]);
  const [joinedGroupIds, setJoinedGroupIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeGroups = onSnapshot(
      collection(db, 'groups'),
      (snapshot) => {
        const groups = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          description: doc.data().description,
          createdAt: doc.data().createdAt?.toDate()
        }));
        setChatGroups(groups);
        setLoading(false);
      }
    );

    return () => unsubscribeGroups();
  }, []);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const q = query(
      collection(db, 'userGroups'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribeJoined = onSnapshot(q, (snapshot) => {
      const groupIds = snapshot.docs.map(doc => doc.data().groupId);
      setJoinedGroupIds(groupIds);
    });

    return () => unsubscribeJoined();
  }, []);

  const handleJoinGroup = async (groupId: string) => {
    const user = auth.currentUser;
    if (!user) {
      alert("Vous devez être connecté !");
      return;
    }

    if (!joinedGroupIds.includes(groupId)) {
      try {
        await addDoc(collection(db, 'userGroups'), {
          userId: user.uid,
          groupId,
          joinedAt: new Date()
        });
      } catch (error) {
        console.error("Erreur d'ajout :", error);
        alert("Erreur en rejoignant le groupe.");
        return;
      }
    }

    navigate(`/group/${groupId}`);
  };

  const handleLeaveGroup = async (groupId: string) => {
    const user = auth.currentUser;
    if (!user) {
      alert("Vous devez être connecté !");
      return;
    }

    const q = query(
      collection(db, 'userGroups'),
      where('userId', '==', user.uid),
      where('groupId', '==', groupId)
    );

    try {
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach(async (docSnap) => {
        await deleteDoc(doc(db, 'userGroups', docSnap.id));
      });
    } catch (error) {
      console.error("Erreur lors du retrait du groupe :", error);
      alert("Impossible de quitter le groupe.");
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Typography variant="h4" component="h1" gutterBottom sx={{ mt: 4 }}>
        Bienvenue sur EduChat
      </Typography>

      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Groupes de discussion disponibles ({chatGroups.length})
        </Typography>

        <List>
          {chatGroups.length > 0 ? (
            chatGroups.map((group) => {
              const isJoined = joinedGroupIds.includes(group.id);
              return (
                <ListItem key={group.id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <ListItemText
                    primary={group.name}
                    secondary={group.description || 'Aucune description'}
                  />
                  {isJoined ? (
                    <>
                      <Button
                        variant="contained"
                        color="success"
                        onClick={() => navigate(`/group/${group.id}`)}
                        sx={{ mr: 1 }}
                      >
                        Entrer
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => handleLeaveGroup(group.id)}
                      >
                        Quitter
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleJoinGroup(group.id)}
                    >
                      Rejoindre
                    </Button>
                  )}
                </ListItem>
              );
            })
          ) : (
            <Typography>Aucun groupe disponible pour le moment</Typography>
          )}
        </List>
      </Paper>
    </Container>
  );
};

export default UserPage;
