// frontend/js/global-auth.js
// Vérification d'authentification sur toutes les pages

(function() {
    'use strict';
    
    console.log('🔒 Vérification globale d\'authentification');
    
    // Pages qui nécessitent une authentification
    const PROTECTED_PAGES = [
        'dashboard-student.html',
        'dashboard-teacher.html', 
        'dashboard-admin.html'
    ];
    
    // Récupérer la page actuelle
    const currentPage = window.location.pathname.split('/').pop();
    
    // Si c'est une page protégée
    if (PROTECTED_PAGES.includes(currentPage)) {
        const userData = sessionStorage.getItem('pfe_user');
        const token = sessionStorage.getItem('pfe_token');
        
        // Vérifier l'authentification
        if (!userData || !token) {
            console.warn('⛔ Accès non autorisé - Redirection vers login');
            alert('Veuillez vous connecter pour accéder à cette page.');
            window.location.href = 'login.html';
            return;
        }
        
        try {
            const user = JSON.parse(userData);
            const requiredRole = currentPage.replace('dashboard-', '').replace('.html', '');
            
            // Vérifier le rôle
            if (user.role !== requiredRole && user.role !== 'admin') {
                console.warn(`⚠️ Mauvais rôle: ${user.role} au lieu de ${requiredRole}`);
                alert(`Cette page est réservée aux ${requiredRole}s.`);
                window.location.href = `dashboard-${user.role}.html`;
            }
        } catch (error) {
            console.error('❌ Erreur de vérification:', error);
            sessionStorage.clear();
            window.location.href = 'login.html';
        }
    }
    
    // Ajouter la fonction logout globale
    window.logout = function() {
        if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
            sessionStorage.clear();
            localStorage.removeItem('last_login');
            window.location.href = 'login.html';
        }
    };
    
})();