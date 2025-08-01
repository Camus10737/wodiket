// ai-agent-groq.js - Agent IA Groq Version Finale
class AIAgentGroq {
    constructor() {
        // Configuration Groq
        this.apiKey = process.env.GROQ_API_KEY;
        this.model = 'llama-3.1-8b-instant';
        this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
        
        // Vérification de la clé
        if (!this.apiKey) {
            throw new Error('GROQ_API_KEY manquante dans .env');
        }
        
        // Mémoire des conversations
        this.conversationHistory = new Map();
        
        // Cache produits simulé (pour éviter les erreurs Airtable)
        this.produitsCache = this.getProduitsMock();
        this.cacheExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24h
    }

    // Produits de démonstration (simulés)
    getProduitsMock() {
        return [
            { Name: "Robe Élégante Africaine", Price: "250000", Stock: 5, Category: "Robes" },
            { Name: "Robe de Soirée", Price: "350000", Stock: 3, Category: "Robes" },
            { Name: "Robe Traditionnelle", Price: "180000", Stock: 8, Category: "Robes" },
            { Name: "Chaussures Talons", Price: "120000", Stock: 10, Category: "Chaussures" },
            { Name: "Sac à Main Cuir", Price: "95000", Stock: 6, Category: "Sacs" },
            { Name: "Bijoux Traditionnels", Price: "75000", Stock: 12, Category: "Bijoux" },
            { Name: "Chemise Femme", Price: "85000", Stock: 15, Category: "Tops" },
            { Name: "Pantalon Élégant", Price: "140000", Stock: 7, Category: "Pantalons" }
        ];
    }

    // Prompt système optimisé
    getSystemPrompt() {
        return `Tu es Aïcha, l'assistante virtuelle chaleureuse d'une boutique moderne en Guinée. Tu parles français couramment.

PERSONNALITÉ:
- Très chaleureuse et accueillante
- Tu utilises "ma sœur", "mon frère" naturellement
- Professionnelle mais décontractée
- Tu aimes recommander et conseiller

TON RÔLE:
- Présenter nos produits avec enthousiasme
- Donner prix et stock précis
- Guider pour les commandes
- Être naturelle dans la conversation

RÈGLES:
1. Réponds TOUJOURS en français
2. Sois concise (2-3 phrases max)
3. Mentionne prix en Francs Guinéens (GNF)
4. Indique le stock disponible
5. Propose des alternatives si besoin
6. Pour commander: demande quantité et coordonnées

BOUTIQUE:
- Mode féminine et accessoires
- Paiement: Orange Money, MTN, Moov, espèces
- Livraison Conakry et environs
- Prix abordables, qualité garantie`;
    }

