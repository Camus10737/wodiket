// server.js - WhatsApp Bot avec Agent IA Groq
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const multiBoutiques = require('./multi-boutiques');

require('dotenv').config();

// Import des modules
const { createOrUpdateClient, getAllProduits, searchProduits, testConnection } = require('./airtable');
const AIAgentGroq = require('./ai-agent-groq'); // Import de l'agent IA

// Configuration Express et Socket.IO
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));
app.use(express.json());

// Configuration WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Initialisation de l'agent IA
let aiAgent;
try {
    aiAgent = new AIAgentGroq();
    console.log('🤖 Agent IA Groq initialisé');
} catch (error) {
    console.error('❌ Erreur initialisation IA:', error.message);
    aiAgent = null;
}

// Variables globales
let qrString = '';
let isReady = false;
let messageCount = 0;

// --- ÉVÉNEMENTS WHATSAPP ---

client.on('qr', (qr) => {
    console.log('📱 QR Code généré');
    qrString = qr;
    qrcode.generate(qr, { small: true });
    io.emit('qr', qr);
});

client.on('ready', async () => {
    console.log('✅ WhatsApp Bot connecté et prêt !');
    isReady = true;
    io.emit('ready');
    
    // Test de connexion Airtable
    try {
        await testConnection();
        console.log('✅ Airtable connecté');
    } catch (error) {
        console.error('❌ Erreur Airtable:', error.message);
    }
    
    // Test de l'agent IA
    if (aiAgent) {
        try {
            const aiWorking = await aiAgent.testConnection();
            console.log(aiWorking ? '✅ Agent IA prêt' : '⚠️ IA en mode fallback');
        } catch (error) {
            console.error('⚠️ IA en mode fallback:', error.message);
        }
    }
});

client.on('authenticated', () => {
    console.log('🔐 Authentification réussie');
    io.emit('authenticated');
});

client.on('auth_failure', (msg) => {
    console.error('❌ Échec authentification:', msg);
    io.emit('auth_failure', msg);
});

client.on('disconnected', (reason) => {
    console.log('💔 Déconnexion WhatsApp:', reason);
    isReady = false;
    io.emit('disconnected', reason);
});

// --- GESTION DES MESSAGES ---

client.on('message', async (message) => {
    try {
        // Filtrer les messages (éviter groupes, statuts, etc.)
        if (message.isGroupMsg || message.isStatus || message.from === 'status@broadcast') {
            return;
        }

        messageCount++;
        console.log(`\n📨 Message #${messageCount} reçu:`);
        console.log(`📱 De: ${message.from}`);
        console.log(`💬 Contenu: ${message.body}`);

        // Récupérer les infos du contact
        const contact = await message.getContact();
        const senderName = contact.pushname || contact.name || 'Client';
        
        console.log(`👤 Nom: ${senderName}`);

        // Émettre le message reçu via Socket.IO
        io.emit('message_received', {
            from: message.from,
            body: message.body,
            timestamp: new Date().toLocaleTimeString(),
            senderName: senderName
        });

        // --- TRAITEMENT AVEC IA ou FALLBACK ---
        let response;
        
        if (aiAgent) {
            try {
                console.log('🤖 Traitement avec IA Groq...');
                response = await aiAgent.processMessage(message.body, message.from, senderName);
                console.log('✅ Réponse IA générée');
            } catch (error) {
                console.error('❌ Erreur IA, fallback activé:', error.message);
                response = getBasicResponse(message.body);
            }
        } else {
            console.log('🔄 Mode fallback (IA non disponible)');
            response = getBasicResponse(message.body);
        }

        // Envoyer la réponse
        if (response) {
            await message.reply(response);
            console.log(`🤖 Réponse envoyée: ${response.substring(0, 100)}${response.length > 100 ? '...' : ''}`);
            
            // Émettre la réponse via Socket.IO
            io.emit('message_sent', {
                to: message.from,
                body: response,
                timestamp: new Date().toLocaleTimeString()
            });
        }

    } catch (error) {
        console.error('❌ Erreur traitement message:', error);
        
        // Réponse d'erreur de secours
        try {
            await message.reply("Désolé, j'ai eu un petit problème technique. Pouvez-vous répéter votre message ?");
        } catch (sendError) {
            console.error('❌ Impossible d\'envoyer la réponse d\'erreur:', sendError);
        }
    }
});

