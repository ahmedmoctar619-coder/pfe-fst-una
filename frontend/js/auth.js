// ============================================
// frontend/js/auth.js - VERSION CORRIGÉE ET PERMANENTE
// Système d'authentification PFE FST-UNA
// ============================================

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Données de démonstration (fallback)
const demoUsers = {
    student: {
        id: 4,
        email: "ahmed.salem@etudiant.una.mr",
        password: "etu123",
        name: "Ahmed Salem",
        role: "student",
        matricule: "MAT2025001",
        department: "Mathématiques",
        year: "Master 1",
        status: "active",
        token: "demo-token-student-2025"
    },
    teacher: {
        id: 2,
        email: "mohamed.ouldahmed@fst.una.mr",
        password: "prof123",
        name: "Dr. Mohamed Ould Ahmed",
        role: "teacher",
        department: "Mathématiques",
        specialization: "Analyse Mathématique",
        status: "active",
        token: "demo-token-teacher-2025"
    },
    admin: {
        id: 3,
        email: "admin.pfe@fst.una.mr",
        password: "admin123",
        name: "Administrateur Système",
        role: "admin",
        department: "Informatique",
        status: "active",
        token: "demo-token-admin-2025"
    }
};

// ==================== INITIALISATION ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 Module d\'authentification PFE FST-UNA initialisé');
    
    // Initialiser les composants
    initRoleSelector();
    initPasswordToggle();
    initLoginForm();
    loadSavedPreferences();
    
    // Vérifier si déjà connecté
    checkExistingSession();
});

// ==================== SÉLECTEUR DE RÔLE ====================
function initRoleSelector() {
    const roleOptions = document.querySelectorAll('.role-option');
    const roleInput = document.getElementById('userRole');
    
    if (!roleOptions.length || !roleInput) return;
    
    // Rôle par défaut
    const savedRole = localStorage.getItem('preferredRole') || 'student';
    
    roleOptions.forEach(option => {
        const role = option.dataset.role;
        
        // Sélection initiale
        if (role === savedRole) {
            option.classList.add('active');
            roleInput.value = role;
        }
        
        // Gestion du clic
        option.addEventListener('click', function() {
            roleOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            roleInput.value = role;
            localStorage.setItem('preferredRole', role);
            updateEmailPlaceholder(role);
        });
    });
    
    updateEmailPlaceholder(savedRole);
}

function updateEmailPlaceholder(role) {
    const emailInput = document.getElementById('email');
    if (!emailInput) return;
    
    const placeholders = {
        student: "prenom.nom@etudiant.una.mr",
        teacher: "prenom.nom@fst.una.mr",
        admin: "admin@fst.una.mr"
    };
    
    emailInput.placeholder = placeholders[role] || "email@una.mr";
}

// ==================== TOGGLE MOT DE PASSE ====================
function initPasswordToggle() {
    const toggleBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    if (toggleBtn && passwordInput) {
        toggleBtn.addEventListener('click', function() {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            
            const icon = this.querySelector('i');
            icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
        });
    }
}

