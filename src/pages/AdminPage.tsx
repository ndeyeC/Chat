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
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  Snackbar,
  Alert,
  Badge
} from "@mui/material";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit
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
  Mood as PositiveIcon,
  MoodBad as NegativeIcon,
  SentimentNeutral as NeutralIcon,
  Warning as WarningIcon
} from "@mui/icons-material";
import "./user/UserAdmin.css";

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
  sentiment?: string;
}

interface GroupMessagesProps {
  groupId: string;
  onClose: () => void;
  onDeleteMessage: (messageId: string) => void;
  filter?: 'all' | 'positive' | 'negative';
}

type SentimentType = 'positif' | 'négatif' | 'neutre';
type SnackbarSeverity = 'success' | 'error' | 'warning' | 'info';

interface SentimentStats {
  positif: number;
  négatif: number;
  neutre: number;
}

class FrenchSentimentAnalyzer {
  private lexicon: { [key: string]: number };
  private negations: string[];
  private intensifiers: { [key: string]: number };

  constructor() {
    this.lexicon = {
      'super': 3.5, 'génial': 4.0, 'excellent': 4.2, 'parfait': 4.1,
      'content': 3.3, 'heureux': 3.7, 'bon': 2.5, 'bien': 2.0,
      'adorable': 3.8, 'magnifique': 3.9, 'merveilleux': 3.6,
      'cool': 2.8, 'sympa': 2.7, 'top': 3.0,
      'pas': -1.0, 'non': -1.2, 'jamais': -1.5, 'rien': -1.3,
      'déteste': -4.0, 'haine': -4.3, 'mauvais': -2.5, 'mal': -2.0,
      'terrible': -3.8, 'horrible': -3.9, 'nul': -3.0, 'pourri': -3.2,
      'déçu': -2.8, 'triste': -2.5, 'guerre': -4.0,
      'baax': 3.5, 'rafet': 3.8, 'neex': 3.6, 'teranga': 4.2,
      'bonn': -3.5, 'xiif': -3.2, 'yagg': -2.8, 'tàng': -3.6,
      'jamm': 3.7, 'sant': 3.0
    };

    this.negations = ['pas', 'non', 'jamais', 'rien', 'aucun', 'sans', 'ni'];
    this.intensifiers = {
      'très': 1.3, 'vraiment': 1.4, 'trop': 1.2, 'extrêmement': 1.5,
      'complètement': 1.4, 'absolument': 1.3, 'lool': 1.4,
      'hyper': 1.3, 'tellement': 1.2, 'grave': 1.1
    };
  }

  analyze(text: string): SentimentType {
    if (!text || typeof text !== 'string') return 'neutre';

    const words = text.toLowerCase().match(/\b[\w+]+\b/g) || [];
    let score = 0;
    let wordCount = 0;
    let negation = false;
    let intensity = 1;

    words.forEach((word) => {
      if (this.negations.includes(word)) {
        negation = true;
        return;
      }

      if (this.intensifiers[word]) {
        intensity *= this.intensifiers[word];
        return;
      }

      if (this.lexicon[word]) {
        let wordScore = this.lexicon[word];
        if (negation) {
          wordScore *= -0.7;
          negation = false;
        }
        score += wordScore;
        wordCount++;
      }
    });

    if (wordCount > 0) {
      score = (score / wordCount) * intensity;
    } else {
      if (text.length > 30) return 'neutre';
      if (/(!{2,}|[A-Z]{3,})/.test(text)) return 'positif';
      if (/\.{3,}/.test(text)) return 'négatif';
      return 'neutre';
    }

    if (score >= 0.5) return 'positif';
    if (score <= -0.5) return 'négatif';
    return 'neutre';
  }
}

