import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  List, 
  ListItem, 
  ListItemText, 
  Paper, 
  Container,
  CircularProgress
} from '@mui/material';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useNavigate } from 'react-router-dom';

interface Group {
  id: string;
  name: string;
  description?: string;
  createdAt?: Date;
}

const UserPage: React.FC = () => {
  const [chatGroups, setChatGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, 'groups')); // Utilisez 'groups' au lieu de 'chatGroups'
    
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const groups = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          description: doc.data().description,
          createdAt: doc.data().createdAt?.toDate()
        }));
        setChatGroups(groups);
        setLoading(false);
      },
      (error) => {
        console.error("Erreur de chargement des groupes:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleJoinGroup = (groupId: string) => {
    navigate(`/group/${groupId}`);
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
            chatGroups.map((group) => (
              <ListItem key={group.id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <ListItemText 
                  primary={group.name}
                  secondary={group.description || 'Aucune description'}
                />
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => handleJoinGroup(group.id)}
                >
                  Rejoindre
                </Button>
              </ListItem>
            ))
          ) : (
            <Typography>Aucun groupe disponible pour le moment</Typography>
          )}
        </List>
      </Paper>
    </Container>
  );
};

export default UserPage;