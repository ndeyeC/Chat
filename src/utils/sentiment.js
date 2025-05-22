export async function analyzeMessage(message) {
  try {
    console.log("Envoi au backend:", message);
    const response = await fetch('http://localhost:5000/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    const data = await response.json();
    console.log("Réponse du backend:", data);
    
    // Ajouter des logs pour débugger
    console.log("Type de data:", typeof data);
    console.log("Contenu complet de data:", JSON.stringify(data));
    console.log("data.sentiment:", data.sentiment);
    
    // Vérifier que data.sentiment existe
    if (data && data.sentiment) {
      console.log("Sentiment extrait:", data.sentiment);
      return data.sentiment;
    } else {
      console.error("Pas de propriété sentiment dans la réponse:", data);
      return 'neutral';
    }
  } catch (error) {
    console.error('Erreur analyse sentiment:', error);
    return 'neutral';
  }
}