const GroupMessages: React.FC<GroupMessagesProps> = ({ 
  groupId, 
  onClose, 
  onDeleteMessage,
  filter = 'all'
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const analyzer = new FrenchSentimentAnalyzer();

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const messagesQuery = query(
          collection(db, "groups", groupId, "messages"),
          orderBy("createdAt", "desc")
        );
        const messagesSnapshot = await getDocs(messagesQuery);
        const messagesData = messagesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          sentiment: doc.data().sentiment || analyzer.analyze(doc.data().text)
        })) as Message[];
        
        setMessages(messagesData);
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [groupId]);

  // CORRECTION DU FILTRAGE
  const filteredMessages = messages.filter(msg => {
    if (filter === 'all') return true;
    
    // Mapper les filtres anglais vers les sentiments français
    const sentimentMap = {
      'positive': 'positif',
      'negative': 'négatif'
    };
    
    const expectedSentiment = sentimentMap[filter as keyof typeof sentimentMap];
    return msg.sentiment === expectedSentiment;
  });

  const getSentimentColor = (sentiment: string) => {
    switch(sentiment) {
      case 'positif': return 'success.main';
      case 'négatif': return 'error.main';
      default: return 'text.secondary';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch(sentiment) {
      case 'positif': return <PositiveIcon fontSize="small" />;
      case 'négatif': return <NegativeIcon fontSize="small" />;
      default: return <NeutralIcon fontSize="small" />;
    }
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Messages du groupe {filter !== 'all' && `(${filter === 'positive' ? 'Positifs' : 'Négatifs'})`}
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : filteredMessages.length === 0 ? (
          <Typography variant="body1" p={2}>
            Aucun s message {filter !== 'all' ? filter === 'positive' ? 'positif' : 'négatif' : ''} dans ce groupe
          </Typography>
        ) : (
          <List sx={{ maxHeight: '60vh', overflow: 'auto' }}>
            {filteredMessages.map((message) => (
              <Paper key={message.id} sx={{ p: 2, mb: 2 }}>
                <Box display="flex" justifyContent="space-between">
                  <Typography fontWeight="bold">{message.senderUsername}</Typography>
                  <Box display="flex" alignItems="center">
                    <Chip
                      icon={getSentimentIcon(message.sentiment || 'neutre')}
                      label={message.sentiment}
                      size="small"
                      sx={{ 
                        mr: 1,
                        color: getSentimentColor(message.sentiment || 'neutre'),
                        borderColor: getSentimentColor(message.sentiment || 'neutre')
                      }}
                      variant="outlined"
                    />
                    <IconButton 
                      size="small" 
                      onClick={() => onDeleteMessage(message.id)}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                <Typography sx={{ mt: 1 }}>{message.text}</Typography>
                <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
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
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'positive' | 'negative'>('all');
  const [stats, setStats] = useState({
    totalGroups: 0,
    activeUsers: 0,
    messagesToday: 0,
    totalMessages: 0,
    totalUsers: 0,
    positiveMessages: 0,
    negativeMessages: 0,
    neutralMessages: 0
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as SnackbarSeverity
  });
  const analyzer = new FrenchSentimentAnalyzer();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      showSnackbar("Erreur lors de la déconnexion", "error");
    }
  };

  const showSnackbar = (message: string, severity: SnackbarSeverity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
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
        let positiveCount = 0;
        let negativeCount = 0;
        let neutralCount = 0;

        // Fetch recent messages (last 20)
        const allMessages: Message[] = [];
        for (const group of groupsData.slice(0, 5)) {
          const messagesQuery = query(
            collection(db, "groups", group.id, "messages"),
            orderBy("createdAt", "desc"),
            limit(20)
          );
          const messagesSnapshot = await getDocs(messagesQuery);
          messagesSnapshot.docs.forEach((doc) => {
            const message = {
              id: doc.id,
              groupId: group.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate() || new Date(),
            } as Message;
            
            // Analyze sentiment if not already set
            if (!message.sentiment) {
              message.sentiment = analyzer.analyze(message.text);
            }
            
            // Count sentiments
            switch(message.sentiment) {
              case 'positif': positiveCount++; break;
              case 'négatif': negativeCount++; break;
              default: neutralCount++;
            }
            
            allMessages.push(message);
          });
          messagesCount += messagesSnapshot.size;

          const todayMessages = messagesSnapshot.docs.filter((doc) => {
            const msgDate = doc.data().createdAt?.toDate();
            return msgDate && msgDate >= today;
          });
          todayMessagesCount += todayMessages.length;
        }

        setRecentMessages(allMessages);

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
          positiveMessages: positiveCount,
          negativeMessages: negativeCount,
          neutralMessages: neutralCount
        });
      } catch (error) {
        console.error("Error fetching data:", error);
        showSnackbar("Erreur lors du chargement des données", "error");
      }
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
        showSnackbar("Groupe créé avec succès", "success");
      } catch (error) {
        console.error("Error adding group: ", error);
        showSnackbar("Erreur lors de la création du groupe", "error");
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
      showSnackbar("Groupe mis à jour avec succès", "success");
    } catch (error) {
      console.error("Error updating group: ", error);
      showSnackbar("Erreur lors de la mise à jour du groupe", "error");
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await deleteDoc(doc(db, "groups", groupId));
      setGroups(groups.filter((group) => group.id !== groupId));
      showSnackbar("Groupe supprimé avec succès", "success");
    } catch (error) {
      console.error("Error deleting group: ", error);
      showSnackbar("Erreur lors de la suppression du groupe", "error");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedGroupId) return;
    
    try {
      await deleteDoc(doc(db, "groups", selectedGroupId, "messages", messageId));
      setRecentMessages(recentMessages.filter(msg => msg.id !== messageId));
      showSnackbar("Message supprimé avec succès", "success");
    } catch (error) {
      console.error("Error deleting message:", error);
      showSnackbar("Erreur lors de la suppression du message", "error");
    }
  };

  const handleViewGroupMessages = (groupId: string, filter: 'all' | 'positive' | 'negative' = 'all') => {
    setSelectedGroupId(groupId);
    setSelectedFilter(filter);
  };

  const getSentimentStats = (messages: Message[]): SentimentStats => {
    const stats: SentimentStats = {
      positif: 0,
      négatif: 0,
      neutre: 0
    };

    messages.forEach(msg => {
      const sentiment = msg.sentiment || analyzer.analyze(msg.text);
      if (sentiment in stats) {
        stats[sentiment as keyof SentimentStats]++;
      }
    });

    return stats;
  };

  const recentSentimentStats = getSentimentStats(recentMessages);

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
          onClick={() => setActiveTab('groups')}
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
          onClick={() => setActiveTab('sentiment')}
          className="admin-btn secondary-btn"
        >
          Analyse des sentiments
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

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          aria-label="onglets admin"
        >
          <Tab label="Tableau de bord" value="dashboard" />
          <Tab label="Analyse des sentiments" value="sentiment" />
          <Tab label="Gestion des groupes" value="groups" />
        </Tabs>
      </Box>

      {activeTab === 'dashboard' && (
        <Box className="dashboard-grid">
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
              <Paper className="stat-item" sx={{ bgcolor: 'success.light' }}>
                <Typography className="stat-value">
                  {stats.positiveMessages}
                </Typography>
                <Typography className="stat-label">Messages positifs</Typography>
              </Paper>
              <Paper className="stat-item" sx={{ bgcolor: 'error.light' }}>
                <Typography className="stat-value">
                  {stats.negativeMessages}
                </Typography>
                <Typography className="stat-label">Messages négatifs</Typography>
              </Paper>
            </Box>
          </Paper>

          <Paper className="dashboard-card">
            <Typography className="card-title">
              <ChatIcon /> Activité récente
            </Typography>
            <Box className="message-list">
              {recentMessages.length > 0 ? (
                recentMessages.slice(0, 5).map((message) => (
                  <Box key={message.id} className="message-item">
                    <Box display="flex" justifyContent="space-between">
                      <Typography className="message-user">
                        {message.senderUsername}
                        <Typography component="span" variant="caption" sx={{ ml: 1 }}>
                          dans {groups.find((g) => g.id === message.groupId)?.name || "Groupe"}
                        </Typography>
                      </Typography>
                      <Chip
                        size="small"
                        label={message.sentiment}
                        color={message.sentiment === 'positif' ? 'success' : message.sentiment === 'négatif' ? 'error' : 'default'}
                        variant="outlined"
                      />
                    </Box>
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
                disabled={!groupName.trim()}
              >
                Créer le groupe
              </Button>
            </Box>
          </Paper>
        </Box>
      )}

      {activeTab === 'sentiment' && (
        <Box className="dashboard-grid">
          <Paper className="dashboard-card">
            <Typography className="card-title">
              Analyse des sentiments
            </Typography>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Répartition des sentiments
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Paper sx={{ p: 2, flex: 1, bgcolor: 'success.light' }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <PositiveIcon />
                    <Typography variant="h6">{recentSentimentStats.positif}</Typography>
                  </Box>
                  <Typography variant="body2">Messages positifs</Typography>
                </Paper>
                <Paper sx={{ p: 2, flex: 1, bgcolor: 'error.light' }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <NegativeIcon />
                    <Typography variant="h6">{recentSentimentStats.négatif}</Typography>
                  </Box>
                  <Typography variant="body2">Messages négatifs</Typography>
                </Paper>
                <Paper sx={{ p: 2, flex: 1, bgcolor: 'grey.300' }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <NeutralIcon />
                    <Typography variant="h6">{recentSentimentStats.neutre}</Typography>
                  </Box>
                  <Typography variant="body2">Messages neutres</Typography>
                </Paper>
              </Box>

              <Typography variant="h6" gutterBottom>
                Messages nécessitant attention
              </Typography>
              <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                {recentMessages
                  .filter(msg => (msg.sentiment || analyzer.analyze(msg.text)) === 'négatif')
                  .slice(0, 10)
                  .map(message => (
                    <ListItem 
                      key={message.id} 
                      sx={{ 
                        borderBottom: 1, 
                        borderColor: 'divider',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                    >
                      <ListItemText
                        primary={message.text}
                        secondary={
                          <>
                            <Typography component="span" sx={{ display: 'block' }}>
                              {message.senderUsername} - {groups.find(g => g.id === message.groupId)?.name}
                            </Typography>
                            <Typography component="span" variant="caption">
                              {message.createdAt.toLocaleString()}
                            </Typography>
                          </>
                        }
                      />
                      <Button
                        size="small"
                        onClick={() => handleViewGroupMessages(message.groupId, 'negative')}
                      >
                        Voir dans le groupe
                      </Button>
                    </ListItem>
                  ))}
                {recentMessages.filter(msg => (msg.sentiment || analyzer.analyze(msg.text)) === 'négatif').length === 0 && (
                  <Typography variant="body2" color="textSecondary" sx={{ p: 2 }}>
                    Aucun message négatif récent
                  </Typography>
                )}
              </List>
            </Box>
          </Paper>

          <Paper className="dashboard-card">
            <Typography className="card-title">
              Groupes avec messages négatifs
            </Typography>
            <List sx={{ maxHeight: '60vh', overflow: 'auto' }}>
              {groups
                .filter(group => {
                  const groupMessages = recentMessages.filter(msg => msg.groupId === group.id);
                  return groupMessages.some(msg => (msg.sentiment || analyzer.analyze(msg.text)) === 'négatif');
                })
                .map(group => (
                  <ListItem 
                    key={group.id}
                    secondaryAction={
                      <Box>
                        <Button
                          size="small"
                          onClick={() => handleViewGroupMessages(group.id, 'all')}
                          sx={{ mr: 1 }}
                        >
                          Tous
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => handleViewGroupMessages(group.id, 'negative')}
                          startIcon={<WarningIcon />}
                        >
                          Négatifs
                        </Button>
                      </Box>
                    }
                  >
                    <ListItemText
                      primary={group.name}
                      secondary={`${group.members?.length || 0} membres`}
                    />
                  </ListItem>
                ))}
              {groups.filter(group => {
                const groupMessages = recentMessages.filter(msg => msg.groupId === group.id);
                return groupMessages.some(msg => (msg.sentiment || analyzer.analyze(msg.text)) === 'négatif');
              }).length === 0 && (
                <Typography variant="body2" color="textSecondary" sx={{ p: 2 }}>
                  Aucun groupe avec des messages négatifs
                </Typography>
              )}
            </List>
          </Paper>
        </Box>
      )}

      {activeTab === 'groups' && (
        <Paper className="dashboard-card">
          <Typography className="card-title">
            <GroupIcon /> Groupes existants ({groups.length})
          </Typography>
          <List sx={{ maxHeight: '70vh', overflow: "auto" }}>
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
                    onClick={() => handleViewGroupMessages(group.id)}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'action.hover' }
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography fontWeight={600}>
                            {group.name}
                          </Typography>
                          <Typography
                            component="span"
                            variant="caption"
                            sx={{ ml: 1 }}
                          >
                            ({group.members?.length || 0} membres)
                          </Typography>
                        </Box>
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
              <Typography variant="body2" color="textSecondary" sx={{ p: 2 }}>
                Aucun groupe disponible
              </Typography>
            )}
          </List>
        </Paper>
      )}

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
          <Button 
            onClick={handleUpdateGroup} 
            className="admin-btn primary-btn"
            disabled={!editingGroup?.name.trim()}
          >
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
          filter={selectedFilter}
        />
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminPage;