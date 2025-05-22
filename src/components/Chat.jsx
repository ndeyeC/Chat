import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../services/firebase';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  deleteDoc,
  doc,
  getDoc
} from 'firebase/firestore';
import styles from './Chat.module.css';
import { Avatar, Button, TextField, IconButton, CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

const Chat = ({ groupId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const messagesContainerRef = useRef(null);
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setCurrentUserData(userDoc.data());
          }
        } catch (error) {
          console.error("Erreur lors de la récupération des données utilisateur:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!groupId) return;

    const q = query(
      collection(db, 'groups', groupId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [groupId]);


  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = container;
        setShowScrollButton(scrollTop < scrollHeight - clientHeight - 100);
      };

      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);
useEffect(() => {
  if (!loading && messages.length > 0) {
    scrollToBottom();
  }
}, [loading, messages]);

  useEffect(() => {
    if (!groupId) return;

    const fetchGroup = async () => {
      try {
        const groupDoc = await getDoc(doc(db, 'groups', groupId));
        if (groupDoc.exists()) {
          setGroup({ id: groupDoc.id, ...groupDoc.data() });
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchGroup();
  }, [groupId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUserData) return;

    const messageToSend = newMessage;
    setNewMessage('');

    try {
      await addDoc(collection(db, 'groups', groupId, 'messages'), {
        text: messageToSend,
        senderId: auth.currentUser?.uid,
        senderUsername: currentUserData.username,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      console.error("Erreur lors de l'envoi du message :", error);
      setNewMessage(messageToSend);
    }
  };

  const handleGoBack = () => {
    navigate('/');
  };

  const handleLeaveGroup = async () => {
    if (!auth.currentUser) return;

    try {
      const userGroupRef = doc(db, 'userGroups', `${auth.currentUser.uid}_${groupId}`);
      await deleteDoc(userGroupRef);
      navigate('/');
    } catch (error) {
      console.error('Erreur lors de la sortie du groupe :', error);
    }
  };

  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  };

  const handleScrollButtonClick = () => {
    scrollToBottom();
  };

  const formatDateLabel = (date) => {
    const today = new Date();
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diff = (now - d) / (1000 * 60 * 60 * 24);

    if (diff === 0) return 'Aujourd\'hui';
    if (diff === 1) return 'Hier';
    if (diff === 2) return 'Avant-hier';
    return `${date.getDate().toString().padStart(2, '0')} - ${String(date.getMonth() + 1).padStart(2, '0')} - ${date.getFullYear()}`;
  };

  const groupMessagesByDate = (messages) => {
    const grouped = {};
    messages.forEach(msg => {
      const date = msg.createdAt?.toDate();
      const dateKey = date.toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(msg);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <CircularProgress />
      </div>
    );
  }

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className={styles.chatContainer}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <IconButton onClick={handleGoBack} className={styles.backButton}>
            <ArrowBackIcon />
          </IconButton>
          <h2 className={styles.groupTitle}>Groupe : {group?.name || '...'}</h2>
        </div>
        <div className={styles.userInfo}>
          <span>{currentUserData?.username || 'Utilisateur'}</span>
        </div>
        <Button
          variant="outlined"
          color="secondary"
          onClick={handleLeaveGroup}
        >
          Quitter le groupe
        </Button>
      </div>

      <div className={styles.messagesList} ref={messagesContainerRef}>
        {Object.keys(groupedMessages).map(dateKey => {
          const date = new Date(dateKey);
          const label = formatDateLabel(date);
          return (
            <div key={dateKey}>
              <div className={styles.dateLabel}>{label}</div>
              {groupedMessages[dateKey].map(msg => {
                const isCurrentUser = msg.senderId === auth.currentUser?.uid;
                const displayUsername = isCurrentUser ? 'Vous' : msg.senderUsername || 'Anonyme';
                const avatarLetter = displayUsername.charAt(0).toUpperCase();

                return (
                  <div
                    key={msg.id}
                    className={`${styles.messageItem} ${isCurrentUser ? styles.currentUser : styles.otherUser}`}
                  >
                    {!isCurrentUser && (
                      <Avatar sx={{ width: 32, height: 32, mr: 1 }}>
                        {avatarLetter}
                      </Avatar>
                    )}
                    <div className={styles.messageContent}>
                      {!isCurrentUser && (
                        <span className={styles.senderName}>{displayUsername}</span>
                      )}
                      <div className={styles.messageBubble}>
                        {msg.text}
                        <div className={styles.messageTime}>
                          {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || ''}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {showScrollButton && (
        <IconButton
          onClick={handleScrollButtonClick}
          className={styles.scrollToBottomButton}
          color="primary"
          aria-label="Descendre jusqu'en bas"
          size="large"
        >
          <ArrowDownwardIcon />
        </IconButton>
      )}

      <div className={styles.inputArea}>
        <TextField
          className={styles.messageInput}
          fullWidth
          variant="standard"
          placeholder="Écrire un message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <Button
          className={styles.sendButton}
          variant="contained"
          color="primary"
          onClick={handleSendMessage}
          disabled={!newMessage.trim()}
        >
          <SendIcon />
        </Button>
      </div>
    </div>
  );
};

export default Chat;
