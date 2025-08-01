const Airtable = require('airtable');
require('dotenv').config();

// Configuration Airtable
const base = new Airtable({
    apiKey: process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID);

// Fonctions pour gérer les clients
const clients = {
    // Créer ou mettre à jour un client
    async createOrUpdate(phoneNumber, name, acquisitionChannel = 'WhatsApp') {
        try {
            // Chercher si le client existe déjà
            const records = await base(process.env.AIRTABLE_TABLE_CLIENTS)
                .select({
                    filterByFormula: `{Phone number} = "${phoneNumber}"`
                })
                .firstPage();

            if (records.length > 0) {
                // Client existe, mettre à jour
                const record = records[0];
                const updated = await base(process.env.AIRTABLE_TABLE_CLIENTS).update([
                    {
                        id: record.id,
                        fields: {
                            'Name': name || record.fields.Name,
                            'Canal_acquisition': acquisitionChannel
                        }
                    }
                ]);
                console.log('✅ Client mis à jour:', phoneNumber);
                return updated[0];
            } else {
                // Nouveau client
                const created = await base(process.env.AIRTABLE_TABLE_CLIENTS).create([
                    {
                        fields: {
                            'Phone number': phoneNumber,
                            'Name': name || 'Client WhatsApp',
                            'Date_creation': new Date().toISOString(),
                            'Canal_acquisition': acquisitionChannel
                        }
                    }
                ]);
                console.log('✅ Nouveau client créé:', phoneNumber);
                return created[0];
            }
        } catch (error) {
            console.error('❌ Erreur client Airtable:', error);
            throw error;
        }
    },

    // Récupérer un client
    async get(phoneNumber) {
        try {
            const records = await base(process.env.AIRTABLE_TABLE_CLIENTS)
                .select({
                    filterByFormula: `{Phone number} = "${phoneNumber}"`
                })
                .firstPage();
            
            return records.length > 0 ? records[0] : null;
        } catch (error) {
            console.error('❌ Erreur récupération client:', error);
            return null;
        }
    }
};

// Fonctions pour gérer les produits
const produits = {
    // Lister tous les produits disponibles
    async getAll() {
        try {
            const records = await base(process.env.AIRTABLE_TABLE_PRODUITS)
                .select({
                    filterByFormula: "Status = 'Active'"
                })
                .all();
            
            return records.map(record => ({
                id: record.id,
                name: record.fields.Name,
                price: record.fields.Price,
                stock: record.fields.Stock || 0,
                description: record.fields.Description,
                category: record.fields.Category
            }));
        } catch (error) {
            console.error('❌ Erreur récupération produits:', error);
            return [];
        }
    },

    // Chercher des produits par nom
    async search(searchTerm) {
        try {
            const records = await base(process.env.AIRTABLE_TABLE_PRODUITS)
                .select({
                    filterByFormula: `AND(Status = 'Active', SEARCH("${searchTerm}", Name))`
                })
                .all();
            
            return records.map(record => ({
                id: record.id,
                name: record.fields.Name,
                price: record.fields.Price,
                stock: record.fields.Stock || 0,
                description: record.fields.Description
            }));
        } catch (error) {
            console.error('❌ Erreur recherche produits:', error);
            return [];
        }
    }
};

// Fonctions pour gérer les commandes
const commandes = {
    // Créer une nouvelle commande
    async create(clientRecord, produits, total) {
        try {
            const created = await base(process.env.AIRTABLE_TABLE_COMMANDES).create([
                {
                    fields: {
                        'Client': [clientRecord.id],
                        'Total': total,
                        'Status': 'Nouveau',
                        'Date_commande': new Date().toISOString(),
                        'Notes': `Commande WhatsApp - ${produits.length} produit(s)`
                    }
                }
            ]);
            console.log('✅ Commande créée:', created[0].id);
            return created[0];
        } catch (error) {
            console.error('❌ Erreur création commande:', error);
            throw error;
        }
    }
};

// Test de connexion
async function testConnection() {
    try {
        console.log('🧪 Test connexion Airtable...');
        const records = await base(process.env.AIRTABLE_TABLE_CLIENTS)
            .select({ maxRecords: 1 })
            .firstPage();
        console.log('✅ Connexion Airtable OK');
        return true;
    } catch (error) {
        console.error('❌ Erreur connexion Airtable:', error.message);
        return false;
    }
}

module.exports = {
    clients,
    produits,
    commandes,
    testConnection
};
