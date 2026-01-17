// backend/test-api.js
const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000';

async function testAPI() {
    console.log('🧪 Test de l\'API PFE FST-UNA\n');
    
    try {
        // 1. Test du statut du serveur
        console.log('1. Test du statut du serveur...');
        const statusRes = await fetch(`${API_URL}/api/status`);
        const statusData = await statusRes.json();
        console.log('✅ Statut:', statusData.status);
        console.log('   Version:', statusData.version);
        console.log('   Serveur:', statusData.server);
        
        // 2. Test de la route GET /api/auth/login
        console.log('\n2. Test de la route GET /api/auth/login...');
        const authGetRes = await fetch(`${API_URL}/api/auth/login`);
        const authGetData = await authGetRes.json();
        console.log('✅ Route GET fonctionnelle');
        console.log('   Message:', authGetData.message);
        
        // 3. Test de la connexion étudiant
        console.log('\n3. Test de connexion étudiant...');
        const loginRes = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'ahmed.salem@etudiant.una.mr',
                password: 'etu123',
                role: 'student'
            })
        });
        
        const loginData = await loginRes.json();
        
        if (loginData.success) {
            console.log('✅ Connexion réussie!');
            console.log('   Utilisateur:', loginData.user.name);
            console.log('   Rôle:', loginData.user.role);
            console.log('   Token reçu:', loginData.token ? 'Oui' : 'Non');
        } else {
            console.log('❌ Échec de connexion:', loginData.message);
        }
        
        // 4. Test des sujets
        console.log('\n4. Test de la liste des sujets...');
        const subjectsRes = await fetch(`${API_URL}/api/subjects`);
        const subjectsData = await subjectsRes.json();
        console.log('✅ Sujets disponibles:', subjectsData.count || subjectsData.subjects?.length || 0);
        
        console.log('\n🎉 Tous les tests terminés avec succès!');
        
    } catch (error) {
        console.error('\n❌ Erreur lors du test:', error.message);
        console.log('\n🔍 Vérifiez que:');
        console.log('   1. Le serveur est démarré (npm run dev)');
        console.log('   2. Le port 3000 n\'est pas utilisé par un autre programme');
        console.log('   3. La base de données est initialisée (npm run init-db)');
    }
}

// Exécuter le test
testAPI();