// --- FONCTION DE RÉPONSE BASIQUE (FALLBACK) ---
function getBasicResponse(messageBody) {
    const message = messageBody.toLowerCase();
    
    // Salutations
    if (message.includes('bonjour') || message.includes('salut') || message.includes('bonsoir')) {
        return "Bonjour ! Bienvenue dans notre boutique 😊 Je suis Aïcha, votre assistante. Comment puis-je vous aider aujourd'hui ? Vous pouvez me demander nos produits, prix, ou comment passer commande !";
    }
    
    // Questions sur produits
    if (message.includes('produit') || message.includes('catalogue') || message.includes('stock')) {
        return "Je consulte notre catalogue pour vous ! Nous avons de beaux produits disponibles. Dites-moi quel type d'article vous intéresse (robe, chaussure, sac, accessoire) et je vous donnerai tous les détails !";
    }
    
    // Prix
    if (message.includes('prix') || message.includes('combien') || message.includes('coûte')) {
        return "Pour connaître les prix, dites-moi quel produit vous intéresse ! Je peux vous donner le prix exact, le stock disponible et toutes les informations.";
    }
    
    // Commande
    if (message.includes('commander') || message.includes('acheter') || message.includes('prendre')) {
        return "Parfait ! Pour passer commande, dites-moi quel produit vous voulez et en quelle quantité. Je vous guiderai ensuite pour la livraison et le paiement (Orange Money, MTN, Moov ou espèces).";
    }
    
    // Réponse par défaut
    return "Je suis là pour vous aider ! Vous pouvez me demander :\n• Nos produits disponibles\n• Les prix et le stock\n• Comment passer commande\n• Infos livraison et paiement\n\nQue souhaitez-vous savoir ?";
}

// --- ROUTES EXPRESS ---

// Page d'accueil - Dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// API - Statut du bot
app.get('/api/status', (req, res) => {
    res.json({
        isReady,
        messageCount,
        aiStatus: aiAgent ? 'Disponible' : 'Indisponible',
        timestamp: new Date().toISOString()
    });
});

// API - Envoyer un message
app.post('/api/send-message', async (req, res) => {
    try {
        const { number, message } = req.body;
        
        if (!number || !message) {
            return res.status(400).json({ error: 'Numéro et message requis' });
        }
        
        if (!isReady) {
            return res.status(503).json({ error: 'WhatsApp non connecté' });
        }
        
        // Formater le numéro (ajouter @c.us si nécessaire)
        const formattedNumber = number.includes('@') ? number : `${number}@c.us`;
        
        // Envoyer le message
        await client.sendMessage(formattedNumber, message);
        
        console.log(`📤 Message manuel envoyé à ${formattedNumber}: ${message}`);
        
        res.json({ success: true, message: 'Message envoyé avec succès' });
        
    } catch (error) {
        console.error('❌ Erreur envoi message:', error);
        res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
    }
});

// API - Statistiques IA
app.get('/api/ai-stats', (req, res) => {
    if (aiAgent) {
        res.json(aiAgent.getStats());
    } else {
        res.json({ error: 'Agent IA non disponible' });
    }
});

// --- SOCKET.IO ---

io.on('connection', (socket) => {
    console.log('🔌 Nouvelle connexion dashboard');
    
    // Envoyer le statut actuel
    socket.emit('status_update', {
        isReady,
        messageCount,
        qrString
    });
    
    socket.on('disconnect', () => {
        console.log('🔌 Déconnexion dashboard');
    });
});

// --- DÉMARRAGE DU SERVEUR ---

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log('\n🚀 === WHATSAPP SALES BOT AVEC IA ===');
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`🤖 Agent IA: ${aiAgent ? 'Groq Activé' : 'Fallback Mode'}`);
    console.log('⏳ Initialisation WhatsApp...\n');
});
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await multiBoutiques.getStats('aicha');
        
        // Enrichir avec des données supplémentaires
        const enrichedStats = {
            ...stats,
            conversations: messageCount || 0, // Utilise le compteur existant
            derniere_maj: new Date().toISOString()
        };
        
        res.json(enrichedStats);
        
    } catch (error) {
        console.error('❌ Erreur récupération stats:', error);
        res.status(500).json({ 
            error: 'Erreur récupération statistiques',
            ca_jour: 0,
            ventes_jour: 0,
            commandes_attente: 0,
            conversations: messageCount || 0
        });
    }
});

