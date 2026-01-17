// frontend/js/auth.js

// Données de démonstration (à remplacer par l'API backend plus tard)
const demoUsers = {
    student: {
        email: "etudiant.demo@etudiant.una.mr",
        password: "demo123",
        name: "Ahmed Salem",
        matricule: "MAT2025001"
    },
    teacher: {
        email: "enseignant.demo@fst.una.mr",
        password: "demo123",
        name: "Dr. Mohamed Ould Ahmed",
        department: "Mathématiques"
    },
    admin: {
        email: "admin.pfe@fst.una.mr",
        password: "admin123",
        name: "Administrateur Système"
    }
};

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 Module d\'authentification initialisé');
    
    // Initialiser les composants
    initRoleSelector();
    initPasswordToggle();
    initLoginForm();
    loadSavedPreferences();
    
    // Vérifier l'état de connexion
    checkAuthStatus();
});

// Gestionnaire du sélecteur de rôle
function initRoleSelector() {
    const roleOptions = document.querySelectorAll('.role-option');
    const roleInput = document.getElementById('userRole');
    
    // Récupérer le rôle depuis l'URL ou localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const urlRole = urlParams.get('role');
    const savedRole = localStorage.getItem('preferredRole') || 'student';
    const initialRole = urlRole || savedRole;
    
    roleOptions.forEach(option => {
        const role = option.dataset.role;
        
        // Sélectionner le rôle initial
        if (role === initialRole) {
            option.classList.add('active');
            if (roleInput) roleInput.value = role;
        }
        
        // Gérer les clics
        option.addEventListener('click', function() {
            // Retirer la classe active de toutes les options
            roleOptions.forEach(opt => opt.classList.remove('active'));
            
            // Ajouter la classe active à l'option cliquée
            this.classList.add('active');
            
            // Mettre à jour le champ caché
            if (roleInput) roleInput.value = role;
            
            // Sauvegarder la préférence
            localStorage.setItem('preferredRole', role);
            
            // Mettre à jour le placeholder de l'email
            updateEmailPlaceholder(role);
            
            console.log(`👤 Rôle sélectionné: ${role}`);
        });
    });
    
    // Mettre à jour le placeholder initial
    updateEmailPlaceholder(initialRole);
}

// Mettre à jour le placeholder de l'email selon le rôle
function updateEmailPlaceholder(role) {
    const emailInput = document.getElementById('email');
    if (!emailInput) return;
    
    switch(role) {
        case 'student':
            emailInput.placeholder = "prenom.nom@etudiant.una.mr";
            break;
        case 'teacher':
            emailInput.placeholder = "prenom.nom@fst.una.mr";
            break;
        case 'admin':
            emailInput.placeholder = "admin@fst.una.mr";
            break;
    }
}

// Basculer la visibilité du mot de passe
function initPasswordToggle() {
    const toggleButton = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    if (toggleButton && passwordInput) {
        toggleButton.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Changer l'icône
            const icon = this.querySelector('i');
            if (type === 'password') {
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            } else {
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            }
        });
    }
}

// Charger les préférences sauvegardées
function loadSavedPreferences() {
    const rememberMe = localStorage.getItem('rememberLogin') === 'true';
    const savedEmail = localStorage.getItem('savedEmail');
    
    const rememberCheckbox = document.getElementById('rememberMe');
    const emailInput = document.getElementById('email');
    
    if (rememberCheckbox) {
        rememberCheckbox.checked = rememberMe;
    }
    
    if (emailInput && savedEmail) {
        emailInput.value = savedEmail;
    }
}

// Initialiser le formulaire de connexion
function initLoginForm() {
    const loginForm = document.getElementById('loginForm');
    
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        // Récupérer les données du formulaire
        const formData = {
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value,
            role: document.getElementById('userRole').value,
            rememberMe: document.getElementById('rememberMe').checked
        };
        
        // Valider le formulaire
        if (!validateLoginForm(formData)) {
            return;
        }
        
        // Sauvegarder les préférences
        if (formData.rememberMe) {
            localStorage.setItem('rememberLogin', 'true');
            localStorage.setItem('savedEmail', formData.email);
        } else {
            localStorage.removeItem('rememberLogin');
            localStorage.removeItem('savedEmail');
        }
        
        // Afficher l'état de chargement
        const submitButton = loginForm.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        submitButton.innerHTML = '<span class="loading-spinner"></span> Connexion en cours...';
        submitButton.disabled = true;
        
        try {
            // Essayer d'abord l'API backend
            await attemptBackendLogin(formData);
        } catch (error) {
            // Fallback: mode démo
            console.log('🔶 Utilisation du mode démo (backend non disponible)');
            simulateDemoLogin(formData);
        } finally {
            // Restaurer le bouton
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
        }
    });
}

