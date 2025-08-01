// test-final.js - Test complet de l'agent IA
require('dotenv').config();
const AIAgent = require('./ai-agent');

async function testComplete() {
    console.log('🤖 Test complet de l\'agent IA avec OpenAI\n');
    
    try {
        const agent = new AIAgent();
        console.log('✅ Agent IA créé');
        
        // Test 1: Connexion OpenAI
        console.log('\n1️⃣ Test connexion OpenAI...');
        const connected = await agent.testConnection();
        
        if (!connected) {
            console.log('❌ Échec connexion OpenAI');
            return;
        }
        
        // Test 2: Conversation simple
        console.log('\n2️⃣ Test conversation simple...');
        const response1 = await agent.processMessage(
            'Bonjour comment allez-vous ?',
            '+224123456789',
            'Test User'
        );
        
        console.log('👤 User: Bonjour comment allez-vous ?');
        console.log('🤖 Aïcha:', response1);
        
        // Test 3: Question sur produits
        console.log('\n3️⃣ Test question produits...');
        const response2 = await agent.processMessage(
            'Avez-vous des robes disponibles ?',
            '+224123456789'
        );
        
        console.log('👤 User: Avez-vous des robes disponibles ?');
        console.log('🤖 Aïcha:', response2);
        
        // Test 4: Statistiques
        console.log('\n4️⃣ Statistiques agent:');
        const stats = agent.getStats();
        console.log('- Conversations actives:', stats.conversationsActives);
        console.log('- Cache produits:', stats.cacheStatus);
        console.log('- Modèle IA:', stats.model);
        
        console.log('\n🎉 TOUS LES TESTS RÉUSSIS !');
        console.log('🚀 Votre agent IA est opérationnel !');
        
    } catch (error) {
        console.error('❌ Erreur pendant les tests:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Lancer le test
testComplete();