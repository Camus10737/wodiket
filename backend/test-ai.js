// test-ai.js - Tester l'agent IA
require('dotenv').config();

async function testAI() {
    console.log('🤖 Test de l\'Agent IA...\n');
    
    // Vérification des variables d'environnement
    if (!process.env.OPENAI_API_KEY) {
        console.log('❌ OPENAI_API_KEY manquante dans .env');
        return;
    }
    
    console.log('✅ Clé OpenAI trouvée');
    
    try {
        const AIAgent = require('./ai-agent');
        console.log('✅ Module ai-agent chargé');
    
        const agent = new AIAgent();
        console.log('✅ Agent IA initialisé');
        
        // Test 1: Connexion OpenAI
        console.log('\n1. Test de connexion OpenAI...');
        const connected = await agent.testConnection();
        
        if (!connected) {
            console.log('❌ Échec connexion. Vérifiez votre clé API.');
            return;
        }
        
        // Test 2: Conversation simple
        console.log('\n2. Test conversation simple...');
        const response1 = await agent.processMessage(
            'Bonjour, comment ça va ?', 
            '+224123456789', 
            'Test User'
        );
        console.log('👤 User: Bonjour, comment ça va ?');
        console.log('🤖 Aïcha:', response1);
        
        // Test 3: Question sur produits
        console.log('\n3. Test question produits...');
        const response2 = await agent.processMessage(
            'Avez-vous des robes en stock ?', 
            '+224123456789'
        );
        console.log('👤 User: Avez-vous des robes en stock ?');
        console.log('🤖 Aïcha:', response2);
        
        // Test 4: Statistiques
        console.log('\n4. Statistiques agent:');
        console.log(agent.getStats());
        
        console.log('\n✅ Tests terminés avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur pendant les tests:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Lancer les tests
testAI();