// API - Récupérer les commandes en attente
app.get('/api/commandes', async (req, res) => {
    try {
        // Utiliser Airtable directement pour récupérer les commandes
        const { base } = multiBoutiques.getBoutiqueConnection('aicha');
        
        const records = await base('Commandes').select({
            filterByFormula: 'Statut = "EN_ATTENTE"',
            sort: [{ field: 'Date', direction: 'desc' }]
        }).all();
        
        const commandes = records.map(record => ({
            id: record.fields.Name, // ID de la commande
            client: record.fields.Client,
            telephone: record.fields.Telephone,
            produits: JSON.parse(record.fields.Produits || '[]'),
            total: record.fields.Total,
            statut: record.fields.Statut,
            date: new Date(record.fields.Date),
            boutique: record.fields.Boutique || 'aicha'
        }));
        
        res.json(commandes);
        
    } catch (error) {
        console.error('❌ Erreur récupération commandes:', error);
        res.status(500).json({ 
            error: 'Erreur récupération commandes',
            commandes: []
        });
    }
});

// API - Marquer une commande comme vendue
app.post('/api/commandes/:commandeId/vendu', async (req, res) => {
    try {
        const { commandeId } = req.params;
        
        console.log(`💰 Validation commande: ${commandeId}`);
        
        const result = await multiBoutiques.marquerVendu(commandeId, 'aicha');
        
        // Émettre la mise à jour via Socket.IO
        io.emit('commande_vendue', {
            commande_id: commandeId,
            client: result.client,
            total: result.total
        });
        
        res.json({ 
            success: true, 
            message: 'Commande marquée comme vendue',
            data: result
        });
        
    } catch (error) {
        console.error('❌ Erreur validation commande:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la validation',
            message: error.message
        });
    }
});

// API - Récupérer les produits
app.get('/api/produits', async (req, res) => {
    try {
        const produits = await multiBoutiques.getProduits('aicha');
        res.json(produits);
        
    } catch (error) {
        console.error('❌ Erreur récupération produits:', error);
        res.status(500).json({ 
            error: 'Erreur récupération produits',
            produits: []
        });
    }
});

// API - Rechercher des produits
app.get('/api/produits/search', async (req, res) => {
    try {
        const { q, taille } = req.query;
        
        let produits;
        if (taille) {
            produits = await multiBoutiques.rechercherProduitsAvecTaille(q, taille, 'aicha');
        } else {
            produits = await multiBoutiques.rechercherProduits(q, 'aicha');
        }
        
        res.json(produits);
        
    } catch (error) {
        console.error('❌ Erreur recherche produits:', error);
        res.status(500).json({ 
            error: 'Erreur recherche produits',
            produits: []
        });
    }
});

