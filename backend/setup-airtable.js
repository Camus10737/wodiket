// backend/setup-airtable.js
require('dotenv').config();
const Airtable = require('airtable');

class AirtableSetup {
    constructor() {
        this.base = new Airtable({
            apiKey: process.env.AIRTABLE_ACCESS_TOKEN
        }).base(process.env.AIRTABLE_BASE_ID);
    }

    async setupCommandes() {
        console.log('🏗️ Configuration table Commandes...\n');
        
        try {
            // Vérifier la structure actuelle
            console.log('🔍 Vérification structure actuelle...');
            const records = await this.base('Commandes').select({ maxRecords: 1 }).all();
            
            if (records.length > 0) {
                const currentFields = Object.keys(records[0].fields);
                console.log('📊 Champs actuels:', currentFields);
            }
            
            // Créer des enregistrements de test pour forcer la création des colonnes
            console.log('\n📝 Création des colonnes via enregistrements...');
            
            const testData = [
                {
                    'Name': 'CMD-SETUP-001',
                    'Client': 'Client Test',
                    'Telephone': '+224622000001',
                    'Produits': '[{"nom":"Test","prix":1000}]',
                    'Total': 1000,
                    'Statut': 'EN_ATTENTE',
                    'Date': new Date().toISOString(),
                    'Boutique': 'aicha'
                },
                {
                    'Name': 'CMD-SETUP-002', 
                    'Client': 'Client Test 2',
                    'Telephone': '+224622000002',
                    'Produits': '[{"nom":"Test 2","prix":2000}]',
                    'Total': 2000,
                    'Statut': 'VENDU',
                    'Date': new Date().toISOString(),
                    'Boutique': 'aicha'
                },
                {
                    'Name': 'CMD-SETUP-003',
                    'Client': 'Client Test 3', 
                    'Telephone': '+224622000003',
                    'Produits': '[{"nom":"Test 3","prix":3000}]',
                    'Total': 3000,
                    'Statut': 'ANNULE',
                    'Date': new Date().toISOString(),
                    'Boutique': 'aicha'
                }
            ];
            
            console.log('⚡ Création des enregistrements de test...');
            const newRecords = await this.base('Commandes').create(testData);
            console.log(`✅ ${newRecords.length} enregistrements créés !`);
            
            // Vérifier que toutes les colonnes sont créées
            console.log('\n🔍 Vérification des nouvelles colonnes...');
            const updatedRecords = await this.base('Commandes').select({ maxRecords: 1 }).all();
            const newFields = Object.keys(updatedRecords[0].fields);
            console.log('📊 Nouvelles colonnes:', newFields);
            
            // Supprimer les enregistrements de test
            console.log('\n🗑️ Nettoyage des données de test...');
            const recordIds = newRecords.map(r => r.id);
            await this.base('Commandes').destroy(recordIds);
            console.log('✅ Données de test supprimées !');
            
            console.log('\n🎉 Table Commandes configurée avec succès !');
            console.log('📋 Colonnes disponibles:');
            newFields.forEach((field, index) => {
                console.log(`${index + 1}. ${field}`);
            });
            
        } catch (error) {
            console.error('❌ Erreur setup Commandes:', error.message);
            
            if (error.message.includes('UNKNOWN_FIELD_NAME')) {
                console.log('\n💡 SOLUTION: Certaines colonnes doivent être créées manuellement');
                console.log('🔧 Créez ces colonnes dans Airtable:');
                console.log('   • Client (Single line text)');
                console.log('   • Telephone (Phone number)');
                console.log('   • Produits (Long text)');
                console.log('   • Total (Currency)');
                console.log('   • Statut (Single select: EN_ATTENTE, VENDU, ANNULE)');
                console.log('   • Date (Date and time)');
                console.log('   • Boutique (Single line text)');
            }
        }
    }

