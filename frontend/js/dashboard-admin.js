// frontend/js/dashboard-admin.js

class AdminDashboard {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'dashboard';
        this.users = [];
        this.currentPage = 1;
        this.totalPages = 1;
        
        // Configuration API
        this.API_BASE_URL = 'http://localhost:3000/api';
        
        // Chart.js instances
        this.roleChart = null;
        this.activityChart = null;
        
        this.init();
    }

    // Initialisation
    async init() {
        console.log('👑 Dashboard administrateur initialisé');
        
        // Vérifier l'authentification
        await this.checkAuthentication();
        
        // Initialiser les événements
        this.initEvents();
        
        // Charger les données initiales
        await this.loadInitialData();
        
        // Mettre à jour l'interface
        this.updateUserInfo();
        this.loadSection(this.currentSection);
        
        // Mettre à jour l'heure du serveur
        this.updateServerTime();
        setInterval(() => this.updateServerTime(), 60000); // Toutes les minutes
    }

    // Vérifier l'authentification
    async checkAuthentication() {
        const userData = sessionStorage.getItem('pfe_user');
        const token = sessionStorage.getItem('pfe_token');
        
        if (!userData || !token) {
            this.redirectToLogin();
            return;
        }
        
        try {
            this.currentUser = JSON.parse(userData);
            
            // Vérifier le rôle
            if (this.currentUser.role !== 'admin') {
                console.error('❌ Accès non autorisé: rôle non administrateur');
                this.redirectToLogin();
                return;
            }
            
            // Vérifier si le token est encore valide
            const response = await fetch(`${this.API_BASE_URL}/auth/verify`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Session invalide');
            }
            
        } catch (error) {
            console.error('❌ Erreur d\'authentification:', error);
            sessionStorage.removeItem('pfe_user');
            sessionStorage.removeItem('pfe_token');
            this.redirectToLogin();
        }
    }

    // Rediriger vers la page de connexion
    redirectToLogin() {
        window.location.href = 'login.html';
    }

    // Initialiser les événements
    initEvents() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                this.loadSection(section);
            });
        });

        // Déconnexion
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Ajouter un utilisateur
        document.getElementById('addUserBtn')?.addEventListener('click', () => {
            this.showUserForm();
        });

        // Recherche d'utilisateurs
        const searchInput = document.getElementById('userSearch');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.loadUsers();
            }, 300));
        }

        // Filtres d'utilisateurs
        document.getElementById('userRoleFilter')?.addEventListener('change', () => {
            this.loadUsers();
        });

        document.getElementById('userStatusFilter')?.addEventListener('change', () => {
            this.loadUsers();
        });

        // Actualiser les alertes
        document.getElementById('refreshAlertsBtn')?.addEventListener('click', () => {
            this.loadSystemAlerts();
        });

        // Pagination
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('page-btn')) {
                const page = parseInt(e.target.dataset.page);
                if (page && page !== this.currentPage) {
                    this.currentPage = page;
                    this.loadUsers();
                }
            }
        });

        // Fermer le modal
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('userModal');
            if (e.target === modal) {
                this.closeUserModal();
            }
        });
    }

    // Mettre à jour les informations utilisateur
    updateUserInfo() {
        if (!this.currentUser) return;

        const userName = document.getElementById('userName');
        if (userName) userName.textContent = this.currentUser.name;
    }

    // Mettre à jour l'heure du serveur
    updateServerTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        const dateString = now.toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        document.getElementById('serverTime').textContent = `${dateString} ${timeString}`;
    }

    // Charger les données initiales
    async loadInitialData() {
        try {
            // Charger les statistiques
            await this.loadAdminStats();
            
            // Charger les alertes système
            await this.loadSystemAlerts();
            
            // Charger les logs récents
            await this.loadRecentLogs();
            
        } catch (error) {
            console.error('❌ Erreur chargement données initiales:', error);
        }
    }

    // Charger une section
    loadSection(sectionId) {
        // Mettre à jour la navigation active
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.section === sectionId);
        });

        // Masquer toutes les sections
        document.querySelectorAll('.dashboard-section').forEach(section => {
            section.classList.remove('active');
        });

        // Afficher la section sélectionnée
        const activeSection = document.getElementById(sectionId);
        if (activeSection) {
            activeSection.classList.add('active');
            this.currentSection = sectionId;

            // Charger les données spécifiques à la section
            switch(sectionId) {
                case 'users':
                    this.loadUsers();
                    break;
                case 'reports':
                    this.loadReports();
                    break;
            }
        }
    }

    // Débounce pour les événements
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ===== FONCTIONNALITÉS D'AUTHENTIFICATION =====

    // Déconnexion
    async logout() {
        try {
            const token = sessionStorage.getItem('pfe_token');
            
            if (token) {
                await fetch(`${this.API_BASE_URL}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            }
            
        } catch (error) {
            console.error('❌ Erreur déconnexion:', error);
        } finally {
            // Nettoyer le stockage
            sessionStorage.removeItem('pfe_user');
            sessionStorage.removeItem('pfe_token');
            
            // Rediriger vers la page de connexion
            this.redirectToLogin();
        }
    }

    // ===== FONCTIONNALITÉS DES STATISTIQUES =====

    // Charger les statistiques admin
    async loadAdminStats() {
        try {
            const token = sessionStorage.getItem('pfe_token');
            const response = await fetch(`${this.API_BASE_URL}/protected/admin/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des statistiques');
            }

            const data = await response.json();
            this.updateStatsDisplay(data.stats);

        } catch (error) {
            console.error('❌ Erreur chargement statistiques:', error);
            // Données de démonstration
            this.updateStatsDisplay({
                total_users: 45,
                students: 35,
                teachers: 8,
                admins: 2,
                total_projects: 24,
                active_projects: 15,
                completed_projects: 9,
                system_status: 'online',
                database_status: 'connected',
                storage_usage: 15.2,
                recent_logins: 12,
                today_logins: 3,
                system_alerts: 1
            });
        }
    }

    // Mettre à jour l'affichage des statistiques
    updateStatsDisplay(stats) {
        // Statistiques utilisateurs
        document.getElementById('totalUsers').textContent = stats.total_users || 0;
        document.getElementById('studentCount').textContent = stats.students || 0;
        document.getElementById('teacherCount').textContent = stats.teachers || 0;
        
        // Statistiques projets
        document.getElementById('totalProjects').textContent = stats.total_projects || 0;
        document.getElementById('activeProjects').textContent = stats.active_projects || 0;
        document.getElementById('completedProjects').textContent = stats.completed_projects || 0;
        
        // État système
        document.getElementById('systemStatus').textContent = stats.system_status === 'online' ? 'En ligne' : 'Hors ligne';
        document.getElementById('systemStatus').style.color = stats.system_status === 'online' ? 'var(--success)' : 'var(--danger)';
        
        document.getElementById('databaseStatus').textContent = stats.database_status === 'connected' ? 'Connecté' : 'Déconnecté';
        document.getElementById('databaseStatus').style.color = stats.database_status === 'connected' ? 'var(--success)' : 'var(--danger)';
        
        document.getElementById('storageUsage').textContent = `${stats.storage_usage || 0}%`;
        
        // Activité
        document.getElementById('recentLogins').textContent = stats.recent_logins || 0;
        document.getElementById('todayLogins').textContent = stats.today_logins || 0;
        document.getElementById('systemAlerts').textContent = stats.system_alerts || 0;
        
        // Mettre à jour les utilisateurs en ligne
        document.getElementById('onlineUsers').textContent = stats.online_users || Math.floor(Math.random() * 10) + 1;
    }

    // ===== FONCTIONNALITÉS DES ALERTES =====

    // Charger les alertes système
    async loadSystemAlerts() {
        try {
            // Simulation - à remplacer par une vraie API
            const alerts = [
                {
                    id: 1,
                    level: 'info',
                    title: 'Sauvegarde automatique',
                    message: 'La sauvegarde quotidienne a été effectuée avec succès',
                    time: 'Aujourd\'hui, 02:00'
                },
                {
                    id: 2,
                    level: 'warning',
                    title: 'Espace disque',
                    message: 'L\'espace disque est utilisé à 85%. Pensez à nettoyer les anciens fichiers.',
                    time: 'Hier, 14:30'
                },
                {
                    id: 3,
                    level: 'info',
                    title: 'Mise à jour sécurité',
                    message: 'Les mises à jour de sécurité ont été appliquées',
                    time: 'Il y a 2 jours'
                }
            ];

            this.renderSystemAlerts(alerts);

        } catch (error) {
            console.error('❌ Erreur chargement alertes:', error);
        }
    }

    // Afficher les alertes système
    renderSystemAlerts(alerts) {
        const container = document.getElementById('alertsList');
        if (!container) return;

        if (alerts.length === 0) {
            container.innerHTML = `
                <div class="alert success">
                    <i class="fas fa-check-circle"></i>
                    <div class="alert-content">
                        <div class="alert-title">Aucune alerte</div>
                        <div class="alert-message">Le système fonctionne normalement</div>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = alerts.map(alert => `
            <div class="alert ${alert.level}">
                <i class="fas fa-${this.getAlertIcon(alert.level)}"></i>
                <div class="alert-content">
                    <div class="alert-title">${alert.title}</div>
                    <div class="alert-message">${alert.message}</div>
                    <div class="alert-time">${alert.time}</div>
                </div>
            </div>
        `).join('');
    }

    // Obtenir l'icône d'alerte
    getAlertIcon(level) {
        switch(level) {
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            case 'success': return 'check-circle';
            default: return 'info-circle';
        }
    }

    // ===== FONCTIONNALITÉS DES UTILISATEURS =====

    // Charger les utilisateurs
    async loadUsers() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="loading-cell">
                    <i class="fas fa-spinner fa-spin"></i> Chargement des utilisateurs...
                </td>
            </tr>
        `;

        try {
            const token = sessionStorage.getItem('pfe_token');
            const role = document.getElementById('userRoleFilter')?.value || 'all';
            const status = document.getElementById('userStatusFilter')?.value || 'all';
            const search = document.getElementById('userSearch')?.value || '';
            
            let url = `${this.API_BASE_URL}/protected/admin/users?page=${this.currentPage}&limit=10`;
            
            if (role !== 'all') url += `&role=${role}`;
            if (status !== 'all') url += `&status=${status}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des utilisateurs');
            }

            const data = await response.json();
            this.users = data.users || [];
            this.totalPages = data.totalPages || 1;

            this.renderUsersTable();
            this.renderUsersPagination();

        } catch (error) {
            console.error('❌ Erreur chargement utilisateurs:', error);
            
            // Données de démonstration
            this.users = [
                {
                    id: 1,
                    name: 'Ahmed Salem',
                    email: 'ahmed.salem@etudiant.una.mr',
                    role: 'student',
                    status: 'active',
                    created_at: '2025-01-15'
                },
                {
                    id: 2,
                    name: 'Dr. Mohamed Ould Ahmed',
                    email: 'mohamed.ouldahmed@fst.una.mr',
                    role: 'teacher',
                    status: 'active',
                    created_at: '2025-01-01'
                },
                {
                    id: 3,
                    name: 'Administrateur Système',
                    email: 'admin.pfe@fst.una.mr',
                    role: 'admin',
                    status: 'active',
                    created_at: '2025-01-01'
                },
                {
                    id: 4,
                    name: 'Fatimata Mint Ali',
                    email: 'fatimata.mintali@etudiant.una.mr',
                    role: 'student',
                    status: 'inactive',
                    created_at: '2025-01-20'
                }
            ];

            this.renderUsersTable();
            this.renderUsersPagination();
        }
    }

    // Afficher le tableau des utilisateurs
    renderUsersTable() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        if (this.users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-users"></i>
                        <p>Aucun utilisateur trouvé</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.users.map(user => `
            <tr>
                <td>
                    <div class="user-name">${user.name}</div>
                </td>
                <td>
                    <div class="user-email">${user.email}</div>
                </td>
                <td>
                    <span class="user-role-badge role-${user.role}">
                        ${this.getRoleText(user.role)}
                    </span>
                </td>
                <td>
                    <span class="user-status-badge status-${user.status}">
                        ${user.status === 'active' ? 'Actif' : 'Inactif'}
                    </span>
                </td>
                <td>
                    <div class="user-date">
                        ${new Date(user.created_at).toLocaleDateString('fr-FR')}
                    </div>
                </td>
                <td>
                    <div class="user-actions">
                        <button class="btn-user-action" onclick="admin.editUser(${user.id})">
                            <i class="fas fa-edit"></i>
                            <span>Modifier</span>
                        </button>
                        ${user.role !== 'admin' ? `
                        <button class="btn-user-action" onclick="admin.toggleUserStatus(${user.id})">
                            <i class="fas fa-power-off"></i>
                            <span>${user.status === 'active' ? 'Désactiver' : 'Activer'}</span>
                        </button>
                        ` : ''}
                        <button class="btn-user-action delete" onclick="admin.deleteUser(${user.id})">
                            <i class="fas fa-trash"></i>
                            <span>Supprimer</span>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Afficher la pagination des utilisateurs
    renderUsersPagination() {
        const container = document.getElementById('usersPagination');
        if (!container) return;

        if (this.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '';

        // Bouton précédent
        if (this.currentPage > 1) {
            html += `<button class="page-btn" data-page="${this.currentPage - 1}">Précédent</button>`;
        }

        // Pages
        for (let i = 1; i <= this.totalPages; i++) {
            if (i === 1 || i === this.totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
                html += `<button class="page-btn ${i === this.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
            }
        }

        // Bouton suivant
        if (this.currentPage < this.totalPages) {
            html += `<button class="page-btn" data-page="${this.currentPage + 1}">Suivant</button>`;
        }

        container.innerHTML = html;
    }

    // Obtenir le texte du rôle
    getRoleText(role) {
        const roleMap = {
            'student': 'Étudiant',
            'teacher': 'Enseignant',
            'admin': 'Administrateur'
        };
        return roleMap[role] || 'Inconnu';
    }

    // Afficher le formulaire d'utilisateur
    showUserForm(userId = null) {
        const modal = document.getElementById('userModal');
        const title = document.getElementById('userModalTitle');
        const form = document.getElementById('userForm');

        if (!modal || !title || !form) return;

        if (userId) {
            // Mode édition
            const user = this.users.find(u => u.id === userId);
            if (!user) return;

            title.textContent = 'Modifier l\'utilisateur';
            form.innerHTML = this.getUserFormHTML(user);
        } else {
            // Mode création
            title.textContent = 'Nouvel utilisateur';
            form.innerHTML = this.getUserFormHTML();
        }

        modal.classList.add('active');
    }

    // Obtenir le HTML du formulaire d'utilisateur
    getUserFormHTML(user = null) {
        return `
            <div class="form-group">
                <label for="userName">Nom complet *</label>
                <input type="text" id="userName" 
                       value="${user ? user.name : ''}" 
                       placeholder="Ex: Ahmed Salem"
                       required>
            </div>
            
            <div class="form-group">
                <label for="userEmail">Adresse email *</label>
                <input type="email" id="userEmail" 
                       value="${user ? user.email : ''}" 
                       placeholder="exemple@etudiant.una.mr ou exemple@fst.una.mr"
                       required>
                <small class="form-hint">Utilisez le format email UNA</small>
            </div>
            
            <div class="form-group">
                <label for="userRole">Rôle *</label>
                <select id="userRole" required>
                    <option value="student" ${user?.role === 'student' ? 'selected' : ''}>Étudiant</option>
                    <option value="teacher" ${user?.role === 'teacher' ? 'selected' : ''}>Enseignant</option>
                    <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Administrateur</option>
                </select>
            </div>
            
            ${!user ? `
            <div class="form-group">
                <label for="userPassword">Mot de passe *</label>
                <input type="password" id="userPassword" 
                       placeholder="Mot de passe temporaire"
                       required minlength="6">
                <small class="form-hint">Minimum 6 caractères</small>
            </div>
            
            <div class="form-group">
                <label for="userConfirmPassword">Confirmer le mot de passe *</label>
                <input type="password" id="userConfirmPassword" 
                       placeholder="Retapez le mot de passe"
                       required minlength="6">
            </div>
            ` : ''}
            
            <div class="form-group">
                <label for="userStatus">Statut</label>
                <select id="userStatus">
                    <option value="active" ${!user || user.status === 'active' ? 'selected' : ''}>Actif</option>
                    <option value="inactive" ${user?.status === 'inactive' ? 'selected' : ''}>Inactif</option>
                </select>
            </div>
            
            ${user?.role === 'student' ? `
            <div class="form-group">
                <label for="userMatricule">Matricule</label>
                <input type="text" id="userMatricule" 
                       value="${user.matricule || ''}" 
                       placeholder="Ex: MAT2025001">
            </div>
            ` : ''}
            
            <div class="form-note">
                <p><i class="fas fa-info-circle"></i> Les champs marqués d'un * sont obligatoires.</p>
            </div>
            
            <input type="hidden" id="userId" value="${user ? user.id : ''}">
        `;
    }

    // Fermer le modal utilisateur
    closeUserModal() {
        const modal = document.getElementById('userModal');
        if (modal) {
            modal.classList.remove('active');
            document.getElementById('userForm').reset();
        }
    }

    // Enregistrer un utilisateur
    async saveUser() {
        try {
            const userId = document.getElementById('userId').value;
            const formData = {
                name: document.getElementById('userName').value.trim(),
                email: document.getElementById('userEmail').value.trim(),
                role: document.getElementById('userRole').value,
                status: document.getElementById('userStatus').value
            };

            // Validation
            if (!formData.name || !formData.email || !formData.role) {
                this.showMessage('Tous les champs obligatoires doivent être remplis', 'error');
                return;
            }

            // Vérifier le format email pour les étudiants
            if (formData.role === 'student' && !formData.email.includes('@etudiant.una.mr')) {
                this.showMessage('Les étudiants doivent utiliser une adresse @etudiant.una.mr', 'error');
                return;
            }

            // Vérifier le format email pour les enseignants
            if (formData.role === 'teacher' && !formData.email.includes('@fst.una.mr')) {
                this.showMessage('Les enseignants doivent utiliser une adresse @fst.una.mr', 'error');
                return;
            }

            // Pour la création, vérifier le mot de passe
            if (!userId) {
                const password = document.getElementById('userPassword').value;
                const confirmPassword = document.getElementById('userConfirmPassword').value;
                
                if (!password || !confirmPassword) {
                    this.showMessage('Le mot de passe est obligatoire', 'error');
                    return;
                }
                
                if (password.length < 6) {
                    this.showMessage('Le mot de passe doit contenir au moins 6 caractères', 'error');
                    return;
                }
                
                if (password !== confirmPassword) {
                    this.showMessage('Les mots de passe ne correspondent pas', 'error');
                    return;
                }
                
                formData.password = password;
            }

            // Ajouter le matricule pour les étudiants
            if (formData.role === 'student') {
                const matricule = document.getElementById('userMatricule')?.value.trim();
                if (matricule) {
                    formData.matricule = matricule;
                }
            }

            const token = sessionStorage.getItem('pfe_token');
            const url = userId ? 
                `${this.API_BASE_URL}/protected/admin/users/${userId}` :
                `${this.API_BASE_URL}/protected/admin/users`;
            
            const method = userId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Erreur lors de l\'enregistrement de l\'utilisateur');
            }

            this.showMessage(
                userId ? 'Utilisateur modifié avec succès' : 'Utilisateur créé avec succès', 
                'success'
            );
            
            this.closeUserModal();
            await this.loadUsers();
            await this.loadAdminStats();

        } catch (error) {
            console.error('❌ Erreur sauvegarde utilisateur:', error);
            this.showMessage(error.message || 'Erreur lors de l\'enregistrement de l\'utilisateur', 'error');
        }
    }

    // Éditer un utilisateur
    editUser(userId) {
        this.showUserForm(userId);
    }

    // Basculer le statut d'un utilisateur
    async toggleUserStatus(userId) {
        try {
            const user = this.users.find(u => u.id === userId);
            if (!user) return;

            const newStatus = user.status === 'active' ? 'inactive' : 'active';
            const confirmMessage = newStatus === 'inactive' ? 
                'Êtes-vous sûr de vouloir désactiver cet utilisateur ?' :
                'Êtes-vous sûr de vouloir réactiver cet utilisateur ?';

            if (!confirm(confirmMessage)) {
                return;
            }

            const token = sessionStorage.getItem('pfe_token');
            const response = await fetch(`${this.API_BASE_URL}/protected/admin/users/${userId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                throw new Error('Erreur lors du changement de statut');
            }

            this.showMessage(
                newStatus === 'inactive' ? 'Utilisateur désactivé' : 'Utilisateur réactivé',
                'success'
            );
            
            await this.loadUsers();

        } catch (error) {
            console.error('❌ Erreur changement statut:', error);
            this.showMessage(error.message || 'Erreur lors du changement de statut', 'error');
        }
    }

    // Supprimer un utilisateur
    async deleteUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${user.name}" ? Cette action est irréversible.`)) {
            return;
        }

        try {
            const token = sessionStorage.getItem('pfe_token');
            const response = await fetch(`${this.API_BASE_URL}/protected/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la suppression de l\'utilisateur');
            }

            this.showMessage('Utilisateur supprimé avec succès', 'success');
            await this.loadUsers();
            await this.loadAdminStats();

        } catch (error) {
            console.error('❌ Erreur suppression utilisateur:', error);
            this.showMessage(error.message || 'Erreur lors de la suppression de l\'utilisateur', 'error');
        }
    }

    // ===== FONCTIONNALITÉS DES RAPPORTS =====

    // Charger les rapports
    async loadReports() {
        await this.loadCharts();
        await this.loadKeyMetrics();
        await this.loadRecentLogs();
    }

    // Charger les graphiques
    async loadCharts() {
        try {
            // Données de démonstration pour les graphiques
            const roleData = {
                labels: ['Étudiants', 'Enseignants', 'Administrateurs'],
                datasets: [{
                    data: [35, 8, 2],
                    backgroundColor: [
                        'rgba(74, 144, 226, 0.8)',
                        'rgba(40, 167, 69, 0.8)',
                        'rgba(111, 66, 193, 0.8)'
                    ],
                    borderColor: [
                        'rgb(74, 144, 226)',
                        'rgb(40, 167, 69)',
                        'rgb(111, 66, 193)'
                    ],
                    borderWidth: 1
                }]
            };

            const activityData = {
                labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'],
                datasets: [{
                    label: 'Connexions',
                    data: [120, 150, 180, 210, 240, 270],
                    backgroundColor: 'rgba(74, 144, 226, 0.2)',
                    borderColor: 'rgb(74, 144, 226)',
                    borderWidth: 2,
                    tension: 0.4
                }, {
                    label: 'Nouveaux projets',
                    data: [5, 8, 12, 15, 18, 24],
                    backgroundColor: 'rgba(40, 167, 69, 0.2)',
                    borderColor: 'rgb(40, 167, 69)',
                    borderWidth: 2,
                    tension: 0.4
                }]
            };

            // Détruire les anciens graphiques s'ils existent
            if (this.roleChart) {
                this.roleChart.destroy();
            }
            if (this.activityChart) {
                this.activityChart.destroy();
            }

            // Créer le graphique circulaire
            const roleCtx = document.getElementById('roleDistributionChart').getContext('2d');
            this.roleChart = new Chart(roleCtx, {
                type: 'pie',
                data: roleData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                font: {
                                    size: 12
                                }
                            }
                        }
                    }
                }
            });

            // Créer le graphique linéaire
            const activityCtx = document.getElementById('monthlyActivityChart').getContext('2d');
            this.activityChart = new Chart(activityCtx, {
                type: 'line',
                data: activityData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                            }
                        },
                        x: {
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                font: {
                                    size: 12
                                }
                            }
                        }
                    }
                }
            });

        } catch (error) {
            console.error('❌ Erreur chargement graphiques:', error);
        }
    }

    // Charger les métriques clés
    async loadKeyMetrics() {
        // Données de démonstration
        document.getElementById('avgProjectDuration').textContent = '120 jours';
        document.getElementById('successRate').textContent = '92%';
        document.getElementById('avgGrade').textContent = '15.8/20';
        document.getElementById('systemUptime').textContent = '99.8%';
    }

    // Charger les logs récents
    async loadRecentLogs() {
        try {
            // Simulation - à remplacer par une vraie API
            const logs = [
                {
                    id: 1,
                    level: 'info',
                    message: 'Connexion réussie: admin.pfe@fst.una.mr',
                    time: '10:25:32'
                },
                {
                    id: 2,
                    level: 'info',
                    message: 'Nouvel utilisateur créé: test@etudiant.una.mr',
                    time: '09:15:18'
                },
                {
                    id: 3,
                    level: 'warning',
                    message: 'Tentative de connexion échouée: unknown@email.com',
                    time: '08:42:05'
                },
                {
                    id: 4,
                    level: 'info',
                    message: 'Sauvegarde automatique effectuée',
                    time: '02:00:00'
                },
                {
                    id: 5,
                    level: 'info',
                    message: 'Rapport mensuel généré',
                    time: '00:30:15'
                }
            ];

            this.renderRecentLogs(logs);

        } catch (error) {
            console.error('❌ Erreur chargement logs:', error);
        }
    }

    // Afficher les logs récents
    renderRecentLogs(logs) {
        const container = document.getElementById('recentLogsList');
        if (!container) return;

        if (logs.length === 0) {
            container.innerHTML = `
                <div class="log-entry">
                    <div class="log-message">Aucun log récent</div>
                </div>
            `;
            return;
        }

        container.innerHTML = logs.map(log => `
            <div class="log-entry">
                <span class="log-level level-${log.level}">${log.level.toUpperCase()}</span>
                <div class="log-message">${log.message}</div>
                <div class="log-time">${log.time}</div>
            </div>
        `).join('');
    }

    // ===== FONCTIONNALITÉS SYSTÈME =====

    // Afficher un message
    showMessage(text, type = 'info') {
        // Créer un élément de message
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-box ${type}`;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1200;
            max-width: 300px;
            animation: slideInRight 0.3s ease;
        `;
        
        messageDiv.innerHTML = `
            <i class="fas fa-${this.getMessageIcon(type)}"></i>
            <span>${text}</span>
        `;

        document.body.appendChild(messageDiv);

        // Supprimer après 5 secondes
        setTimeout(() => {
            messageDiv.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 300);
        }, 5000);
    }

    // Obtenir l'icône du message
    getMessageIcon(type) {
        switch(type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }

    // ===== FONCTIONS À IMPLÉMENTER (placeholders) =====

    // Ces fonctions sont des placeholders pour des fonctionnalités à implémenter

    createUser() {
        this.showUserForm();
    }

    backupSystem() {
        this.showMessage('Lancement de la sauvegarde système...', 'info');
        // À implémenter
    }

    viewLogs() {
        this.showMessage('Ouverture des journaux système', 'info');
        // À implémenter
    }

    systemSettings() {
        this.showMessage('Ouverture des paramètres système', 'info');
        // À implémenter
    }

    changeAcademicYear() {
        this.showMessage('Modification de l\'année académique', 'info');
        // À implémenter
    }

    configureDates() {
        this.showMessage('Configuration des dates importantes', 'info');
        // À implémenter
    }

    securitySettings() {
        this.showMessage('Ouverture des paramètres de sécurité', 'info');
        // À implémenter
    }

    dbMaintenance() {
        this.showMessage('Lancement de la maintenance de la base de données', 'info');
        // À implémenter
    }

    clearCache() {
        this.showMessage('Nettoyage du cache système', 'info');
        // À implémenter
    }

    checkUpdates() {
        this.showMessage('Vérification des mises à jour', 'info');
        // À implémenter
    }

    exportData() {
        this.showMessage('Export des données système', 'info');
        // À implémenter
    }

    systemRestart() {
        if (confirm('Êtes-vous sûr de vouloir redémarrer le système ? Toutes les sessions utilisateur seront fermées.')) {
            this.showMessage('Redémarrage du système en cours...', 'warning');
            // À implémenter
        }
    }

    generateReport() {
        this.showMessage('Génération du rapport PDF', 'info');
        // À implémenter
    }

    exportStats() {
        this.showMessage('Export des statistiques', 'info');
        // À implémenter
    }

    viewAllLogs() {
        this.showMessage('Affichage de tous les journaux', 'info');
        // À implémenter
    }
}

// Initialiser le dashboard lorsque la page est chargée
document.addEventListener('DOMContentLoaded', () => {
    window.admin = new AdminDashboard();
});