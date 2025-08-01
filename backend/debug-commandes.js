// backend/debug-commandes.js
require('dotenv').config();
const Airtable = require('airtable');

async function debugCommandes() {
    console.log('🔍 DEBUG - Structure table Commandes...\n');
    
    try {
        const base = new Airtable({
            apiKey: process.env.AIRTABLE_ACCESS_TOKEN
        }).base(process.env.AIRTABLE_BASE_ID);
        
        // Essayer de lire la table Commandes pour voir sa structure
        console.log('📋 Tentative lecture table Commandes...');
        
        const records = await base('Commandes').select({
            maxRecords: 1 // Juste 1 record pour voir la structure
        }).all();
        
        if (records.length > 0) {
            console.log('✅ Table Commandes trouvée !');
            console.log('📊 Champs disponibles:');
            const fields = Object.keys(records[0].fields);
            fields.forEach((field, index) => {
                console.log(`${index + 1}. "${field}"`);
            });
            
            console.log('\n💾 Exemple de données:');
            console.log(records[0].fields);
            
        } else {
            console.log('📝 Table Commandes vide');
            
            // Essayer de créer un record test pour voir quels champs sont acceptés
            console.log('🧪 Test avec champs basiques...');
            
            try {
                const testRecord = await base('Commandes').create({
                    'Name': 'TEST-123' // Champ par défaut Airtable
                });
                console.log('✅ Record test créé avec "Name"');
                console.log('Structure:', Object.keys(testRecord.fields));
                
                // Supprimer le record test
                await base('Commandes').destroy(testRecord.id);
                console.log('🗑️ Record test supprimé');
                
            } catch (error) {
                console.log('❌ Erreur test "Name":', error.message);
                
                // Essayer avec d'autres noms courants
                const champsTest = ['ID', 'Commande', 'Order', 'Record'];
                for (const champ of champsTest) {
                    try {
                        const data = {};
                        data[champ] = 'TEST-123';
                        const testRecord = await base('Commandes').create(data);
                        console.log(`✅ Champ "${champ}" fonctionne !`);
                        await base('Commandes').destroy(testRecord.id);
                        break;
                    } catch (err) {
                        console.log(`❌ Champ "${champ}" ne fonctionne pas`);
                    }
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Erreur debug:', error.message);
        
        if (error.message.includes('NOT_FOUND')) {
            console.log('💡 La table "Commandes" n\'existe peut-être pas ?');
            console.log('💡 Vérifiez le nom exact dans Airtable');
        }
    }
}

debugCommandes();