// API - Ajouter un nouveau produit
app.post('/api/produits', async (req, res) => {
    try {
        const { nom, categorie, couleur, prix, prix_minimum, stock, description, tailles, image_url } = req.body;
        
        // Validation basique
        if (!nom || !prix || !stock) {
            return res.status(400).json({ 
                error: 'Nom, prix et stock sont obligatoires' 
            });
        }
        
        const { base } = multiBoutiques.getBoutiqueConnection('aicha');
        
        const record = await base('Produits').create({
            'Nom': nom,
            'Categorie': categorie,
            'Couleur': couleur,
            'Prix': parseInt(prix),
            'Prix_Minimum': parseInt(prix_minimum) || Math.round(prix * 0.8),
            'Stock': parseInt(stock),
            'Description': description || '',
            'Tailles': tailles || '',
            'Image_URL': image_url || ''
        });
        
        res.json({ 
            success: true, 
            message: 'Produit ajouté avec succès',
            produit: {
                id: record.id,
                nom: record.fields.Nom,
                prix: record.fields.Prix
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur ajout produit:', error);
        res.status(500).json({ 
            error: 'Erreur lors de l\'ajout du produit',
            message: error.message
        });
    }
});

// API - Dashboard principal (servir le fichier dashboard-vendeuse.html)
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard-vendeuse.html'));
});

// --- EXTENSIONS SOCKET.IO POUR LE DASHBOARD ---

// Variable pour stocker les dernières stats
let lastStats = null;

// Fonction pour émettre les stats périodiquement
async function emitStats() {
    try {
        const stats = await multiBoutiques.getStats('aicha');
        const enrichedStats = {
            ...stats,
            conversations: messageCount || 0,
            derniere_maj: new Date().toISOString()
        };
        
        // Émettre seulement si les stats ont changé
        if (JSON.stringify(enrichedStats) !== JSON.stringify(lastStats)) {
            io.emit('stats_update', enrichedStats);
            lastStats = enrichedStats;
        }
        
    } catch (error) {
        console.error('❌ Erreur émission stats:', error);
    }
}

// Émettre les stats toutes les 30 secondes
setInterval(emitStats, 30000);

// Extension de la connexion Socket.IO existante
const originalSocketConnection = io.on('connection', (socket) => {
    console.log('🔌 Nouvelle connexion dashboard');
    
    // Envoyer le statut actuel (garde votre code existant)
    socket.emit('status_update', {
        isReady,
        messageCount,
        qrString
    });
    
    // Envoyer les stats initiales
    emitStats();
    
    // Gestion des événements dashboard
    socket.on('get_commandes', async () => {
        try {
            const { base } = multiBoutiques.getBoutiqueConnection('aicha');
            const records = await base('Commandes').select({
                filterByFormula: 'Statut = "EN_ATTENTE"'
            }).all();
            
            const commandes = records.map(record => ({
                id: record.fields.Name,
                client: record.fields.Client,
                telephone: record.fields.Telephone,
                produits: JSON.parse(record.fields.Produits || '[]'),
                total: record.fields.Total,
                date: new Date(record.fields.Date)
            }));
            
            socket.emit('commandes_update', commandes);
            
        } catch (error) {
            console.error('❌ Erreur Socket commandes:', error);
            socket.emit('error', { message: 'Erreur récupération commandes' });
        }
    });
    
    socket.on('disconnect', () => {
        console.log('🔌 Déconnexion dashboard');
    });
});

// --- INTÉGRATION AVEC L'IA EXISTANTE ---

// Modifier votre fonction de traitement des messages pour créer des commandes automatiquement
// (À ajouter après votre code existant de traitement des messages)

// Fonction pour détecter et créer des commandes depuis l'IA
async function detecterCommande(messageBody, phoneNumber, senderName) {
    try {
        // Détecter des phrases de commande
        const commandeKeywords = [
            'je prends', 'je veux', 'commande', 'achète', 
            'j\'achète', 'prendre', 'commander'
        ];
        
        const message = messageBody.toLowerCase();
        const contientCommande = commandeKeywords.some(keyword => message.includes(keyword));
        
        if (contientCommande) {
            // Rechercher les produits mentionnés
            const produits = await multiBoutiques.getProduits('aicha');
            const produitsTrouvés = produits.filter(produit => 
                message.includes(produit.nom.toLowerCase()) ||
                message.includes(produit.categorie.toLowerCase())
            );
            
            if (produitsTrouvés.length > 0) {
                console.log(`🛒 Commande détectée de ${senderName}: ${produitsTrouvés[0].nom}`);
                
                // Créer la commande automatiquement
                const commande = await multiBoutiques.creerCommande(
                    phoneNumber,
                    senderName,
                    [{
                        id: produitsTrouvés[0].id,
                        nom: produitsTrouvés[0].nom,
                        prix: produitsTrouvés[0].prix,
                        quantite: 1
                    }],
                    produitsTrouvés[0].prix,
                    'aicha'
                );
                
                // Notifier le dashboard
                io.emit('nouvelle_commande', {
                    id: commande.commande_id,
                    client: senderName,
                    produit: produitsTrouvés[0].nom,
                    total: produitsTrouvés[0].prix
                });
                
                return true;
            }
        }
        
        return false;
        
    } catch (error) {
        console.error('❌ Erreur détection commande:', error);
        return false;
    }
}

// Initialisation WhatsApp
client.initialize();