// ==================== FORMULAIRE DE CONNEXION ====================
function initLoginForm() {
    const loginForm = document.getElementById('loginForm');
    
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        event.stopPropagation();
        
        // Récupérer les données
        const formData = {
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value,
            role: document.getElementById('userRole').value,
            rememberMe: document.getElementById('rememberMe')?.checked || false
        };
        
        // Validation
        if (!validateForm(formData)) {
            return;
        }
        
        // Sauvegarder préférences
        savePreferences(formData);
        
        // Désactiver le bouton
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...';
        submitBtn.disabled = true;
        
        try {
            // Essayer d'abord l'API backend
            await loginWithAPI(formData);
        } catch (apiError) {
            console.log('⚠️ Fallback au mode démo');
            await loginWithDemo(formData);
        } finally {
            // Réactiver le bouton
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

// ==================== VALIDATION ====================
function validateForm(formData) {
    let isValid = true;
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    // Réinitialiser
    emailInput?.classList.remove('invalid-field', 'valid-field');
    passwordInput?.classList.remove('invalid-field', 'valid-field');
    
    // Valider email
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(formData.email)) {
        showMessage('Adresse email invalide', 'error');
        emailInput?.classList.add('invalid-field');
        isValid = false;
    } else {
        emailInput?.classList.add('valid-field');
    }
    
    // Valider mot de passe
    if (formData.password.length < 6) {
        showMessage('Le mot de passe doit contenir au moins 6 caractères', 'error');
        passwordInput?.classList.add('invalid-field');
        isValid = false;
    } else {
        passwordInput?.classList.add('valid-field');
    }
    
    return isValid;
}

// ==================== CONNEXION API ====================
async function loginWithAPI(formData) {
    console.log('🌐 Tentative de connexion via API...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: formData.email,
                password: formData.password,
                role: formData.role
            })
        });
        
        console.log('📊 Réponse API:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erreur de connexion');
        }
        
        const data = await response.json();
        console.log('✅ Connexion API réussie:', data);
        
        if (data.success && data.user && data.token) {
            handleSuccessfulLogin({
                ...data.user,
                token: data.token
            });
        } else {
            throw new Error('Données de connexion incomplètes');
        }
        
    } catch (error) {
        console.error('❌ Erreur API:', error);
        throw error; // Propage pour le fallback
    }
}

// ==================== CONNEXION DÉMO ====================
async function loginWithDemo(formData) {
    console.log('🎭 Utilisation du mode démo...');
    
    // Simuler un délai réseau
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const demoUser = demoUsers[formData.role];
    
    if (demoUser && 
        formData.email.toLowerCase() === demoUser.email.toLowerCase() && 
        formData.password === demoUser.password) {
        
        console.log('✅ Connexion démo réussie');
        handleSuccessfulLogin(demoUser);
        
    } else {
        showMessage('Identifiants incorrects', 'error');
        shakeForm();
    }
}

// ==================== GESTION CONNEXION RÉUSSIE ====================
function handleSuccessfulLogin(userData) {
    console.log('🎉 CONNEXION RÉUSSIE - Données:', userData);
    
    // 1. Sauvegarder les données
    sessionStorage.setItem('pfe_user', JSON.stringify(userData));
    sessionStorage.setItem('pfe_token', userData.token);
    localStorage.setItem('last_login', new Date().toISOString());
    
    // 2. Afficher message
    showMessage(`Connexion réussie ! Bienvenue ${userData.name}`, 'success');
    
    // 3. Déterminer la page de destination
    const dashboardPages = {
        student: 'dashboard-student.html',
        teacher: 'dashboard-teacher.html',
        admin: 'dashboard-admin.html'
    };
    
    const redirectPage = dashboardPages[userData.role] || 'index.html';
    
    // 4. Rediriger après délai
    setTimeout(() => {
        console.log(`🔀 Redirection vers: ${redirectPage}`);
        window.location.href = redirectPage;
    }, 1500);
}

// ==================== VÉRIFICATION SESSION ====================
function checkExistingSession() {
    const userData = sessionStorage.getItem('pfe_user');
    const token = sessionStorage.getItem('pfe_token');
    
    if (userData && token) {
        try {
            const user = JSON.parse(userData);
            console.log(`👤 Session existante: ${user.name} (${user.role})`);
            
            // Si sur login.html, suggérer la redirection
            if (window.location.pathname.includes('login.html')) {
                setTimeout(() => {
                    if (confirm(`Vous êtes déjà connecté en tant que ${user.name}. Voulez-vous aller à votre tableau de bord ?`)) {
                        const dashboardPages = {
                            student: 'dashboard-student.html',
                            teacher: 'dashboard-teacher.html',
                            admin: 'dashboard-admin.html'
                        };
                        window.location.href = dashboardPages[user.role] || 'index.html';
                    }
                }, 1000);
            }
        } catch (error) {
            console.error('❌ Erreur session:', error);
            clearSession();
        }
    }
}

