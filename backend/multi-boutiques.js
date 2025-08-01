// // backend/multi-boutiques.js
// const Airtable = require('airtable');

// class MultiBoutiquesManager {
//     constructor() {
//         this.boutiques = new Map();
//         this.currentBoutique = 'aicha'; // Par défaut
//         this.loadBoutiquesConfig();
//     }
    
//     // Configuration des boutiques (extensible facilement)
//     loadBoutiquesConfig() {
//         this.boutiquesConfig = {
//             'aicha': {
//                 id: 'aicha',
//                 nom: 'Aïcha Fashion',
//                 vendeuse: 'Aïcha',
//                 ville: 'Conakry',
//                 telephone: '+224622111111',
//                 airtable_base_id: process.env.AIRTABLE_BASE_ID, // Votre base actuelle
//                 personality: {
//                     nom: 'Aïcha',
//                     style: 'Chaleureuse, authentique guinéenne, utilise "ma sœur", "ma belle"',
//                     salutation: 'Salut ma sœur ! Comment tu vas ? 😊',
//                     langue: 'français avec expressions guinéennes'
//                 }
//             }
//             // Facile d'ajouter d'autres boutiques plus tard :
//             // 'fatou': { ... },
//             // 'mariama': { ... }
//         };
//     }
    
//     // Obtenir la configuration d'une boutique
//     getBoutiqueConfig(boutiqueId = this.currentBoutique) {
//         const config = this.boutiquesConfig[boutiqueId];
//         if (!config) {
//             throw new Error(`Boutique "${boutiqueId}" non configurée`);
//         }
//         return config;
//     }
    
//     // Obtenir connexion Airtable pour une boutique
//     getBoutiqueConnection(boutiqueId = this.currentBoutique) {
//         if (!this.boutiques.has(boutiqueId)) {
//             const config = this.getBoutiqueConfig(boutiqueId);
            
//             const base = new Airtable({
//                 apiKey: process.env.AIRTABLE_ACCESS_TOKEN
//             }).base(config.airtable_base_id);
            
//             this.boutiques.set(boutiqueId, { base, config });
//         }
        
//         return this.boutiques.get(boutiqueId);
//     }
    
//     // PRODUITS - Récupérer tous les produits d'une boutique
//     async getProduits(boutiqueId = this.currentBoutique) {
//         try {
//             const { base } = this.getBoutiqueConnection(boutiqueId);
//             const records = await base('Produits').select({
//                 filterByFormula: "Stock > 0" // Seulement produits en stock
//             }).all();
            
//             return records.map(record => ({
//                 id: record.id,
//                 nom: record.fields.Nom || record.fields.Name,
//                 categorie: record.fields.Categorie || record.fields.Category,
//                 couleur: record.fields.Couleur,
//                 prix: record.fields.Prix || record.fields.Price,
//                 prix_minimum: record.fields.Prix_Minimum || (record.fields.Prix * 0.8), // 80% par défaut
//                 stock: record.fields.Stock,
//                 description: record.fields.Description,
//                 tailles: record.fields.Tailles || [], // Nouveau : tailles disponibles
//                 image_url: record.fields.Image_URL || record.fields.Photo?.[0]?.url || null, // Nouveau : URL image
//                 emoji: this.getCategorieEmoji(record.fields.Categorie || record.fields.Category) // Emoji pour WhatsApp
//             }));
//         } catch (error) {
//             console.error(`Erreur récupération produits ${boutiqueId}:`, error);
//             return [];
//         }
//     }
    
//     // Utilitaire : Obtenir emoji selon catégorie
//     getCategorieEmoji(categorie) {
//         const emojis = {
//             'Robe': '👗',
//             'Boubou': '👘', 
//             'Pantalon': '👖',
//             'Jupe': '🩱',
//             'Chemise': '👔',
//             'Vêtements': '👕',
//             'Accessoires': '👜',
//             'Bijoux': '💍',
//             'Foulards': '🧣',
//             'Chaussures': '👠'
//         };
//         return emojis[categorie] || '🛍️';
//     }
    
