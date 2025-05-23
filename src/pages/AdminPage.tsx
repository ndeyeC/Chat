import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from "@mui/material";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
} from "firebase/firestore";
import { db, auth } from "../services/firebase";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Group as GroupIcon,
  Chat as ChatIcon,
  Person as PersonIcon,
  BarChart as StatsIcon,
  ExitToApp as LogoutIcon,
  Send as SendIcon,
  Forum as ForumIcon,
} from "@mui/icons-material";
import "./user/UserAdmin.css";
;

interface Group {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  members: string[];
  messagesCount?: number;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderUsername: string;
  createdAt: Date;
  groupId: string;
}

interface GroupMessagesProps {
  groupId: string;
  onClose: () => void;
  onDeleteMessage: (messageId: string) => void;
}

const GroupMessages: React.FC<GroupMessagesProps> = ({ groupId, onClose, onDeleteMessage }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const messagesQuery = query(collection(db, "groups", groupId, "messages"));
        const messagesSnapshot = await getDocs(messagesQuery);
        const messagesData = messagesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        })) as Message[];
        
        setMessages(messagesData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [groupId]);

  return (
    <Dialog open={true} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Messages du groupe</DialogTitle>
      <DialogContent>
        {loading ? (
          <Typography>Chargement...</Typography>
        ) : messages.length === 0 ? (
          <Typography>Aucun message dans ce groupe</Typography>
        ) : (
          <List sx={{ maxHeight: '60vh', overflow: 'auto' }}>
            {messages.map((message) => (
              <Paper key={message.id} sx={{ p: 2, mb: 2 }}>
                <Box display="flex" justifyContent="space-between">
                  <Typography fontWeight="bold">{message.senderUsername}</Typography>
                  <IconButton 
                    size="small" 
                    onClick={() => onDeleteMessage(message.id)}
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Typography>{message.text}</Typography>
                <Typography variant="caption" color="textSecondary">
                  {message.createdAt.toLocaleString()}
                </Typography>
              </Paper>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
};

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalGroups: 0,
    activeUsers: 0,
    messagesToday: 0,
    totalMessages: 0,
    totalUsers: 0,
  });

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      // Fetch groups
      const groupsSnapshot = await getDocs(collection(db, "groups"));
      const groupsData = groupsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Group[];
      setGroups(groupsData);

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let messagesCount = 0;
      let todayMessagesCount = 0;

      for (const group of groupsData) {
        const messagesQuery = query(
          collection(db, "groups", group.id, "messages")
        );
        const messagesSnapshot = await getDocs(messagesQuery);
        messagesCount += messagesSnapshot.size;

        const todayMessages = messagesSnapshot.docs.filter((doc) => {
          const msgDate = doc.data().createdAt?.toDate();
          return msgDate && msgDate >= today;
        });
        todayMessagesCount += todayMessages.length;
      }

      // Fetch recent messages (last 5)
      const allMessages: Message[] = [];
      for (const group of groupsData.slice(0, 3)) {
        const messagesQuery = query(
          collection(db, "groups", group.id, "messages")
        );
        const messagesSnapshot = await getDocs(messagesQuery);
        messagesSnapshot.docs.forEach((doc) => {
          allMessages.push({
            id: doc.id,
            groupId: group.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
          } as Message);
        });
      }

      setRecentMessages(
        allMessages
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 5)
      );

      // Get total users count
      const usersSnapshot = await getDocs(collection(db, "users"));
      const totalUsersCount = usersSnapshot.size;

      // Update stats
      setStats({
        totalGroups: groupsData.length,
        activeUsers: groupsData.reduce(
          (acc, group) => acc + (group.members?.length || 0),
          0
        ),
        messagesToday: todayMessagesCount,
        totalMessages: messagesCount,
        totalUsers: totalUsersCount,
      });
    };

    fetchData();
  }, []);

  const handleAddGroup = async () => {
    if (groupName.trim()) {
      try {
        const newGroup = {
          name: groupName,
          description: groupDescription || "Nouveau groupe",
          createdAt: new Date(),
          members: [],
        };

        const docRef = await addDoc(collection(db, "groups"), newGroup);
        setGroups([...groups, { ...newGroup, id: docRef.id }]);
        setGroupName("");
        setGroupDescription("");
      } catch (error) {
        console.error("Error adding group: ", error);
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
      await updateDoc(doc(db, "groups", editingGroup.id), {
        name: editingGroup.name,
        description: editingGroup.description,
      });

      setGroups(
        groups.map((group) =>
          group.id === editingGroup.id ? editingGroup : group
        )
      );
      setOpenDialog(false);
    } catch (error) {
      console.error("Error updating group: ", error);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await deleteDoc(doc(db, "groups", groupId));
      setGroups(groups.filter((group) => group.id !== groupId));
    } catch (error) {
      console.error("Error deleting group: ", error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedGroupId) return;
    
    try {
      await deleteDoc(doc(db, "groups", selectedGroupId, "messages", messageId));
      // Update recent messages
      setRecentMessages(recentMessages.filter(msg => msg.id !== messageId));
      // You might want to refresh stats here
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  return (
    <Box className="admin-dashboard">
      <Paper className="admin-header">
        <Typography variant="h4" component="h1" gutterBottom>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            gap={2}
          >
            <ForumIcon fontSize="large" />
            Tableau de bord administrateur EduChat
          </Box>
        </Typography>
        <Typography variant="subtitle1">
          Gestion complète des groupes, utilisateurs et conversations
        </Typography>
      </Paper>

      <Box className="admin-actions">
        <Button
          variant="contained"
          startIcon={<GroupIcon />}
          onClick={() => navigate("/admin/groups")}
          className="admin-btn primary-btn"
        >
          Groupes
        </Button>
        <Button
          variant="outlined"
          startIcon={<PersonIcon />}
          onClick={() => navigate("/admin/users")}
          className="admin-btn secondary-btn"
        >
          Utilisateurs
        </Button>
        <Button
          variant="outlined"
          startIcon={<StatsIcon />}
          onClick={() => navigate("/admin/stats")}
          className="admin-btn secondary-btn"
        >
          Statistiques
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          className="admin-btn danger-btn"
        >
          Déconnexion
        </Button>
      </Box>

      <Box className="dashboard-grid">
        {/* Statistiques */}
        <Paper className="dashboard-card">
          <Typography className="card-title">
            <StatsIcon /> Statistiques globales
          </Typography>
          <Box className="stats-grid">
            <Paper className="stat-item">
              <Typography className="stat-value">
                {stats.totalGroups}
              </Typography>
              <Typography className="stat-label">Groupes actifs</Typography>
            </Paper>
            <Paper className="stat-item">
              <Typography className="stat-value">{stats.totalUsers}</Typography>
              <Typography className="stat-label">Utilisateurs</Typography>
            </Paper>
            <Paper className="stat-item">
              <Typography className="stat-value">
                {stats.messagesToday}
              </Typography>
              <Typography className="stat-label">
                Messages aujourd'hui
              </Typography>
            </Paper>
            <Paper className="stat-item">
              <Typography className="stat-value">
                {stats.totalMessages}
              </Typography>
              <Typography className="stat-label">Messages total</Typography>
            </Paper>
          </Box>
        </Paper>

        {/* Derniers messages */}
        <Paper className="dashboard-card">
          <Typography className="card-title">
            <ChatIcon /> Activité récente
          </Typography>
          <Box className="message-list">
            {recentMessages.length > 0 ? (
              recentMessages.map((message) => (
                <Box key={message.id} className="message-item">
                  <Typography className="message-user">
                    {message.senderUsername}
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{ ml: 1 }}
                    >
                      dans{" "}
                      {groups.find((g) => g.id === message.groupId)?.name ||
                        "Groupe"}
                    </Typography>
                  </Typography>
                  <Typography className="message-content">
                    {message.text}
                  </Typography>
                  <Typography className="message-time">
                    {message.createdAt.toLocaleTimeString()} -{" "}
                    {message.createdAt.toLocaleDateString()}
                  </Typography>
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="textSecondary">
                Aucune activité récente
              </Typography>
            )}
          </Box>
        </Paper>

        {/* Création de groupe */}
        <Paper className="dashboard-card">
          <Typography className="card-title">
            <SendIcon /> Créer un groupe
          </Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              label="Nom du groupe"
              fullWidth
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
              variant="outlined"
              size="small"
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              variant="outlined"
              size="small"
            />
            <Button
              variant="contained"
              onClick={handleAddGroup}
              className="admin-btn primary-btn"
              fullWidth
            >
              Créer le groupe
            </Button>
          </Box>
        </Paper>

        {/* Liste des groupes */}
        <Paper className="dashboard-card">
          <Typography className="card-title">
            <GroupIcon /> Groupes existants ({groups.length})
          </Typography>
          <List sx={{ maxHeight: 300, overflow: "auto" }}>
            {groups.length > 0 ? (
              groups.map((group) => (
                <React.Fragment key={group.id}>
                  <ListItem
                    secondaryAction={
                      <Box>
                        <IconButton
                          edge="end"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditGroup(group);
                          }}
                          sx={{ color: "#4f46e5" }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          edge="end"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteGroup(group.id);
                          }}
                          sx={{ color: "#ef4444" }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    }
                    onClick={() => setSelectedGroupId(group.id)}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'action.hover' }
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography fontWeight={600}>
                          {group.name}
                          <Typography
                            component="span"
                            variant="caption"
                            sx={{ ml: 1 }}
                          >
                            ({group.members?.length || 0} membres)
                          </Typography>
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography variant="body2">
                            {group.description}
                          </Typography>
                          <Typography variant="caption">
                            Créé le {group.createdAt.toLocaleDateString()}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))
            ) : (
              <Typography variant="body2" color="textSecondary">
                Aucun groupe disponible
              </Typography>
            )}
          </List>
        </Paper>
      </Box>

      {/* Dialog pour l'édition de groupe */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Modifier le groupe</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={2}>
            <TextField
              autoFocus
              label="Nom du groupe"
              fullWidth
              value={editingGroup?.name || ""}
              onChange={(e) =>
                editingGroup &&
                setEditingGroup({
                  ...editingGroup,
                  name: e.target.value,
                })
              }
              variant="outlined"
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={editingGroup?.description || ""}
              onChange={(e) =>
                editingGroup &&
                setEditingGroup({
                  ...editingGroup,
                  description: e.target.value,
                })
              }
              variant="outlined"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenDialog(false)}
            className="admin-btn secondary-btn"
          >
            Annuler
          </Button>
          <Button onClick={handleUpdateGroup} className="admin-btn primary-btn">
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog pour les messages du groupe */}
      {selectedGroupId && (
        <GroupMessages
          groupId={selectedGroupId}
          onClose={() => setSelectedGroupId(null)}
          onDeleteMessage={handleDeleteMessage}
        />
      )}
    </Box>
  );
};

export default AdminPage;