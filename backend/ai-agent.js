// ai-agent.js - Agent IA Intelligent pour WhatsApp Sales Bot
const OpenAI = require('openai');
const { getAllProduits, searchProduits, createOrUpdateClient } = require('./airtable');

class AIAgent {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        
        // Mémoire des conversations en cours
        this.conversationHistory = new Map();
        
        // Configuration du modèle
        this.model = 'gpt-4o-mini';
        this.maxTokens = 500;
        this.temperature = 0.7;
        
        // Cache produits pour éviter trop d'appels Airtable
        this.produitsCache = null;
        this.cacheExpiry = null;
    }

    // Prompt système principal avec contexte boutique guinéenne
    getSystemPrompt() {
        return `Tu es Aïcha, l'assistante virtuelle intelligente d'une boutique moderne en Guinée. Tu parles français couramment et tu comprends les expressions locales.

PERSONNALITÉ:
- Chaleureuse, professionnelle et helpful
- Tu connais bien la culture guinéenne
- Tu utilises parfois des expressions comme "Ma sœur", "Mon frère" de manière naturelle
- Tu es patiente et expliques bien les choses

TON RÔLE:
- Aider les clients à découvrir nos produits
- Répondre aux questions sur prix, stock, caractéristiques
- Guider pour passer commande
- Être naturelle dans la conversation (pas robotique)

RÈGLES IMPORTANTES:
1. Réponds TOUJOURS en français, même si on te parle dans une autre langue
2. Sois concise mais complète (max 3-4 phrases par réponse)
3. Si tu ne connais pas une info précise, dis-le honnêtement
4. Pour les commandes, guide étape par étape 
5. Mentionne toujours le stock disponible
6. Utilise les emojis modérément (1-2 par message max)

INFOS BOUTIQUE:
- Nous vendons mode, accessoires, et produits lifestyle
- Paiement: Mobile Money (Orange, MTN, Moov) et espèces
- Livraison possible sur Conakry et environs
- Stock mis à jour en temps réel

Si on te demande des infos que tu n'as pas (livraison précise, garanties spéciales, etc.), dis que tu vas vérifier avec la responsable.`;
    }

    // Récupérer produits avec cache
    async getProduits() {
        const now = Date.now();
        // Cache de 5 minutes pour éviter trop d'appels API
        if (this.produitsCache && this.cacheExpiry && now < this.cacheExpiry) {
            return this.produitsCache;
        }

        try {
            const produits = await getAllProduits();
            this.produitsCache = produits;
            this.cacheExpiry = now + (5 * 60 * 1000); // 5 minutes
            return produits;
        } catch (error) {
            console.error('Erreur récupération produits:', error);
            return [];
        }
    }

    // Formatter la liste des produits pour l'IA
    formatProduitsForAI(produits) {
        if (!produits || produits.length === 0) {
            return "Aucun produit disponible actuellement.";
        }

        return produits.slice(0, 10).map(p => 
            `${p.Name} - ${p.Price} GNF (Stock: ${p.Stock || 0}) - ${p.Category || 'Général'}`
        ).join('\n');
    }

    // Rechercher produits spécifiques
    async rechercherProduits(query) {
        try {
            const resultats = await searchProduits(query);
            return this.formatProduitsForAI(resultats);
        } catch (error) {
            console.error('Erreur recherche produits:', error);
            return "Erreur lors de la recherche. Veuillez réessayer.";
        }
    }

    // Obtenir historique conversation
    getConversationHistory(phoneNumber) {
        if (!this.conversationHistory.has(phoneNumber)) {
            this.conversationHistory.set(phoneNumber, []);
        }
        return this.conversationHistory.get(phoneNumber);
    }

    // Ajouter message à l'historique
    addToHistory(phoneNumber, role, content) {
        const history = this.getConversationHistory(phoneNumber);
        history.push({ role, content, timestamp: Date.now() });
        
        // Garder seulement les 10 derniers messages pour éviter tokens excessifs
        if (history.length > 10) {
            history.splice(0, history.length - 10);
        }
        
        this.conversationHistory.set(phoneNumber, history);
    }

    // Nettoyer historiques anciens (plus de 2h)
    cleanOldConversations() {
        const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
        
        for (const [phone, history] of this.conversationHistory.entries()) {
            const recentMessages = history.filter(msg => msg.timestamp > twoHoursAgo);
            if (recentMessages.length === 0) {
                this.conversationHistory.delete(phone);
            } else {
                this.conversationHistory.set(phone, recentMessages);
            }
        }
    }

    // Détecter si le message demande des informations produits
    async needsProductInfo(message) {
        const keywords = [
            'produit', 'prix', 'stock', 'disponible', 'acheter',
            'commander', 'catalogue', 'robe', 'chaussure', 'sac',
            'combien', 'coûte', 'cherche', 'trouve', 'voir'
        ];
        
        const messageLower = message.toLowerCase();
        return keywords.some(keyword => messageLower.includes(keyword));
    }

    // Fonction principale pour traiter un message
    async processMessage(message, phoneNumber, senderName = '') {
        try {
            // Nettoyer les vieilles conversations
            this.cleanOldConversations();

            // Enregistrer le client si nouveau
            if (senderName) {
                await createOrUpdateClient(senderName, phoneNumber);
            }

            // Ajouter message utilisateur à l'historique
            this.addToHistory(phoneNumber, 'user', message);

            // Préparer le contexte avec produits si nécessaire
            let productContext = '';
            if (await this.needsProductInfo(message)) {
                const produits = await this.getProduits();
                productContext = `\n\nPRODUITS DISPONIBLES:\n${this.formatProduitsForAI(produits)}`;
            }

            // Construire les messages pour OpenAI
            const history = this.getConversationHistory(phoneNumber);
            const messages = [
                { 
                    role: 'system', 
                    content: this.getSystemPrompt() + productContext 
                },
                ...history.slice(-6).map(h => ({ // Derniers 6 messages seulement
                    role: h.role, 
                    content: h.content 
                }))
            ];

            // Appel à OpenAI
            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages: messages,
                max_tokens: this.maxTokens,
                temperature: this.temperature,
            });

            const aiResponse = response.choices[0].message.content.trim();

            // Ajouter réponse IA à l'historique
            this.addToHistory(phoneNumber, 'assistant', aiResponse);

            return aiResponse;

        } catch (error) {
            console.error('Erreur AI Agent:', error);
            
            // Fallback vers réponses basiques si erreur IA
            return this.getFallbackResponse(message);
        }
    }

    // Réponses de secours si l'IA ne fonctionne pas
    getFallbackResponse(message) {
        const messageLower = message.toLowerCase();
        
        if (messageLower.includes('bonjour') || messageLower.includes('salut')) {
            return "Bonjour ! Bienvenue dans notre boutique 😊 Comment puis-je vous aider aujourd'hui ?";
        }
        
        if (messageLower.includes('produit') || messageLower.includes('catalogue')) {
            return "Je consulte nos produits disponibles... Tapez le nom d'un article que vous cherchez (ex: robe, chaussure, sac) !";
        }
        
        if (messageLower.includes('prix')) {
            return "Pour connaître les prix, dites-moi quel produit vous intéresse et je vous donnerai tous les détails !";
        }
        
        return "Je suis là pour vous aider ! Dites-moi ce que vous cherchez ou tapez 'produits' pour voir notre catalogue.";
    }

    // Méthode pour tester la connexion
    async testConnection() {
        try {
            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages: [{ role: 'user', content: 'Bonjour, test de connexion' }],
                max_tokens: 50,
            });
            
            console.log('✅ Connexion OpenAI réussie');
            return true;
        } catch (error) {
            console.error('❌ Erreur connexion OpenAI:', error.message);
            return false;
        }
    }

    // Statistiques d'utilisation
    getStats() {
        return {
            conversationsActives: this.conversationHistory.size,
            cacheStatus: this.produitsCache ? 'Actif' : 'Vide',
            model: this.model
        };
    }
}

module.exports = AIAgent;