//     // PRODUITS - Rechercher par critères (nom, catégorie, couleur) - Version simple
//     async rechercherProduits(criteres, boutiqueId = this.currentBoutique) {
//         const produits = await this.getProduits(boutiqueId);
//         const recherche = criteres.toLowerCase();
        
//         return produits.filter(produit => 
//             produit.nom.toLowerCase().includes(recherche) ||
//             produit.categorie.toLowerCase().includes(recherche) ||
//             produit.couleur.toLowerCase().includes(recherche) ||
//             produit.description.toLowerCase().includes(recherche)
//         );
//     }

//     // PRODUITS - Rechercher avec support tailles
//     async rechercherProduitsAvecTaille(criteres, taille = null, boutiqueId = this.currentBoutique) {
//         const produits = await this.getProduits(boutiqueId);
//         const recherche = criteres.toLowerCase();
        
//         return produits.filter(produit => {
//             // Recherche classique
//             const matchTexte = 
//                 produit.nom.toLowerCase().includes(recherche) ||
//                 produit.categorie.toLowerCase().includes(recherche) ||
//                 produit.couleur.toLowerCase().includes(recherche) ||
//                 produit.description.toLowerCase().includes(recherche);
            
//             // Filtre taille si spécifiée
//             const matchTaille = !taille || 
//                 (produit.tailles && produit.tailles.includes(taille.toUpperCase()));
            
//             return matchTexte && matchTaille;
//         });
//     }
    
//     // COMMANDES - Créer une nouvelle commande (adaptable aux noms de colonnes)
//     async creerCommande(clientPhone, clientNom, produits, total, boutiqueId = this.currentBoutique) {
//         try {
//             const { base } = this.getBoutiqueConnection(boutiqueId);
//             const commandeId = `CMD-${Date.now()}`;
            
//             // Structure avec format téléphone compatible Airtable
//             const commandeData = {
//                 'Name': commandeId,
//                 'Client': clientNom || 'Client',
//                 'Telephone': clientPhone.replace('+', ''), // Supprimer le +
//                 'Produits': JSON.stringify(produits),
//                 'Total': total,
//                 'Statut': 'EN_ATTENTE',
//                 'Date': new Date().toISOString(),
//                 'Boutique': boutiqueId
//             };
            
//             console.log(`✅ Commande créée: ${commandeId} pour ${clientNom} (${total} GNF)`);
//             return {
//                 id: record.id,
//                 commande_id: commandeId,
//                 client: clientNom,
//                 total: total,
//                 produits: produits
//             };
            
//         } catch (error) {
//             console.error('Erreur création commande:', error);
//             throw error;
//         }
//     }
    
//     // COMMANDES - Marquer comme vendue (structure exacte)
//     async marquerVendu(commandeId, boutiqueId = this.currentBoutique) {
//         try {
//             const { base } = this.getBoutiqueConnection(boutiqueId);
            
//             // Trouver la commande avec colonne "ID" (pas "Order_ID")
//             const records = await base('Commandes').select({
//                 filterByFormula: `ID = "${commandeId}"`
//             }).all();
            
//             if (records.length === 0) {
//                 throw new Error(`Commande ${commandeId} non trouvée`);
//             }
            
//             const record = records[0];
            
//             // Marquer comme vendue avec colonne "Statut" (pas "Status")
//             await base('Commandes').update(record.id, {
//                 'Statut': 'VENDU',
//                 'Date': new Date().toISOString() // Mettre à jour la date
//             });
            
//             console.log(`✅ Commande ${commandeId} marquée comme vendue`);
            
//             return {
//                 commande_id: commandeId,
//                 client: record.fields.Client,    // Colonne "Client"
//                 total: record.fields.Total,      // Colonne "Total"
//                 produits: JSON.parse(record.fields.Produits || '[]') // Colonne "Produits"
//             };
            