// ==================== UTILITAIRES ====================
function loadSavedPreferences() {
    const rememberMe = localStorage.getItem('rememberLogin') === 'true';
    const savedEmail = localStorage.getItem('savedEmail');
    
    const rememberCheckbox = document.getElementById('rememberMe');
    const emailInput = document.getElementById('email');
    
    if (rememberCheckbox) rememberCheckbox.checked = rememberMe;
    if (emailInput && savedEmail) emailInput.value = savedEmail;
}

function savePreferences(formData) {
    if (formData.rememberMe) {
        localStorage.setItem('rememberLogin', 'true');
        localStorage.setItem('savedEmail', formData.email);
    } else {
        localStorage.removeItem('rememberLogin');
        localStorage.removeItem('savedEmail');
    }
}

function shakeForm() {
    const inputs = document.querySelectorAll('.form-group input');
    inputs.forEach(input => {
        input.style.animation = 'shake 0.5s';
        setTimeout(() => input.style.animation = '', 500);
    });
}

function clearSession() {
    sessionStorage.removeItem('pfe_user');
    sessionStorage.removeItem('pfe_token');
}

// ==================== AFFICHAGE MESSAGES ====================
function showMessage(text, type = 'info') {
    const messageBox = document.getElementById('messageBox');
    const messageText = document.getElementById('messageText');
    
    if (!messageBox || !messageText) {
        // Créer un message temporaire
        const tempMsg = document.createElement('div');
        tempMsg.className = `temp-message ${type}`;
        tempMsg.innerHTML = `
            <i class="fas fa-${getMessageIcon(type)}"></i>
            <span>${text}</span>
        `;
        
        tempMsg.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease;
            background-color: ${getMessageColor(type)};
        `;
        
        document.body.appendChild(tempMsg);
        
        setTimeout(() => {
            tempMsg.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => tempMsg.remove(), 300);
        }, 5000);
        
        return;
    }
    
    // Utiliser la boîte de message existante
    messageText.textContent = text;
    messageBox.className = `message-box ${type}`;
    messageBox.classList.remove('hidden');
    
    if (type !== 'error') {
        setTimeout(() => messageBox.classList.add('hidden'), 5000);
    }
}

function getMessageIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function getMessageColor(type) {
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    return colors[type] || '#17a2b8';
}

// ==================== ANIMATIONS CSS ====================
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .temp-message {
        display: flex;
        align-items: center;
        gap: 10px;
    }
`;
document.head.appendChild(style);

// ==================== EXPORT POUR CONSOLE ====================
window.AuthSystem = {
    testLogin: function(role = 'student') {
        const credentials = {
            student: { email: 'ahmed.salem@etudiant.una.mr', password: 'etu123' },
            teacher: { email: 'mohamed.ouldahmed@fst.una.mr', password: 'prof123' },
            admin: { email: 'admin.pfe@fst.una.mr', password: 'admin123' }
        };
        
        const creds = credentials[role];
        if (creds) {
            document.getElementById('email').value = creds.email;
            document.getElementById('password').value = creds.password;
            document.getElementById('userRole').value = role;
            
            // Sélectionner le rôle visuellement
            document.querySelectorAll('.role-option').forEach(opt => {
                opt.classList.toggle('active', opt.dataset.role === role);
            });
            
            console.log(`🔧 Auto-remplissage pour ${role}`);
        }
    },
    
    clearSession: function() {
        clearSession();
        localStorage.removeItem('last_login');
        console.log('🧹 Session nettoyée');
    },
    
    getCurrentUser: function() {
        const userData = sessionStorage.getItem('pfe_user');
        return userData ? JSON.parse(userData) : null;
    }
};

console.log('✅ AuthSystem prêt. Utilisez AuthSystem.testLogin("student") pour tester.');