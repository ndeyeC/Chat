import React from 'react';
import { useParams } from 'react-router-dom';
import Chat from '../components/Chat';
import { useAuth } from '../components/auth/AuthContext';

const GroupChatPage = () => {
  const { groupId } = useParams();
  const { currentUser } = useAuth();

  if (!currentUser) return <p>Chargement utilisateur...</p>;

  // ✅ Utilise displayName s’il existe, sinon email
  const name = currentUser.displayName || currentUser.email || "Utilisateur";

  return (
    <div>
      <h2>Groupe : {groupId}</h2>
      <Chat groupId={groupId} name={name} />
    </div>
  );
};

export default GroupChatPage;