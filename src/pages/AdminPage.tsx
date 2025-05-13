import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  TextField, 
  Paper, 
  Container, 
  List, 
  ListItem, 
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

interface Group {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  members: string[];
}

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  // Charger les groupes existants
  useEffect(() => {
    const fetchGroups = async () => {
      const querySnapshot = await getDocs(collection(db, 'groups'));
      const groupsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Group[];
      setGroups(groupsData);
    };

    fetchGroups();
  }, []);

  const handleAddGroup = async () => {
    if (groupName.trim()) {
      try {
        const newGroup = {
          name: groupName,
          description: groupDescription || 'Nouveau groupe',
          createdAt: new Date(),
          members: []
        };

        const docRef = await addDoc(collection(db, 'groups'), newGroup);
        setGroups([...groups, { ...newGroup, id: docRef.id }]);
        setGroupName('');
        setGroupDescription('');
      } catch (error) {
        console.error('Error adding group: ', error);
      }
    }
  };

  const handleEditGroup = (group: Group) => {
    setEditingGroup(group);
    setOpenDialog(true);
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup) return;

    try {
      await updateDoc(doc(db, 'groups', editingGroup.id), {
        name: editingGroup.name,
        description: editingGroup.description
      });

      setGroups(groups.map(group => 
        group.id === editingGroup.id ? editingGroup : group
      ));
      setOpenDialog(false);
    } catch (error) {
      console.error('Error updating group: ', error);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await deleteDoc(doc(db, 'groups', groupId));
      setGroups(groups.filter(group => group.id !== groupId));
    } catch (error) {
      console.error('Error deleting group: ', error);
    }
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" component="h1" gutterBottom sx={{ mt: 4 }}>
        Panel d'administration EduChat
      </Typography>

      {/* Boutons admin */}
      <Box mt={4}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Fonctionnalités administrateur
        </Typography>
        <Button 
          variant="outlined" 
          onClick={() => navigate('/admin/groups')}
          sx={{ mr: 2 }}
        >
          Gérer les groupes
        </Button>
        <Button 
          variant="outlined" 
          onClick={() => navigate('/admin/users')}
          sx={{ mr: 2 }}
        >
          Gérer les utilisateurs
        </Button>
        <Button
                  variant="contained"
                  color="primary"
                  onClick={() => navigate('/create-group')}
                  sx={{ width: 'fit-content' }}
                >
                  Créer un groupe
                </Button>
        <Button
          variant="outlined"
          color="secondary"
          onClick={handleLogout}
          sx={{ ml: 2 }}
        >
          Déconnexion
        </Button>
      </Box>

      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Créer un nouveau groupe
        </Typography>
        <Box display="flex" flexDirection="column" gap={2}>
          <TextField
            label="Nom du groupe"
            fullWidth
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
          />
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={2}
            value={groupDescription}
            onChange={(e) => setGroupDescription(e.target.value)}
          />
          <Button 
            variant="contained" 
            onClick={handleAddGroup}
            sx={{ alignSelf: 'flex-end' }}
          >
            Créer le groupe
          </Button>
        </Box>
      </Paper>

      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Groupes existants ({groups.length})
        </Typography>
        <List>
          {groups.length > 0 ? (
            groups.map((group) => (
              <ListItem key={group.id} 
                secondaryAction={
                  <>
                    <IconButton edge="end" onClick={() => handleEditGroup(group)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton edge="end" onClick={() => handleDeleteGroup(group.id)}>
                      <DeleteIcon color="error" />
                    </IconButton>
                  </>
                }
              >
                <ListItemText 
                  primary={group.name}
                  secondary={
                    <>
                      <Typography component="span" display="block">
                        {group.description}
                      </Typography>
                      <Typography component="span" variant="caption">
                        Créé le: {group.createdAt.toLocaleDateString()}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))
          ) : (
            <Typography>Aucun groupe disponible</Typography>
          )}
        </List>
      </Paper>

      {/* Dialog pour l'édition */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Modifier le groupe</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nom du groupe"
            fullWidth
            value={editingGroup?.name || ''}
            onChange={(e) => editingGroup && setEditingGroup({
              ...editingGroup,
              name: e.target.value
            })}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={editingGroup?.description || ''}
            onChange={(e) => editingGroup && setEditingGroup({
              ...editingGroup,
              description: e.target.value
            })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Annuler</Button>
          <Button onClick={handleUpdateGroup} variant="contained">Enregistrer</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminPage;
