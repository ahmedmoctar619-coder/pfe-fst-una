// frontend/js/main.js

// Données temporaires pour la démonstration
const demoStats = {
    projects: 24,
    students: 156,
    teachers: 18
};

// Initialisation lorsque la page est chargée
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Système PFE FST-UNA initialisé');
    
    // Mettre à jour les statistiques avec animation
    updateStatsWithAnimation();
    
    // Vérifier le rôle dans l'URL pour pré-remplir la connexion
    checkRoleFromURL();
    
    // Initialiser les interactions
    initInteractiveElements();
    
    // Tester la connexion API
    testAPIconnection();
});

// Animation des statistiques
function updateStatsWithAnimation() {
    const projectsElement = document.getElementById('stat-projects');
    const studentsElement = document.getElementById('stat-students');
    const teachersElement = document.getElementById('stat-teachers');
    
    if (projectsElement) animateCounter(projectsElement, demoStats.projects, 1000);
    if (studentsElement) animateCounter(studentsElement, demoStats.students, 1500);
    if (teachersElement) animateCounter(teachersElement, demoStats.teachers, 2000);
}

// Animation de compteur
function animateCounter(element, target, duration) {
    const start = 0;
    const increment = target / (duration / 16); // 60fps
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
}

// Vérifier le rôle depuis l'URL
function checkRoleFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const role = urlParams.get('role');
    
    if (role) {
        console.log(`👤 Rôle détecté dans l'URL: ${role}`);
        // Cette information sera utilisée sur la page de connexion
        localStorage.setItem('preferredRole', role);
    }
}

// Initialiser les éléments interactifs
function initInteractiveElements() {
    // Ajouter un effet de clic sur les cartes
    const cards = document.querySelectorAll('.role-card');
    cards.forEach(card => {
        card.addEventListener('click', function() {
            const link = this.querySelector('a.btn');
            if (link) {
                window.location.href = link.href;
            }
        });
    });
    
    // Ajouter la date actuelle dans le footer
    const currentYear = new Date().getFullYear();
    const yearElement = document.querySelector('.footer-bottom p:first-child');
    if (yearElement) {
        yearElement.innerHTML = yearElement.innerHTML.replace('2025-2026', `2025-${currentYear}`);
    }
}

// Tester la connexion à l'API backend
async function testAPIconnection() {
    try {
        // Cette URL devra être mise à jour lorsque le backend sera en ligne
        const response = await fetch('http://localhost:3000/api/status');
        if (response.ok) {
            const data = await response.json();
            console.log('🌐 API Backend connectée:', data);
        }
    } catch (error) {
        console.log('⚠️ API Backend non disponible (mode démo activé)');
        console.log('   Le backend sera développé dans les prochaines étapes');
    }
}

// Fonction utilitaire pour formater les dates
function formatDate(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
}

// Exporter les fonctions pour une utilisation externe
window.PFEApp = {
    formatDate,
    testAPIconnection,
    demoStats
};