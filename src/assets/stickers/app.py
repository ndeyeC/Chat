from flask import Flask, request, jsonify
from flask_cors import CORS
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import re
import logging
from textblob import TextBlob
from googletrans import Translator

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

analyzer = SentimentIntensityAnalyzer()
translator = Translator()

# Lexiques de base (seulement les mots essentiels)
FRENCH_LEXICON = {
    # Mots très courants seulement
    'pas': -1.0, 'non': -1.2, 'jamais': -1.5, 'rien': -1.3,
    'super': 3.5, 'génial': 4.0, 'excellent': 4.2, 'parfait': 4.1,
    'déteste': -4.0, 'adore': 4.0, 'hais': -4.3, 'content': 3.3,
}

WOLOF_LEXICON = {
    'baax': 3.5, 'rafet': 3.8, 'neex': 3.6, 'teranga': 4.2,
    'bon': -3.5, 'xiif': -3.2, 'yagg': -2.8, 'tàng': -3.6,
}

analyzer.lexicon.update(FRENCH_LEXICON)
analyzer.lexicon.update(WOLOF_LEXICON)

class SmartSentimentAnalyzer:
    def __init__(self):
        self.negation_words = [
            'pas', 'non', 'jamais', 'rien', 'aucun', 'personne', 
            'nulle', 'point', 'guère', 'déet', 'deedeet'
        ]
        
        self.intensifiers = {
            # Français
            'très': 1.5, 'vraiment': 1.4, 'super': 1.3, 'hyper': 1.4,
            'trop': 1.2, 'vraiment': 1.4, 'complètement': 1.6,
            'totalement': 1.5, 'extrêmement': 1.7, 'énormément': 1.6,
            
            # Wolof
            'lool': 1.4,  # très/beaucoup
            'bu bees': 1.3,  # beaucoup
            'bari': 1.2,  # vraiment
        }
        
        # Patterns émotionnels universels (peu importe la langue)
        self.emotional_patterns = [
            r'[!]{2,}',  # !! ou plus = intensité
            r'[?]{2,}',  # ?? = confusion/frustration
            r'[.]{3,}',  # ... = tristesse/déception
            r'[A-Z]{3,}', # MAJUSCULES = crier
            r'[:;][)(\]\[]', # smileys basiques
            r'haha|hihi|lol|mdr|ptdr', # rires
            r'[aeiou]\1{2,}', # voyelles répétées (aaah, ooooh)
        ]

    def detect_negation_context(self, text, word_pos):
        """Détecte si un mot est dans un contexte de négation"""
        words = text.lower().split()
        
        # Cherche une négation dans les 3 mots précédents
        start = max(0, word_pos - 3)
        context = words[start:word_pos]
        
        for neg in self.negation_words:
            if neg in context:
                return True
        return False

    def calculate_emotional_intensity(self, text):
        """Calcule l'intensité émotionnelle basée sur des patterns universels"""
        intensity = 1.0
        text_lower = text.lower()
        
        # Répétitions de lettres (ex: "suuuper", "noooon")
        repeated_letters = len(re.findall(r'([a-z])\1{2,}', text_lower))
        intensity += repeated_letters * 0.3
        
        # Ponctuation expressive
        exclamations = len(re.findall(r'[!]{1,}', text))
        intensity += min(exclamations * 0.2, 1.0)
        
        # Majuscules (crier)
        caps_ratio = sum(1 for c in text if c.isupper()) / max(len(text), 1)
        if caps_ratio > 0.3:
            intensity += caps_ratio
        
        # Émojis et expressions (approximation)
        emotive_patterns = len(re.findall(r'[:;][)(\]\[]|haha|hihi|lol|mdr', text_lower))
        intensity += emotive_patterns * 0.2
        
        return min(intensity, 3.0)  # Cap à 3x

    def apply_intensifiers(self, text, base_score):
        """Applique les intensificateurs trouvés dans le texte"""
        words = text.lower().split()
        total_boost = 1.0
        
        for word in words:
            if word in self.intensifiers:
                total_boost *= self.intensifiers[word]
                logger.debug(f"Intensificateur détecté: {word} -> {self.intensifiers[word]}")
        
        return base_score * min(total_boost, 2.5)  # Cap à 2.5x

    def translate_and_analyze(self, text):
        """Traduit vers l'anglais si nécessaire et analyse"""
        try:
            # Détecte la langue
            detected = translator.detect(text)
            logger.debug(f"Langue détectée: {detected.lang} (confiance: {detected.confidence})")
            
            if detected.lang not in ['en', 'fr'] and detected.confidence > 0.7:
                # Traduit vers l'anglais pour VADER
                translated = translator.translate(text, dest='en').text
                logger.debug(f"Traduction: {text} -> {translated}")
                
                # Analyse la traduction
                translated_score = analyzer.polarity_scores(translated)['compound']
                return translated_score, f"Traduit: {translated}"
            
        except Exception as e:
            logger.debug(f"Erreur de traduction: {e}")
        
        return None, None

    def analyze_smart(self, text):
        """Analyse intelligente qui s'adapte au contenu"""
        logger.debug(f"Analyse intelligente de: '{text}'")
        
        # 1. Analyse VADER de base
        base_result = analyzer.polarity_scores(text)
        base_score = base_result['compound']
        
        # 2. Tentative de traduction si langue non reconnue
        translated_score, translation_info = self.translate_and_analyze(text)
        if translated_score is not None:
            base_score = (base_score + translated_score) / 2
        
        # 3. Application des intensificateurs
        intensified_score = self.apply_intensifiers(text, base_score)
        
        # 4. Calcul de l'intensité émotionnelle
        emotional_intensity = self.calculate_emotional_intensity(text)
        
        # 5. Score final
        final_score = intensified_score * emotional_intensity
        
        # 6. Gestion des négations contextuelles 
        words = text.lower().split()
        negation_factor = 1.0
        for i, word in enumerate(words):
            if self.detect_negation_context(text, i):
                negation_factor *= -0.8
        
        final_score *= negation_factor
        
        # Normalisation
        final_score = max(-1.0, min(1.0, final_score))
        
        debug_info = {
            'base_score': base_score,
            'intensified_score': intensified_score,
            'emotional_intensity': emotional_intensity,
            'negation_factor': negation_factor,
            'final_score': final_score,
            'translation_info': translation_info
        }
        
        logger.debug(f"Debug info: {debug_info}")
        
        return final_score, debug_info

