// Dans la fonction handleIncomingMessage, ajouter ce filtre :
async function handleIncomingMessage(message) {
    const phoneNumber = message.from.replace('@c.us', '');
    const messageBody = message.body.toLowerCase().trim();
    const contact = await message.getContact();
    
    // IGNORER les messages de statut et messages vides
    if (message.from.includes('status@broadcast') || 
        message.from.includes('@g.us') || 
        message.fromMe ||
        !messageBody) {
        return;
    }
    
    console.log(`📞 ${phoneNumber}: ${messageBody}`);
    // ... reste du code
}
