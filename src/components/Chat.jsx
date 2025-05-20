import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { Box, TextField, Button, List, ListItem, ListItemText, Typography } from '@mui/material';

const Chat = ({ groupId, name }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

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

      // Scroll automatique en bas quand les messages changent
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });

    return () => unsubscribe();
  }, [groupId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await addDoc(collection(db, 'groups', groupId, 'messages'), {
        text: newMessage,
        sender: name || 'Anonyme',
        createdAt: Timestamp.now()
      });
      setNewMessage('');
    } catch (error) {
      console.error('Erreur lors de l’envoi du message :', error);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Discussion du groupe</Typography>

      <List sx={{ maxHeight: 400, overflowY: 'auto', mb: 2 }}>
        {messages.map(msg => (
          <ListItem key={msg.id}>
            <ListItemText
              primary={msg.text}
              secondary={`${msg.sender} • ${msg.createdAt?.toDate().toLocaleString() || ''}`}
            />
          </ListItem>
        ))}
        <div ref={messagesEndRef}></div>
      </List>

      <Box display="flex" gap={2}>
        <TextField
          fullWidth
          placeholder="Écris un message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <Button variant="contained" onClick={handleSendMessage}>Envoyer</Button>
      </Box>
    </Box>
  );
};

export default Chat;
