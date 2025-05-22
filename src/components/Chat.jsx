import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { Box, TextField, Button, List, ListItem, ListItemText, Typography } from '@mui/material';
import positiveSticker from '../assets/stickers/positive.png';
import neutralSticker from '../assets/stickers/neutral.png';
import negativeSticker from '../assets/stickers/negative.png';

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
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(msgs);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });

    return () => unsubscribe();
  }, [groupId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      console.log("Envoi au backend:", newMessage);
      
      const response = await fetch('http://localhost:5000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage }),
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log("Réponse du backend:", data);
      
      const sentiment = data.sentiment;
      console.log("Sentiment déterminé:", sentiment);

      // Mapping des stickers
      const stickerMap = {
        positive: positiveSticker,
        negative: negativeSticker,
        neutral: neutralSticker
      };

      await addDoc(collection(db, 'groups', groupId, 'messages'), {
        text: newMessage,
        sender: name || 'Anonyme',
        createdAt: Timestamp.now(),
        sentiment,
        sticker: stickerMap[sentiment],
        debugData: data // Optionnel pour le débogage
      });

      setNewMessage('');
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      
      // Fallback avec message neutre
      await addDoc(collection(db, 'groups', groupId, 'messages'), {
        text: newMessage,
        sender: name || 'Anonyme',
        createdAt: Timestamp.now(),
        sentiment: 'neutral',
        sticker: neutralSticker,
        error: error.message
      });
      
      setNewMessage('');
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Discussion du groupe
      </Typography>

      <List sx={{ maxHeight: '60vh', overflowY: 'auto', mb: 2, bgcolor: 'background.paper' }}>
        {messages.map((msg) => (
          <ListItem key={msg.id} alignItems="flex-start">
            <ListItemText
              primary={
                <>
                  <Typography component="span" fontWeight="bold">
                    {msg.sender}: 
                  </Typography>
                  {' ' + msg.text}
                  {msg.sticker && (
                    <img 
                      src={msg.sticker} 
                      alt="sticker" 
                      style={{ width: 30, marginLeft: 10, verticalAlign: 'middle' }} 
                    />
                  )}
                </>
              }
              secondary={
                msg.createdAt?.toDate().toLocaleString() || ''
              }
              sx={{ wordBreak: 'break-word' }}
            />
          </ListItem>
        ))}
        <div ref={messagesEndRef} />
      </List>

      <Box display="flex" gap={2} alignItems="center">
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder="Écrivez un message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <Button 
          variant="contained" 
          onClick={handleSendMessage}
          disabled={!newMessage.trim()}
        >
          Envoyer
        </Button>
      </Box>
    </Box>
  );
};

export default Chat;