    // Appel API Groq optimisé
    async callGroqAPI(messages) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: messages,
                    max_tokens: 400,
                    temperature: 0.8,
                    top_p: 1,
                    stream: false
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Groq API Error: ${response.status}\n${errorText}`);
            }

            const data = await response.json();
            return data.choices[0].message.content.trim();

        } catch (error) {
            console.error('❌ Erreur Groq API:', error.message);
            throw error;
        }
    }

    // Récupérer produits (version simplifiée)
    async getProduits() {
        // Utilise le cache de produits mock
        return this.produitsCache;
    }

    // Formatter produits pour l'IA
    formatProduitsForAI(produits) {
        if (!produits || produits.length === 0) {
            return "Aucun produit disponible actuellement.";
        }

        return produits.map(p => 
            `${p.Name} - ${p.Price} GNF (Stock: ${p.Stock}) - ${p.Category}`
        ).join('\n');
    }

    // Rechercher produits par mot-clé
    searchProduits(query) {
        const queryLower = query.toLowerCase();
        return this.produitsCache.filter(p => 
            p.Name.toLowerCase().includes(queryLower) ||
            p.Category.toLowerCase().includes(queryLower)
        );
    }

    // Gestion historique
    getConversationHistory(phoneNumber) {
        if (!this.conversationHistory.has(phoneNumber)) {
            this.conversationHistory.set(phoneNumber, []);
        }
        return this.conversationHistory.get(phoneNumber);
    }

    addToHistory(phoneNumber, role, content) {
        const history = this.getConversationHistory(phoneNumber);
        history.push({ role, content, timestamp: Date.now() });
        
        // Garder 8 derniers messages
        if (history.length > 8) {
            history.splice(0, history.length - 8);
        }
        
        this.conversationHistory.set(phoneNumber, history);
    }

    // Détecter besoin produits
    needsProductInfo(message) {
        const keywords = [
            'produit', 'prix', 'stock', 'disponible', 'acheter',
            'commander', 'catalogue', 'robe', 'chaussure', 'sac',
            'combien', 'coûte', 'cherche', 'trouve', 'voir',
            'bijou', 'pantalon', 'chemise', 'article', 'quoi',
            'suggère', 'recommande', 'montre'
        ];
        
        const messageLower = message.toLowerCase();
        return keywords.some(keyword => messageLower.includes(keyword));
    }

    // Fonction principale optimisée
    async processMessage(message, phoneNumber, senderName = '') {
        try {
            console.log(`🤖 Traitement IA: "${message}"`);

            // Ajouter à l'historique
            this.addToHistory(phoneNumber, 'user', message);

            // Contexte produits si nécessaire
            let productContext = '';
            if (this.needsProductInfo(message)) {
                const produits = await this.getProduits();
                
                // Si recherche spécifique, filtrer
                const motsClés = ['robe', 'chaussure', 'sac', 'bijou', 'pantalon', 'chemise'];
                const motTrouvé = motsClés.find(mot => message.toLowerCase().includes(mot));
                
                if (motTrouvé) {
                    const produitsFiltrés = this.searchProduits(motTrouvé);
                    productContext = `\n\nPRODUITS ${motTrouvé.toUpperCase()}S DISPONIBLES:\n${this.formatProduitsForAI(produitsFiltrés)}`;
                } else if (message.toLowerCase().includes('suggère') || message.toLowerCase().includes('recommande')) {
                    // Recommandations variées
                    const recommandations = produits.slice(0, 4);
                    productContext = `\n\nNOS RECOMMANDATIONS:\n${this.formatProduitsForAI(recommandations)}`;
                } else {
                    productContext = `\n\nPRODUITS DISPONIBLES:\n${this.formatProduitsForAI(produits.slice(0, 6))}`;
                }
            }

            // Messages pour l'IA
            const history = this.getConversationHistory(phoneNumber);
            const messages = [
                { 
                    role: 'system', 
                    content: this.getSystemPrompt() + productContext 
                },
                ...history.slice(-6).map(h => ({ 
                    role: h.role, 
                    content: h.content 
                }))
            ];

            // Appel Groq
            const aiResponse = await this.callGroqAPI(messages);

            // Ajouter réponse à l'historique
            this.addToHistory(phoneNumber, 'assistant', aiResponse);

            console.log(`✅ Réponse IA générée: "${aiResponse.substring(0, 50)}..."`);
            return aiResponse;

        } catch (error) {
            console.error('❌ Erreur processMessage:', error.message);
            return this.getFallbackResponse(message);
        }
    }

    // Réponses de secours améliorées
    getFallbackResponse(message) {
        const messageLower = message.toLowerCase();
        
        if (messageLower.includes('bonjour') || messageLower.includes('salut')) {
            return "Bonjour ma sœur ! 😊 Bienvenue dans notre belle boutique ! Comment puis-je t'aider aujourd'hui ?";
        }
        
        if (messageLower.includes('robe')) {
            return "Nous avons de magnifiques robes ma sœur ! Des robes élégantes africaines à 250 000 GNF, des robes de soirée à 350 000 GNF... Laquelle t'intéresse ?";
        }
        
        if (messageLower.includes('prix') || messageLower.includes('combien')) {
            return "Nos prix sont très abordables ! Dis-moi quel article t'intéresse et je te donne le prix exact avec le stock disponible.";
        }
        
        if (messageLower.includes('suggère') || messageLower.includes('recommande')) {
            return "Je te recommande nos bestsellers ma sœur ! Robe élégante (250k), sac cuir (95k), chaussures talons (120k). Qu'est-ce qui t'intéresse ?";
        }
        
        return "Je suis là pour t'aider ma sœur ! Dis-moi ce que tu cherches : robes, chaussures, sacs, bijoux... J'ai plein de belles choses à te montrer ! 😊";
    }

    // Test connexion
    async testConnection() {
        try {
            const response = await this.callGroqAPI([
                { role: 'user', content: 'Test' }
            ]);
            
            console.log('✅ Connexion Groq réussie');
            return true;
        } catch (error) {
            console.error('❌ Erreur connexion Groq:', error.message);
            return false;
        }
    }

    // Statistiques
    getStats() {
        return {
            conversationsActives: this.conversationHistory.size,
            produitsDisponibles: this.produitsCache.length,
            model: this.model,
            statut: 'Opérationnel'
        };
    }
}

module.exports = AIAgentGroq;