// Valider le formulaire
function validateLoginForm(formData) {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    let isValid = true;
    
    // Réinitialiser les états de validation
    emailInput.classList.remove('invalid-field', 'valid-field');
    passwordInput.classList.remove('invalid-field', 'valid-field');
    
    // Valider l'email
    const emailPattern = /[a-zA-Z0-9._%+-]+@(etudiant\.)?(fst\.)?una\.mr/;
    if (!emailPattern.test(formData.email)) {
        showMessage('Veuillez utiliser une adresse email UNA valide (@etudiant.una.mr ou @fst.una.mr)', 'error');
        emailInput.classList.add('invalid-field');
        isValid = false;
    } else {
        emailInput.classList.add('valid-field');
    }
    
    // Valider le mot de passe
    if (formData.password.length < 6) {
        showMessage('Le mot de passe doit contenir au moins 6 caractères', 'error');
        passwordInput.classList.add('invalid-field');
        isValid = false;
    } else {
        passwordInput.classList.add('valid-field');
    }
    
    return isValid;
}

// Tenter une connexion via l'API backend
async function attemptBackendLogin(formData) {
    try {
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            const data = await response.json();
            handleSuccessfulLogin(data);
        } else {
            throw new Error('Identifiants incorrects');
        }
    } catch (error) {
        // Relancer l'erreur pour le fallback
        throw error;
    }
}

// Simulation de connexion (mode démo)
function simulateDemoLogin(formData) {
    // Simuler un délai réseau
    setTimeout(() => {
        const demoUser = demoUsers[formData.role];
        
        if (demoUser && 
            formData.email === demoUser.email && 
            formData.password === demoUser.password) {
            
            // Connexion réussie en mode démo
            const userData = {
                ...demoUser,
                token: 'demo-token-' + Date.now(),
                timestamp: new Date().toISOString()
            };
            
            handleSuccessfulLogin(userData);
        } else {
            // Identifiants incorrects
            showMessage('Email ou mot de passe incorrect', 'error');
            
            // Ajouter des effets visuels
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            
            emailInput.classList.add('invalid-field');
            passwordInput.classList.add('invalid-field');
            
            // Animation de secousse
            emailInput.style.animation = 'shake 0.5s';
            passwordInput.style.animation = 'shake 0.5s';
            
            setTimeout(() => {
                emailInput.style.animation = '';
                passwordInput.style.animation = '';
            }, 500);
        }
    }, 800);
}

// Gérer une connexion réussie
function handleSuccessfulLogin(userData) {
    // Sauvegarder les données utilisateur
    sessionStorage.setItem('pfe_user', JSON.stringify(userData));
    localStorage.setItem('lastLogin', new Date().toISOString());
    
    // Afficher le message de succès
    showMessage(`Connexion réussie ! Bienvenue ${userData.name}`, 'success');
    
    // Rediriger vers le tableau de bord approprié
    console.log(`✅ Connexion réussie: ${userData.name} (${userData.role})`);
    
    // Simulation de redirection
    setTimeout(() => {
        switch(userData.role) {
            case 'student':
                window.location.href = 'dashboard-student.html';
                break;
            case 'teacher':
                window.location.href = 'dashboard-teacher.html';
                break;
            case 'admin':
                window.location.href = 'dashboard-admin.html';
                break;
            default:
                window.location.href = 'index.html';
        }
    }, 1500);
}

// Afficher un message
function showMessage(text, type = 'info') {
    const messageBox = document.getElementById('messageBox');
    const messageText = document.getElementById('messageText');
    
    if (!messageBox || !messageText) return;
    
    // Mettre à jour le contenu
    messageText.textContent = text;
    
    // Mettre à jour le type
    messageBox.className = 'message-box ' + type;
    messageBox.classList.remove('hidden');
    
    // Masquer après 5 secondes pour les messages info/success
    if (type !== 'error') {
        setTimeout(() => {
            messageBox.classList.add('hidden');
        }, 5000);
    }
}

// Vérifier l'état d'authentification
function checkAuthStatus() {
    const userData = sessionStorage.getItem('pfe_user');
    
    if (userData) {
        try {
            const user = JSON.parse(userData);
            console.log(`👤 Utilisateur déjà connecté: ${user.name}`);
            
            // Rediriger si nécessaire
            if (!window.location.href.includes('dashboard')) {
                showMessage(`Vous êtes déjà connecté en tant que ${user.name}`, 'info');
            }
        } catch (error) {
            console.error('Erreur de parsing des données utilisateur:', error);
            sessionStorage.removeItem('pfe_user');
        }
    }
}

// Déconnexion (fonction utilitaire)
function logout() {
    sessionStorage.removeItem('pfe_user');
    localStorage.removeItem('lastLogin');
    window.location.href = 'login.html';
}

// Vérifier les permissions
function checkPermission(requiredRole) {
    const userData = sessionStorage.getItem('pfe_user');
    
    if (!userData) {
        window.location.href = 'login.html';
        return false;
    }
    
    try {
        const user = JSON.parse(userData);
        if (user.role !== requiredRole && user.role !== 'admin') {
            showMessage('Vous n\'avez pas les permissions nécessaires', 'error');
            return false;
        }
        return true;
    } catch (error) {
        window.location.href = 'login.html';
        return false;
    }
}

// Exporter les fonctions pour une utilisation externe
window.AuthModule = {
    logout,
    checkPermission,
    getUser: function() {
        const userData = sessionStorage.getItem('pfe_user');
        return userData ? JSON.parse(userData) : null;
    },
    isAuthenticated: function() {
        return !!sessionStorage.getItem('pfe_user');
    }
};

// Ajouter l'animation de secousse au CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);