    async setupProduitsPrixMinimum() {
        console.log('\n🏗️ Ajout Prix_Minimum aux produits...\n');
        
        try {
            console.log('📦 Récupération des produits...');
            const records = await this.base('Produits').select().all();
            console.log(`📊 Trouvé ${records.length} produits`);
            
            const updates = [];
            let count = 0;
            
            for (const record of records) {
                const prix = record.fields.Prix || record.fields.Price;
                const prixMin = record.fields.Prix_Minimum;
                
                if (prix && !prixMin) {
                    const suggestedMin = Math.round(prix * 0.8); // 80% du prix
                    updates.push({
                        id: record.id,
                        fields: {
                            'Prix_Minimum': suggestedMin
                        }
                    });
                    count++;
                    console.log(`💰 ${record.fields.Nom}: ${prix} → Min: ${suggestedMin}`);
                }
            }
            
            if (updates.length > 0) {
                console.log(`\n⚡ Mise à jour de ${updates.length} produits...`);
                
                // Airtable limite à 10 updates par batch
                const batches = [];
                for (let i = 0; i < updates.length; i += 10) {
                    batches.push(updates.slice(i, i + 10));
                }
                
                for (const batch of batches) {
                    await this.base('Produits').update(batch);
                    console.log(`✅ Batch de ${batch.length} produits mis à jour`);
                }
                
                console.log(`🎉 ${count} prix minimum ajoutés !`);
            } else {
                console.log('✅ Tous les produits ont déjà un prix minimum !');
            }
            
        } catch (error) {
            console.error('❌ Erreur setup Prix_Minimum:', error.message);
            
            if (error.message.includes('UNKNOWN_FIELD_NAME')) {
                console.log('\n💡 SOLUTION: Créez la colonne "Prix_Minimum" dans la table Produits');
                console.log('🔧 Type: Currency (GNF), Precision: 0');
            }
        }
    }

    async verificarStructure() {
        console.log('\n🔍 VÉRIFICATION STRUCTURE COMPLÈTE\n');
        
        const tables = ['Clients', 'Produits', 'Commandes', 'Transactions'];
        
        for (const tableName of tables) {
            try {
                console.log(`📋 Table: ${tableName}`);
                const records = await this.base(tableName).select({ maxRecords: 1 }).all();
                
                if (records.length > 0) {
                    const fields = Object.keys(records[0].fields);
                    console.log(`   ✅ ${fields.length} colonnes: ${fields.join(', ')}`);
                } else {
                    console.log(`   📝 Table vide mais existe`);
                }
                
            } catch (error) {
                console.log(`   ❌ Erreur: ${error.message}`);
            }
        }
    }

    async runFullSetup() {
        console.log('🚀 SETUP COMPLET AIRTABLE - DÉMARRAGE\n');
        console.log('=' .repeat(50));
        
        // 1. Vérification initiale
        await this.verificarStructure();
        
        console.log('\n' + '=' .repeat(50));
        
        // 2. Setup table Commandes
        await this.setupCommandes();
        
        console.log('\n' + '=' .repeat(50));
        
        // 3. Ajout Prix_Minimum
        await this.setupProduitsPrixMinimum();
        
        console.log('\n' + '=' .repeat(50));
        
        // 4. Vérification finale
        console.log('\n🔍 VÉRIFICATION FINALE\n');
        await this.verificarStructure();
        
        console.log('\n' + '=' .repeat(50));
        console.log('🎉 SETUP TERMINÉ !');
        console.log('🧪 Vous pouvez maintenant lancer: node test-multi-boutiques.js');
        console.log('=' .repeat(50));
    }
}

// Exécution
async function main() {
    const setup = new AirtableSetup();
    await setup.runFullSetup();
}

// Gestion des arguments
const args = process.argv.slice(2);
if (args.length > 0) {
    const setup = new AirtableSetup();
    
    switch(args[0]) {
        case 'commandes':
            setup.setupCommandes();
            break;
        case 'prix':
            setup.setupProduitsPrixMinimum();
            break;
        case 'check':
            setup.verificarStructure();
            break;
        default:
            console.log('Usage: node setup-airtable.js [commandes|prix|check]');
            console.log('Ou sans argument pour setup complet');
            main();
    }
} else {
    main();
}