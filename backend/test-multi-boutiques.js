// backend/test-multi-boutiques.js
require('dotenv').config();
const multiBoutiques = require('./multi-boutiques');

async function testerAvecVosData() {
    console.log('🧪 Test du système multi-boutiques avec vos données...\n');
    
    try {
        // 1. Tester récupération produits
        console.log('📦 RÉCUPÉRATION PRODUITS:');
        const produits = await multiBoutiques.getProduits('aicha');
        console.log(`Trouvé ${produits.length} produits:`);
        
        produits.forEach((produit, index) => {
            console.log(`${index + 1}. ${produit.emoji} ${produit.nom} (${produit.categorie})`);
            console.log(`   Prix: ${produit.prix.toLocaleString()} GNF | Min: ${produit.prix_minimum.toLocaleString()} GNF`);
            console.log(`   Stock: ${produit.stock} | Couleur: ${produit.couleur}`);
            console.log(`   Tailles: ${produit.tailles?.join(', ') || 'Non spécifié'}`);
            console.log(`   Image: ${produit.image_url ? '✅ Oui' : '❌ Non'}`);
            console.log('');
        });
        
        // 2. Test recherche
        console.log('🔍 TEST RECHERCHE "robe":');
        const robes = await multiBoutiques.rechercherProduits('robe', 'aicha');
        robes.forEach(robe => {
            console.log(`- ${robe.nom} | ${robe.prix.toLocaleString()} GNF | ${robe.couleur}`);
        });
        
        // 3. Test recherche par couleur
        console.log('\n🎨 TEST RECHERCHE "bleu":');
        const produitsBleus = await multiBoutiques.rechercherProduits('bleu', 'aicha');
        produitsBleus.forEach(produit => {
            console.log(`- ${produit.nom} | ${produit.couleur}`);
        });
        
        // 4. Test recherche avec taille (bonus)
        console.log('\n👕 TEST RECHERCHE "robe" taille M:');
        const robesM = await multiBoutiques.rechercherProduitsAvecTaille('robe', 'M', 'aicha');
        robesM.forEach(robe => {
            console.log(`- ${robe.nom} | ${robe.couleur} | Tailles: ${robe.tailles?.join(', ')}`);
        });
        
        // 5. Test création commande (simulation)
        if (produits.length > 0) {
            console.log('\n🛒 TEST CRÉATION COMMANDE:');
            const produitTest = produits[0]; // Premier produit
            
            const commande = await multiBoutiques.creerCommande(
                '+224622123456',
                'Fatou Test',
                [{
                    id: produitTest.id,
                    nom: produitTest.nom,
                    prix: produitTest.prix,
                    quantite: 1
                }],
                produitTest.prix,
                'aicha'
            );
            
            console.log('Commande créée:', commande);
            
            // 6. Test stats
            console.log('\n📊 STATISTIQUES:');
            const stats = await multiBoutiques.getStats('aicha');
            console.log('Stats du jour:', stats);
        }
        
        console.log('\n✅ Tous les tests réussis !');
        
    } catch (error) {
        console.error('❌ Erreur pendant les tests:', error);
    }
}

// Exécuter les tests
testerAvecVosData();