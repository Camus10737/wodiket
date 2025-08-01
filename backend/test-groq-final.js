// test-groq-final.js - Test complet avec Groq
require('dotenv').config();
const AIAgentGroq = require('./ai-agent-groq');

async function testGroqComplete() {
    console.log('🤖 Test complet de l\'agent IA avec Groq\n');
    
    try {
        const agent = new AIAgentGroq();
        console.log('✅ Agent Groq créé');
        
        // Test 1: Connexion
        console.log('\n1️⃣ Test connexion Groq...');
        const connected = await agent.testConnection();
        
        if (!connected) {
            console.log('❌ Échec connexion Groq');
            return;
        }
        
        // Test 2: Conversation simple
        console.log('\n2️⃣ Test conversation simple...');
        const response1 = await agent.processMessage(
            'Bonjour, comment allez-vous ?',
            '+224123456789',
            'Test User'
        );
        
        console.log('👤 User: Bonjour, comment allez-vous ?');
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
        
        console.log('\n🎉 GROQ FONCTIONNE PARFAITEMENT !');
        console.log('⚡ IA gratuite et ultra-rapide opérationnelle !');
        
    } catch (error) {
        console.error('❌ Erreur pendant les tests:', error.message);
    }
}

// Lancer le test
testGroqComplete();