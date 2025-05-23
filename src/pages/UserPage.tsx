import React, { useState, useEffect } from 'react';
import {
  Typography, 
  Button, 
  List, 
  ListItem,
  Paper, 
  Container, 
  CircularProgress,
  Box,
  Avatar,
  Divider
} from '@mui/material';
import {
  collection, query, onSnapshot, where, addDoc, deleteDoc, getDocs, doc
} from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import { 
  Group as GroupIcon,
  ExitToApp as LeaveIcon,
  Login as JoinIcon,
  Forum as ChatIcon
} from '@mui/icons-material';
import './pages.styles.css';

interface Group {
  id: string;
  name: string;
  description?: string;
  createdAt?: Date;
  membersCount?: number;
}

const UserPage: React.FC = () => {
  const [chatGroups, setChatGroups] = useState<Group[]>([]);
  const [joinedGroupIds, setJoinedGroupIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGroups = async () => {
      const groupsSnapshot = await getDocs(collection(db, 'groups'));
      const groupsData = groupsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        description: doc.data().description,
        createdAt: doc.data().createdAt?.toDate(),
        membersCount: doc.data().members?.length || 0
      }));
      setChatGroups(groupsData);
      setLoading(false);
    };

    fetchGroups();
  }, []);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const q = query(
      collection(db, 'userGroups'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupIds = snapshot.docs.map(doc => doc.data().groupId);
      setJoinedGroupIds(groupIds);
    });

    return () => unsubscribe();
  }, []);

  const handleJoinGroup = async (groupId: string) => {
    const user = auth.currentUser;
    if (!user) {
      alert("Veuillez vous connecter pour rejoindre un groupe");
      return;
    }

    try {
      await addDoc(collection(db, 'userGroups'), {
        userId: user.uid,
        groupId,
        joinedAt: new Date()
      });
      navigate(`/group/${groupId}`);
    } catch (error) {
      console.error("Erreur lors de l'adhésion:", error);
      alert("Une erreur est survenue");
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'userGroups'),
      where('userId', '==', user.uid),
      where('groupId', '==', groupId)
    );

    try {
      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(docSnap => 
        deleteDoc(doc(db, 'userGroups', docSnap.id))
      );
      await Promise.all(deletePromises);
    } catch (error) {
      console.error("Erreur lors du retrait:", error);
      alert("Impossible de quitter le groupe");
    }
  };

  if (loading) {
    return (
      <Box className="loading-container">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box className="user-dashboard">
      <Paper className="user-header" elevation={0}>
        <Box display="flex" alignItems="center" justifyContent="center" gap={2}>
          <ChatIcon fontSize="large" />
          <Typography variant="h4" component="h1">
            Groupes EduChat
          </Typography>
        </Box>
        <Typography variant="subtitle1" mt={1}>
          Rejoignez des groupes de discussion thématiques
        </Typography>
      </Paper>

      <Paper className="user-card">
        <Box display="flex" alignItems="center" gap={1} mb={3}>
          <GroupIcon color="primary" />
          <Typography variant="h6" component="h2">
            Groupes disponibles ({chatGroups.length})
          </Typography>
        </Box>

        <List className="group-list" disablePadding>
          {chatGroups.length > 0 ? (
            chatGroups.map((group) => {
              const isJoined = joinedGroupIds.includes(group.id);
              return (
                <React.Fragment key={group.id}>
                  <Box className="group-item">
                    <Box className="group-info">
                      <Typography className="group-name">
                        {group.name}
                        <Typography component="span" variant="caption" ml={1}>
                          ({group.membersCount} membres)
                        </Typography>
                      </Typography>
                      <Typography className="group-description">
                        {group.description || 'Aucune description disponible'}
                      </Typography>
                    </Box>
                    <Box className="group-actions">
                      {isJoined ? (
                        <>
                          <Button
                            variant="contained"
                            onClick={() => navigate(`/group/${group.id}`)}
                            className="user-btn primary-btn"
                            startIcon={<ChatIcon />}
                          >
                            Ouvrir
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={() => handleLeaveGroup(group.id)}
                            className="user-btn danger-btn"
                            startIcon={<LeaveIcon />}
                          >
                            Quitter
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="contained"
                          onClick={() => handleJoinGroup(group.id)}
                          className="user-btn primary-btn"
                          startIcon={<JoinIcon />}
                        >
                          Rejoindre
                        </Button>
                      )}
                    </Box>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                </React.Fragment>
              );
            })
          ) : (
            <Typography variant="body1" color="textSecondary" textAlign="center" py={3}>
              Aucun groupe disponible pour le moment
            </Typography>
          )}
        </List>
      </Paper>
    </Box>
  );
};

export default UserPage;