smart_analyzer = SmartSentimentAnalyzer()

@app.route('/analyze', methods=['POST'])
def analyze_sentiment():
    try:
        data = request.get_json()
        message = data.get('message', '')
        
        logger.debug(f"\n=== ANALYSE INTELLIGENTE ===")
        logger.debug(f"Message: '{message}'")
        
        # Analyse intelligente
        final_score, debug_info = smart_analyzer.analyze_smart(message)
        
        # Détermination du sentiment avec seuils adaptatifs
        if final_score >= 0.15:
            result = 'positive'
        elif final_score <= -0.15:
            result = 'negative'
        else:
            result = 'neutral'
        
        logger.debug(f"Score final: {final_score:.3f}")
        logger.debug(f"Sentiment: {result}")
        logger.debug("============================")
        
        return jsonify({
            'sentiment': result,
            'score': final_score,
            'debug': debug_info,
            'message': message
        })
        
    except Exception as e:
        logger.error(f"ERREUR: {str(e)}", exc_info=True)
        return jsonify({
            'sentiment': 'neutral',
            'error': str(e)
        }), 500

@app.route('/test', methods=['GET'])
def test_various_messages():
    """Endpoint de test pour différents types de messages"""
    test_messages = [
        "Je suis vraiment déçu de ce résultat",  # Français non codé
        "Mungi xiif lool",  # Wolof intense
        "C'est SUPER GÉNIAL !!!",  # Intensité
        "Noooon pas du tout",  # Négation + répétition
        "¿Cómo estás?",  # Espagnol
        "Ana baax rek",  # Wolof mixte
        "Je suis pas content du tout...",  # Négation complexe
    ]
    
    results = []
    for msg in test_messages:
        score, debug = smart_analyzer.analyze_smart(msg)
        sentiment = 'positive' if score >= 0.15 else 'negative' if score <= -0.15 else 'neutral'
        results.append({
            'message': msg,
            'sentiment': sentiment,
            'score': score,
            'debug': debug
        })
    
    return jsonify({'tests': results})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)