//         } catch (error) {
//             console.error('Erreur marquage vendu:', error);
//             throw error;
//         }
//     }
    
//     // STOCK - Réserver stock pour une commande
//     async reserverStock(produits, boutiqueId = this.currentBoutique) {
//         const { base } = this.getBoutiqueConnection(boutiqueId);
        
//         for (const produit of produits) {
//             try {
//                 // Diminuer le stock
//                 const records = await base('Produits').select({
//                     filterByFormula: `RECORD_ID() = "${produit.id}"`
//                 }).all();
                
//                 if (records.length > 0) {
//                     const currentStock = records[0].fields.Stock || 0;
//                     const newStock = Math.max(0, currentStock - (produit.quantite || 1));
                    
//                     await base('Produits').update(records[0].id, {
//                         Stock: newStock
//                     });
//                 }
//             } catch (error) {
//                 console.error(`Erreur réservation stock ${produit.nom}:`, error);
//             }
//         }
//     }
    
//     // CLIENTS - Enregistrer/mettre à jour client
//     async enregistrerClient(telephone, nom, boutiqueId = this.currentBoutique) {
//         try {
//             const { base } = this.getBoutiqueConnection(boutiqueId);
            
//             // Vérifier si client existe déjà
//             const existants = await base('Clients').select({
//                 filterByFormula: `Phone = "${telephone}"`
//             }).all();
            
//             if (existants.length > 0) {
//                 // Mettre à jour nom si fourni
//                 if (nom && nom !== 'Client') {
//                     await base('Clients').update(existants[0].id, {
//                         Name: nom,
//                         Date_derniere_visite: new Date().toISOString()
//                     });
//                 }
//                 return existants[0].fields;
//             } else {
//                 // Créer nouveau client
//                 const record = await base('Clients').create({
//                     Name: nom || 'Client',
//                     Phone: telephone,
//                     Date_creation: new Date().toISOString(),
//                     Date_derniere_visite: new Date().toISOString(),
//                     Canal_acquisition: 'WhatsApp',
//                     Boutique: boutiqueId
//                 });
//                 return record.fields;
//             }
//         } catch (error) {
//             console.error('Erreur gestion client:', error);
//             return { Name: nom || 'Client', Phone: telephone };
//         }
//     }
    
//     // STATS - Statistiques simples pour dashboard
//     async getStats(boutiqueId = this.currentBoutique) {
//         try {
//             const { base } = this.getBoutiqueConnection(boutiqueId);
            
//             // Commandes du jour avec structure exacte
//             const today = new Date().toISOString().split('T')[0];
//             const commandesJour = await base('Commandes').select({
//                 filterByFormula: `AND(
//                     DATETIME_FORMAT(Date, 'YYYY-MM-DD') = "${today}",
//                     Statut = "VENDU"
//                 )`
//             }).all();
            
//             // Calculs
//             const ventesJour = commandesJour.length;
//             const caJour = commandesJour.reduce((sum, record) => 
//                 sum + (record.fields.Total || 0), 0);
            
//             // Commandes en attente avec colonne "Statut"
//             const enAttente = await base('Commandes').select({
//                 filterByFormula: 'Statut = "EN_ATTENTE"'
//             }).all();
            
//             return {
//                 ca_jour: caJour,
//                 ventes_jour: ventesJour,
//                 commandes_attente: enAttente.length,
//                 derniere_maj: new Date().toISOString()
//             };
            
//         } catch (error) {
//             console.error('Erreur stats:', error);
//             return {
//                 ca_jour: 0,
//                 ventes_jour: 0,
//                 commandes_attente: 0,
//                 derniere_maj: new Date().toISOString()
//             };
//         }
//     }
// }

// // Export singleton
// module.exports = new MultiBoutiquesManager();