// frontend/js/dashboard-teacher.js

class TeacherDashboard {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'overview';
        this.subjects = [];
        this.applications = [];
        this.students = [];
        this.evaluations = [];
        this.selectedApplication = null;
        this.selectedStudent = null;
        
        // Configuration API
        this.API_BASE_URL = 'http://localhost:3000/api';
        
        this.init();
    }

    // Initialisation
    async init() {
        console.log('👨‍🏫 Dashboard enseignant initialisé');
        
        // Vérifier l'authentification
        await this.checkAuthentication();
        
        // Initialiser les événements
        this.initEvents();
        
        // Charger les données initiales
        await this.loadInitialData();
        
        // Mettre à jour l'interface
        this.updateUserInfo();
        this.loadSection(this.currentSection);
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
            if (this.currentUser.role !== 'teacher') {
                console.error('❌ Accès non autorisé: rôle non enseignant');
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

        // Bouton nouveau sujet
        document.getElementById('newSubjectBtn')?.addEventListener('click', () => {
            this.showSubjectForm();
        });

        document.getElementById('addSubjectBtn')?.addEventListener('click', () => {
            this.showSubjectForm();
        });

        // Filtres des sujets
        document.getElementById('subjectStatusFilter')?.addEventListener('change', () => {
            this.loadTeacherSubjects();
        });

        document.getElementById('subjectYearFilter')?.addEventListener('change', () => {
            this.loadTeacherSubjects();
        });

        document.getElementById('subjectSort')?.addEventListener('change', () => {
            this.loadTeacherSubjects();
        });

        // Recherche de sujets
        const searchInput = document.getElementById('subjectSearch');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.loadTeacherSubjects();
            }, 300));
        }

        // Onglets des candidatures
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const status = tab.dataset.status;
                this.filterApplications(status);
            });
        });

        // Onglets des évaluations
        document.querySelectorAll('.eval-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const type = tab.dataset.type;
                this.filterEvaluations(type);
            });
        });

        // Calendrier
        document.getElementById('prevMonthBtn')?.addEventListener('click', () => {
            this.changeMonth(-1);
        });

        document.getElementById('nextMonthBtn')?.addEventListener('click', () => {
            this.changeMonth(1);
        });

        // Vue du calendrier
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const view = btn.dataset.view;
                this.changeCalendarView(view);
            });
        });

        // Catégories de ressources
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const category = btn.dataset.category;
                this.filterResources(category);
            });
        });

        // Fermer les modals
        document.getElementById('closeSubjectModal')?.addEventListener('click', () => {
            this.closeSubjectModal();
        });

        document.getElementById('cancelSubjectBtn')?.addEventListener('click', () => {
            this.closeSubjectModal();
        });

        // Soumettre un sujet
        document.getElementById('submitSubjectBtn')?.addEventListener('click', () => {
            this.submitSubject();
        });

        // Actualiser les activités
        document.getElementById('refreshActivitiesBtn')?.addEventListener('click', () => {
            this.loadRecentActivities();
        });

        // Message groupé aux étudiants
        document.getElementById('sendGroupMessageBtn')?.addEventListener('click', () => {
            this.sendGroupMessage();
        });

        // Exporter la liste des étudiants
        document.getElementById('exportStudentsBtn')?.addEventListener('click', () => {
            this.exportStudentsList();
        });

        // Évaluation groupée
        document.getElementById('bulkEvaluateBtn')?.addEventListener('click', () => {
            this.showBulkEvaluation();
        });

        // Ajouter une soutenance
        document.getElementById('addDefenseBtn')?.addEventListener('click', () => {
            this.showDefenseForm();
        });

        // Upload de ressources
        document.getElementById('uploadResourceBtn')?.addEventListener('click', () => {
            this.toggleResourceUpload();
        });

        document.getElementById('cancelUploadBtn')?.addEventListener('click', () => {
            this.toggleResourceUpload();
        });

        document.getElementById('submitResourceBtn')?.addEventListener('click', () => {
            this.submitResource();
        });

        // Fermer le modal en cliquant en dehors
        window.addEventListener('click', (e) => {
            const subjectModal = document.getElementById('subjectModal');
            const defenseModal = document.getElementById('defenseModal');
            
            if (e.target === subjectModal) {
                this.closeSubjectModal();
            }
            if (e.target === defenseModal) {
                this.closeDefenseModal();
            }
        });
    }

    // Mettre à jour les informations utilisateur
    updateUserInfo() {
        if (!this.currentUser) return;

        const userName = document.getElementById('userName');
        const userDepartment = document.getElementById('userDepartment');
        const footerUserName = document.getElementById('footerUserName');

        if (userName) userName.textContent = this.currentUser.name;
        if (userDepartment) userDepartment.textContent = this.currentUser.department || 'Mathématiques';
        if (footerUserName) footerUserName.textContent = this.currentUser.name;
    }

    // Charger les données initiales
    async loadInitialData() {
        try {
            // Charger les statistiques
            await this.loadTeacherStats();
            
            // Charger les activités récentes
            await this.loadRecentActivities();
            
            // Charger les candidatures urgentes
            await this.loadUrgentApplications();
            
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
                case 'my-subjects':
                    this.loadTeacherSubjects();
                    break;
                case 'applications':
                    this.loadApplications();
                    break;
                case 'students':
                    this.loadStudents();
                    break;
                case 'evaluations':
                    this.loadEvaluations();
                    break;
                case 'calendar':
                    this.loadCalendar();
                    break;
                case 'resources':
                    this.loadResources();
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
            localStorage.removeItem('rememberLogin');
            
            // Rediriger vers la page de connexion
            this.redirectToLogin();
        }
    }

    // ===== FONCTIONNALITÉS DES STATISTIQUES =====

    // Charger les statistiques enseignant
    async loadTeacherStats() {
        try {
            const token = sessionStorage.getItem('pfe_token');
            const response = await fetch(`${this.API_BASE_URL}/protected/teacher/stats`, {
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
                total_subjects: 5,
                available_subjects: 3,
                total_students: 8,
                pending_applications: 3,
                upcoming_deadlines: 2,
                active_students: 6,
                completed_students: 2,
                delayed_students: 1,
                average_grade: 15.2
            });
        }
    }

    // Mettre à jour l'affichage des statistiques
    updateStatsDisplay(stats) {
        // Mettre à jour les cartes principales
        document.getElementById('totalSubjects').textContent = stats.total_subjects || 0;
        document.getElementById('availableSubjects').textContent = stats.available_subjects || 0;
        document.getElementById('totalStudents').textContent = stats.total_students || 0;
        document.getElementById('pendingApplications').textContent = stats.pending_applications || 0;
        document.getElementById('upcomingDeadlines').textContent = stats.upcoming_deadlines || 0;

        // Mettre à jour les statistiques des étudiants
        document.getElementById('activeStudentsCount').textContent = stats.active_students || 0;
        document.getElementById('completedStudentsCount').textContent = stats.completed_students || 0;
        document.getElementById('delayedStudentsCount').textContent = stats.delayed_students || 0;
        document.getElementById('averageGradeStudents').textContent = stats.average_grade ? stats.average_grade.toFixed(1) : '0.0';

        // Mettre à jour le footer
        document.getElementById('footerSubjectsCount').textContent = stats.total_subjects || 0;
        document.getElementById('footerStudentsCount').textContent = stats.total_students || 0;
    }

    // ===== FONCTIONNALITÉS DES ACTIVITÉS =====

    // Charger les activités récentes
    async loadRecentActivities() {
        try {
            // Simulation - à remplacer par une vraie API
            const activities = [
                {
                    id: 1,
                    type: 'application',
                    title: 'Nouvelle candidature reçue',
                    message: 'Ahmed Salem a postulé à votre sujet "Analyse des systèmes dynamiques"',
                    time: 'Il y a 10 minutes',
                    icon: 'fa-file-signature'
                },
                {
                    id: 2,
                    type: 'deliverable',
                    title: 'Livrable déposé',
                    message: 'Fatimata Mint Ali a déposé son rapport intermédiaire',
                    time: 'Il y a 2 heures',
                    icon: 'fa-file-upload'
                },
                {
                    id: 3,
                    type: 'evaluation',
                    title: 'Évaluation terminée',
                    message: 'Vous avez évalué le livrable de Moussa Demba (16/20)',
                    time: 'Hier, 14:30',
                    icon: 'fa-clipboard-check'
                },
                {
                    id: 4,
                    type: 'deadline',
                    title: 'Rappel échéance',
                    message: 'Date limite pour les propositions détaillées dans 3 jours',
                    time: 'Il y a 1 jour',
                    icon: 'fa-calendar-day'
                }
            ];

            this.renderRecentActivities(activities);

        } catch (error) {
            console.error('❌ Erreur chargement activités:', error);
        }
    }

    // Afficher les activités récentes
    renderRecentActivities(activities) {
        const container = document.getElementById('recentActivities');
        if (!container) return;

        if (activities.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>Aucune activité récente</p>
                </div>
            `;
            return;
        }

        container.innerHTML = activities.map(activity => `
            <div class="activity">
                <div class="activity-icon">
                    <i class="fas ${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <h4>${activity.title}</h4>
                    <p>${activity.message}</p>
                    <span class="activity-time">${activity.time}</span>
                </div>
            </div>
        `).join('');
    }

    // ===== FONCTIONNALITÉS DES SUJETS =====

    // Charger les sujets de l'enseignant
    async loadTeacherSubjects() {
        const container = document.getElementById('teacherSubjectsList');
        if (!container) return;

        container.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin fa-2x"></i>
                <p>Chargement de vos sujets...</p>
            </div>
        `;

        try {
            const token = sessionStorage.getItem('pfe_token');
            const status = document.getElementById('subjectStatusFilter')?.value || 'all';
            const year = document.getElementById('subjectYearFilter')?.value || 'all';
            const sort = document.getElementById('subjectSort')?.value || 'newest';
            const search = document.getElementById('subjectSearch')?.value || '';

            let url = `${this.API_BASE_URL}/protected/teacher/subjects`;
            const params = new URLSearchParams();
            
            if (status !== 'all') params.append('status', status);
            if (year !== 'all') params.append('year', year);
            if (search) params.append('search', search);
            params.append('sort', sort);
            
            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des sujets');
            }

            const data = await response.json();
            this.subjects = data.subjects || [];

            this.renderTeacherSubjects();

        } catch (error) {
            console.error('❌ Erreur chargement sujets enseignant:', error);
            
            // Données de démonstration
            this.subjects = [
                {
                    id: 1,
                    title: 'Analyse des systèmes dynamiques non linéaires',
                    description: 'Étude des comportements chaotiques dans les systèmes différentiels',
                    status: 'available',
                    capacity: 2,
                    enrolled: 1,
                    deadline: '2025-03-15',
                    created_at: '2025-01-15',
                    specialization: 'Analyse Mathématique'
                },
                {
                    id: 2,
                    title: 'Optimisation de réseaux de transport',
                    description: 'Application des algorithmes d\'optimisation aux problèmes de logistique',
                    status: 'full',
                    capacity: 3,
                    enrolled: 3,
                    deadline: '2025-03-20',
                    created_at: '2025-01-20',
                    specialization: 'Recherche Opérationnelle'
                },
                {
                    id: 3,
                    title: 'Cryptographie et sécurité des données',
                    description: 'Implémentation d\'algorithmes cryptographiques modernes',
                    status: 'in_progress',
                    capacity: 2,
                    enrolled: 2,
                    deadline: '2025-03-10',
                    created_at: '2025-01-10',
                    specialization: 'Informatique Théorique'
                }
            ];

            this.renderTeacherSubjects();
        }
    }

    // Afficher les sujets de l'enseignant
    renderTeacherSubjects() {
        const container = document.getElementById('teacherSubjectsList');
        if (!container) return;

        if (this.subjects.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-book"></i>
                    <h3>Aucun sujet trouvé</h3>
                    <p>Vous n'avez pas encore créé de sujets ou aucun sujet ne correspond aux filtres.</p>
                    <button class="btn-primary" onclick="dashboard.showSubjectForm()">
                        <i class="fas fa-plus"></i> Créer votre premier sujet
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.subjects.map(subject => `
            <div class="teacher-subject-item">
                <div class="subject-info">
                    <h3>${subject.title}</h3>
                    <p>${subject.description.length > 100 ? 
                        subject.description.substring(0, 100) + '...' : 
                        subject.description}</p>
                    
                    <div class="subject-meta">
                        <div class="meta-item">
                            <i class="fas fa-users"></i>
                            <span>${subject.enrolled}/${subject.capacity}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-graduation-cap"></i>
                            <span>${subject.specialization || 'Général'}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span>${new Date(subject.deadline).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-clock"></i>
                            <span>Créé le ${new Date(subject.created_at).toLocaleDateString('fr-FR')}</span>
                        </div>
                    </div>
                </div>
                
                <div class="subject-actions">
                    <span class="subject-status status-${subject.status}">
                        ${this.getSubjectStatusText(subject.status)}
                    </span>
                    
                    <div class="action-buttons">
                        <button class="subject-action-btn" onclick="dashboard.editSubject(${subject.id})">
                            <i class="fas fa-edit"></i>
                            <span>Modifier</span>
                        </button>
                        <button class="subject-action-btn" onclick="dashboard.viewSubjectApplications(${subject.id})">
                            <i class="fas fa-file-signature"></i>
                            <span>Candidatures</span>
                        </button>
                        <button class="subject-action-btn delete" onclick="dashboard.deleteSubject(${subject.id})">
                            <i class="fas fa-trash"></i>
                            <span>Supprimer</span>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Obtenir le texte du statut du sujet
    getSubjectStatusText(status) {
        const statusMap = {
            'available': 'Disponible',
            'full': 'Complet',
            'in_progress': 'En cours',
            'completed': 'Terminé',
            'archived': 'Archivé'
        };
        return statusMap[status] || 'Inconnu';
    }

    // Afficher le formulaire de création/modification de sujet
    showSubjectForm(subjectId = null) {
        const modal = document.getElementById('subjectModal');
        const title = document.getElementById('subjectModalTitle');
        const form = document.getElementById('subjectForm');

        if (!modal || !title || !form) return;

        if (subjectId) {
            // Mode édition
            const subject = this.subjects.find(s => s.id === subjectId);
            if (!subject) return;

            title.textContent = 'Modifier le sujet PFE';
            form.innerHTML = this.getSubjectFormHTML(subject);
        } else {
            // Mode création
            title.textContent = 'Nouveau sujet PFE';
            form.innerHTML = this.getSubjectFormHTML();
        }

        modal.classList.add('active');
    }

    // Obtenir le HTML du formulaire de sujet
    getSubjectFormHTML(subject = null) {
        return `
            <div class="form-group">
                <label for="subjectTitle">Titre du sujet *</label>
                <input type="text" id="subjectTitle" 
                       value="${subject ? subject.title : ''}" 
                       placeholder="Ex: Analyse des systèmes dynamiques non linéaires"
                       required>
            </div>
            
            <div class="form-group">
                <label for="subjectDescription">Description détaillée *</label>
                <textarea id="subjectDescription" rows="5" 
                          placeholder="Décrivez en détail le sujet, les objectifs, la méthodologie..."
                          required>${subject ? subject.description : ''}</textarea>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="subjectSpecialization">Spécialisation</label>
                    <select id="subjectSpecialization">
                        <option value="analyse" ${subject?.specialization === 'Analyse Mathématique' ? 'selected' : ''}>Analyse Mathématique</option>
                        <option value="recherche" ${subject?.specialization === 'Recherche Opérationnelle' ? 'selected' : ''}>Recherche Opérationnelle</option>
                        <option value="informatique" ${subject?.specialization === 'Informatique Théorique' ? 'selected' : ''}>Informatique Théorique</option>
                        <option value="appliquee" ${subject?.specialization === 'Mathématiques Appliquées' ? 'selected' : ''}>Mathématiques Appliquées</option>
                        <option value="autre">Autre</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="subjectCapacity">Nombre de places *</label>
                    <input type="number" id="subjectCapacity" min="1" max="5" 
                           value="${subject ? subject.capacity : 2}" required>
                </div>
            </div>
            
            <div class="form-group">
                <label for="subjectRequirements">Prérequis et compétences requises</label>
                <textarea id="subjectRequirements" rows="3" 
                          placeholder="Listez les connaissances et compétences requises pour ce sujet...">${subject ? subject.requirements : ''}</textarea>
            </div>
            
            <div class="form-group">
                <label for="subjectKeywords">Mots-clés (séparés par des virgules)</label>
                <input type="text" id="subjectKeywords" 
                       value="${subject ? subject.keywords : ''}" 
                       placeholder="Ex: dynamique, chaos, modélisation, optimisation">
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="subjectDeadline">Date limite d'inscription</label>
                    <input type="date" id="subjectDeadline" 
                           value="${subject ? subject.deadline : '2025-03-15'}">
                </div>
                
                <div class="form-group">
                    <label for="subjectStatus">Statut initial</label>
                    <select id="subjectStatus">
                        <option value="available" ${!subject || subject.status === 'available' ? 'selected' : ''}>Disponible</option>
                        <option value="archived" ${subject?.status === 'archived' ? 'selected' : ''}>Archivé</option>
                    </select>
                </div>
            </div>
            
            <div class="form-note">
                <p><i class="fas fa-info-circle"></i> Les champs marqués d'un * sont obligatoires.</p>
            </div>
            
            <input type="hidden" id="subjectId" value="${subject ? subject.id : ''}">
        `;
    }

    // Fermer le modal de sujet
    closeSubjectModal() {
        const modal = document.getElementById('subjectModal');
        if (modal) {
            modal.classList.remove('active');
            document.getElementById('subjectForm').reset();
        }
    }

    // Soumettre un sujet
    async submitSubject() {
        try {
            const subjectId = document.getElementById('subjectId').value;
            const formData = {
                title: document.getElementById('subjectTitle').value.trim(),
                description: document.getElementById('subjectDescription').value.trim(),
                specialization: document.getElementById('subjectSpecialization').value,
                capacity: parseInt(document.getElementById('subjectCapacity').value),
                requirements: document.getElementById('subjectRequirements').value.trim(),
                keywords: document.getElementById('subjectKeywords').value.trim(),
                deadline: document.getElementById('subjectDeadline').value,
                status: document.getElementById('subjectStatus').value
            };

            // Validation
            if (!formData.title || !formData.description) {
                this.showMessage('Le titre et la description sont obligatoires', 'error');
                return;
            }

            if (formData.capacity < 1 || formData.capacity > 5) {
                this.showMessage('Le nombre de places doit être entre 1 et 5', 'error');
                return;
            }

            const token = sessionStorage.getItem('pfe_token');
            const url = subjectId ? 
                `${this.API_BASE_URL}/protected/teacher/subjects/${subjectId}` :
                `${this.API_BASE_URL}/protected/teacher/subjects`;
            
            const method = subjectId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Erreur lors de l\'enregistrement du sujet');
            }

            this.showMessage(
                subjectId ? 'Sujet modifié avec succès' : 'Sujet créé avec succès', 
                'success'
            );
            
            this.closeSubjectModal();
            await this.loadTeacherSubjects();
            await this.loadTeacherStats();

        } catch (error) {
            console.error('❌ Erreur soumission sujet:', error);
            this.showMessage(error.message || 'Erreur lors de l\'enregistrement du sujet', 'error');
        }
    }

    // Éditer un sujet
    async editSubject(subjectId) {
        this.showSubjectForm(subjectId);
    }

    // Supprimer un sujet
    async deleteSubject(subjectId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce sujet ? Cette action est irréversible.')) {
            return;
        }

        try {
            const token = sessionStorage.getItem('pfe_token');
            const response = await fetch(`${this.API_BASE_URL}/protected/teacher/subjects/${subjectId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la suppression du sujet');
            }

            this.showMessage('Sujet supprimé avec succès', 'success');
            await this.loadTeacherSubjects();
            await this.loadTeacherStats();

        } catch (error) {
            console.error('❌ Erreur suppression sujet:', error);
            this.showMessage(error.message || 'Erreur lors de la suppression du sujet', 'error');
        }
    }

    // ===== FONCTIONNALITÉS DES CANDIDATURES =====

    // Charger les candidatures
    async loadApplications() {
        const container = document.getElementById('applicationsList');
        if (!container) return;

        container.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin fa-2x"></i>
                <p>Chargement des candidatures...</p>
            </div>
        `;

        try {
            const token = sessionStorage.getItem('pfe_token');
            const response = await fetch(`${this.API_BASE_URL}/protected/teacher/applications`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des candidatures');
            }

            const data = await response.json();
            this.applications = data.applications || [];
            
            this.updateApplicationCounts();
            this.filterApplications('pending');

        } catch (error) {
            console.error('❌ Erreur chargement candidatures:', error);
            
            // Données de démonstration
            this.applications = [
                {
                    id: 1,
                    student_name: 'Ahmed Salem',
                    student_email: 'ahmed.salem@etudiant.una.mr',
                    matricule: 'MAT2025001',
                    subject_title: 'Analyse des systèmes dynamiques non linéaires',
                    motivation: 'Passionné par les systèmes dynamiques et leurs applications écologiques.',
                    status: 'pending',
                    application_date: '2025-02-15'
                },
                {
                    id: 2,
                    student_name: 'Fatimata Mint Ali',
                    student_email: 'fatimata.mintali@etudiant.una.mr',
                    matricule: 'MAT2025002',
                    subject_title: 'Optimisation de réseaux de transport',
                    motivation: 'Intéressée par les problèmes de transport à Nouakchott.',
                    status: 'pending',
                    application_date: '2025-02-18'
                },
                {
                    id: 3,
                    student_name: 'Moussa Demba',
                    student_email: 'moussa.demba@etudiant.una.mr',
                    matricule: 'MAT2025003',
                    subject_title: 'Cryptographie et sécurité des données',
                    motivation: 'Souhaite contribuer à la sécurité informatique en Mauritanie.',
                    status: 'approved',
                    application_date: '2025-02-10'
                }
            ];
            
            this.updateApplicationCounts();
            this.filterApplications('pending');
        }
    }

    // Mettre à jour les compteurs de candidatures
    updateApplicationCounts() {
        const pending = this.applications.filter(app => app.status === 'pending').length;
        const approved = this.applications.filter(app => app.status === 'approved').length;
        const rejected = this.applications.filter(app => app.status === 'rejected').length;
        const all = this.applications.length;

        document.getElementById('pendingApplicationsCount').textContent = pending;
        document.getElementById('pendingTabCount').textContent = pending;
        document.getElementById('approvedTabCount').textContent = approved;
        document.getElementById('rejectedTabCount').textContent = rejected;
        document.getElementById('allTabCount').textContent = all;
    }

    // Filtrer les candidatures
    filterApplications(status) {
        // Mettre à jour les onglets actifs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.status === status);
        });

        let filteredApplications = this.applications;
        
        if (status !== 'all') {
            filteredApplications = this.applications.filter(app => app.status === status);
        }

        this.renderApplicationsList(filteredApplications);
        
        // Si une candidature était sélectionnée mais n'est plus dans la liste filtrée, effacer les détails
        if (this.selectedApplication && !filteredApplications.find(app => app.id === this.selectedApplication.id)) {
            this.selectedApplication = null;
            this.showApplicationDetails(null);
        }
    }

    // Afficher la liste des candidatures
    renderApplicationsList(applications) {
        const container = document.getElementById('applicationsList');
        if (!container) return;

        if (applications.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-signature"></i>
                    <p>Aucune candidature ${this.getStatusTextForEmptyState()}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = applications.map(app => `
            <div class="application-item ${this.selectedApplication?.id === app.id ? 'selected' : ''}" 
                 onclick="dashboard.selectApplication(${app.id})">
                <div class="application-avatar">
                    <i class="fas fa-user-graduate"></i>
                </div>
                <div class="application-info">
                    <h4>${app.student_name}</h4>
                    <p class="application-subject">${app.subject_title}</p>
                    <p class="application-date">${new Date(app.application_date).toLocaleDateString('fr-FR')}</p>
                </div>
                <span class="application-status status-${app.status}">
                    ${this.getApplicationStatusText(app.status)}
                </span>
            </div>
        `).join('');
    }

    // Obtenir le texte pour l'état vide
    getStatusTextForEmptyState() {
        const activeTab = document.querySelector('.filter-tab.active');
        const status = activeTab?.dataset.status;
        
        switch(status) {
            case 'pending': return 'en attente';
            case 'approved': return 'approuvée';
            case 'rejected': return 'rejetée';
            default: return '';
        }
    }

    // Obtenir le texte du statut de la candidature
    getApplicationStatusText(status) {
        const statusMap = {
            'pending': 'En attente',
            'approved': 'Approuvée',
            'rejected': 'Rejetée'
        };
        return statusMap[status] || 'Inconnu';
    }

    // Sélectionner une candidature
    selectApplication(applicationId) {
        this.selectedApplication = this.applications.find(app => app.id === applicationId);
        
        if (this.selectedApplication) {
            // Mettre à jour la sélection visuelle
            document.querySelectorAll('.application-item').forEach(item => {
                item.classList.remove('selected');
            });
            
            const selectedItem = document.querySelector(`.application-item[onclick*="${applicationId}"]`);
            if (selectedItem) {
                selectedItem.classList.add('selected');
            }
            
            this.showApplicationDetails(this.selectedApplication);
        }
    }

    // Afficher les détails d'une candidature
    showApplicationDetails(application) {
        const container = document.getElementById('applicationDetails');
        if (!container) return;

        if (!application) {
            container.innerHTML = `
                <div class="details-placeholder">
                    <i class="fas fa-file-alt"></i>
                    <h3>Sélectionnez une candidature</h3>
                    <p>Cliquez sur une candidature dans la liste pour voir les détails et prendre une décision.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="details-content">
                <div class="details-header">
                    <h3>Candidature de ${application.student_name}</h3>
                    <p>Pour le sujet: <strong>${application.subject_title}</strong></p>
                </div>
                
                <div class="student-info">
                    <div class="student-avatar">
                        <i class="fas fa-user-graduate"></i>
                    </div>
                    <div class="student-details">
                        <h4>${application.student_name}</h4>
                        <p>${application.student_email}</p>
                        <p>Matricule: ${application.matricule}</p>
                        <p>Date de candidature: ${new Date(application.application_date).toLocaleDateString('fr-FR')}</p>
                    </div>
                </div>
                
                ${application.motivation ? `
                <div class="motivation-section">
                    <h4>Motivation de l'étudiant</h4>
                    <div class="motivation-content">
                        ${application.motivation}
                    </div>
                </div>
                ` : ''}
                
                <div class="application-status-display">
                    <h4>Statut actuel: <span class="status-${application.status}">${this.getApplicationStatusText(application.status)}</span></h4>
                </div>
                
                ${application.status === 'pending' ? `
                <div class="details-actions">
                    <button class="btn-approve" onclick="dashboard.processApplication(${application.id}, 'approve')">
                        <i class="fas fa-check"></i> Approuver
                    </button>
                    <button class="btn-reject" onclick="dashboard.processApplication(${application.id}, 'reject')">
                        <i class="fas fa-times"></i> Rejeter
                    </button>
                </div>
                ` : ''}
            </div>
        `;
    }

    // Traiter une candidature (approuver/rejeter)
    async processApplication(applicationId, action) {
        try {
            const token = sessionStorage.getItem('pfe_token');
            const notes = prompt(action === 'approve' ? 
                'Notes additionnelles (optionnel) :' : 
                'Raison du rejet (requis) :');
            
            if (action === 'reject' && !notes) {
                this.showMessage('Veuillez indiquer la raison du rejet', 'error');
                return;
            }

            const response = await fetch(`${this.API_BASE_URL}/protected/teacher/applications/${applicationId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: action,
                    notes: notes
                })
            });

            if (!response.ok) {
                throw new Error(`Erreur lors du traitement de la candidature`);
            }

            const result = await response.json();
            
            this.showMessage(
                action === 'approve' ? 'Candidature approuvée avec succès' : 'Candidature rejetée',
                'success'
            );
            
            // Recharger les données
            await this.loadApplications();
            await this.loadTeacherStats();

        } catch (error) {
            console.error('❌ Erreur traitement candidature:', error);
            this.showMessage(error.message || 'Erreur lors du traitement de la candidature', 'error');
        }
    }

    // ===== FONCTIONNALITÉS DES ÉTUDIANTS =====

    // Charger les étudiants
    async loadStudents() {
        const tbody = document.getElementById('studentsTableBody');
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="loading-cell">
                    <i class="fas fa-spinner fa-spin"></i> Chargement des étudiants...
                </td>
            </tr>
        `;

        try {
            const token = sessionStorage.getItem('pfe_token');
            const response = await fetch(`${this.API_BASE_URL}/protected/teacher/students`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des étudiants');
            }

            const data = await response.json();
            this.students = data.students || [];
            
            this.renderStudentsTable();

        } catch (error) {
            console.error('❌ Erreur chargement étudiants:', error);
            
            // Données de démonstration
            this.students = [
                {
                    id: 1,
                    name: 'Ahmed Salem',
                    email: 'ahmed.salem@etudiant.una.mr',
                    matricule: 'MAT2025001',
                    subject_title: 'Analyse des systèmes dynamiques non linéaires',
                    status: 'active',
                    progress: 75,
                    last_deliverable: 'Rapport intermédiaire',
                    last_deliverable_date: '2025-03-10',
                    average_grade: 16.5
                },
                {
                    id: 2,
                    name: 'Fatimata Mint Ali',
                    email: 'fatimata.mintali@etudiant.una.mr',
                    matricule: 'MAT2025002',
                    subject_title: 'Optimisation de réseaux de transport',
                    status: 'active',
                    progress: 50,
                    last_deliverable: 'Proposition détaillée',
                    last_deliverable_date: '2025-02-28',
                    average_grade: 14.0
                },
                {
                    id: 3,
                    name: 'Moussa Demba',
                    email: 'moussa.demba@etudiant.una.mr',
                    matricule: 'MAT2025003',
                    subject_title: 'Cryptographie et sécurité des données',
                    status: 'delayed',
                    progress: 25,
                    last_deliverable: 'Plan initial',
                    last_deliverable_date: '2025-02-15',
                    average_grade: 15.0
                }
            ];
            
            this.renderStudentsTable();
        }
    }

    // Afficher le tableau des étudiants
    renderStudentsTable() {
        const tbody = document.getElementById('studentsTableBody');
        if (!tbody) return;

        if (this.students.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-user-graduate"></i>
                        <p>Aucun étudiant encadré pour le moment</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.students.map(student => `
            <tr>
                <td>
                    <div class="student-cell">
                        <div class="student-avatar-small">
                            ${student.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                            <div class="student-name">${student.name}</div>
                            <div class="student-matricule">${student.matricule}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="subject-cell">
                        <div class="subject-title-small">${student.subject_title}</div>
                    </div>
                </td>
                <td>
                    <span class="status-badge status-${student.status}">
                        ${this.getStudentStatusText(student.status)}
                    </span>
                </td>
                <td>
                    <div class="progress-cell">
                        <div class="progress-bar-small">
                            <div class="progress-fill-small" style="width: ${student.progress}%"></div>
                        </div>
                        <div class="progress-text">${student.progress}%</div>
                    </div>
                </td>
                <td>
                    <div class="deliverable-cell">
                        <div class="deliverable-name">${student.last_deliverable || 'Aucun'}</div>
                        <div class="deliverable-date">${student.last_deliverable_date ? 
                            new Date(student.last_deliverable_date).toLocaleDateString('fr-FR') : ''}</div>
                    </div>
                </td>
                <td>
                    <span class="grade-cell">${student.average_grade ? student.average_grade.toFixed(1) + '/20' : '--/20'}</span>
                </td>
                <td>
                    <div class="student-actions">
                        <button class="btn-student-action" onclick="dashboard.viewStudentDetails(${student.id})">
                            <i class="fas fa-eye"></i>
                            <span>Détails</span>
                        </button>
                        <button class="btn-student-action" onclick="dashboard.sendMessageToStudent(${student.id})">
                            <i class="fas fa-envelope"></i>
                            <span>Message</span>
                        </button>
                        <button class="btn-student-action" onclick="dashboard.evaluateStudent(${student.id})">
                            <i class="fas fa-clipboard-check"></i>
                            <span>Évaluer</span>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Obtenir le texte du statut de l'étudiant
    getStudentStatusText(status) {
        const statusMap = {
            'active': 'En cours',
            'completed': 'Terminé',
            'delayed': 'En retard',
            'pending': 'En attente'
        };
        return statusMap[status] || 'Inconnu';
    }

    // ===== FONCTIONNALITÉS DES ÉVALUATIONS =====

    // Charger les évaluations
    async loadEvaluations() {
        const container = document.getElementById('evaluationsList');
        if (!container) return;

        container.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin fa-2x"></i>
                <p>Chargement des livrables à évaluer...</p>
            </div>
        `;

        try {
            // Simulation - à remplacer par une vraie API
            this.evaluations = [
                {
                    id: 1,
                    student_name: 'Ahmed Salem',
                    student_matricule: 'MAT2025001',
                    subject_title: 'Analyse des systèmes dynamiques non linéaires',
                    deliverable_type: 'report',
                    deliverable_name: 'Rapport_intermediaire.pdf',
                    deliverable_date: '2025-03-10',
                    status: 'pending',
                    grade: null,
                    feedback: null
                },
                {
                    id: 2,
                    student_name: 'Fatimata Mint Ali',
                    student_matricule: 'MAT2025002',
                    subject_title: 'Optimisation de réseaux de transport',
                    deliverable_type: 'proposal',
                    deliverable_name: 'Proposition_detaille.docx',
                    deliverable_date: '2025-02-28',
                    status: 'pending',
                    grade: null,
                    feedback: null
                },
                {
                    id: 3,
                    student_name: 'Moussa Demba',
                    student_matricule: 'MAT2025003',
                    subject_title: 'Cryptographie et sécurité des données',
                    deliverable_type: 'code',
                    deliverable_name: 'Implementation_algorithms.zip',
                    deliverable_date: '2025-03-12',
                    status: 'evaluated',
                    grade: 15.5,
                    feedback: 'Bon travail, mais peut être amélioré sur la documentation.'
                }
            ];

            this.updateEvaluationCounts();
            this.filterEvaluations('pending');

        } catch (error) {
            console.error('❌ Erreur chargement évaluations:', error);
        }
    }

    // Mettre à jour les compteurs d'évaluation
    updateEvaluationCounts() {
        const pending = this.evaluations.filter(eval => eval.status === 'pending').length;
        const evaluated = this.evaluations.filter(eval => eval.status === 'evaluated').length;
        const revised = this.evaluations.filter(eval => eval.status === 'revised').length;
        const all = this.evaluations.length;

        document.getElementById('pendingEvalCount').textContent = pending;
        document.getElementById('evaluatedCount').textContent = evaluated;
        document.getElementById('revisedCount').textContent = revised;
        document.getElementById('allEvalCount').textContent = all;
    }

    // Filtrer les évaluations
    filterEvaluations(type) {
        // Mettre à jour les onglets actifs
        document.querySelectorAll('.eval-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.type === type);
        });

        let filteredEvaluations = this.evaluations;
        
        if (type !== 'all') {
            filteredEvaluations = this.evaluations.filter(eval => eval.status === type);
        }

        this.renderEvaluationsList(filteredEvaluations);
    }

    // Afficher la liste des évaluations
    renderEvaluationsList(evaluations) {
        const container = document.getElementById('evaluationsList');
        if (!container) return;

        if (evaluations.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-check"></i>
                    <p>Aucun livrable ${this.getEvalTypeTextForEmptyState()}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = evaluations.map(eval => `
            <div class="evaluation-item ${eval.status}">
                <div class="eval-student-info">
                    <div class="eval-avatar">
                        ${eval.student_name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div class="eval-details">
                        <h4>${eval.student_name}</h4>
                        <p>${eval.student_matricule} - ${eval.subject_title}</p>
                        <div class="eval-file-info">
                            <div class="eval-file-name">
                                <i class="fas fa-file-${this.getFileTypeIcon(eval.deliverable_type)}"></i>
                                <span>${eval.deliverable_name}</span>
                            </div>
                            <div class="eval-file-date">
                                Déposé le ${new Date(eval.deliverable_date).toLocaleDateString('fr-FR')}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="eval-actions">
                    ${eval.grade ? `
                    <div class="eval-grade">
                        Note: <strong>${eval.grade}/20</strong>
                    </div>
                    ` : ''}
                    <div class="eval-date">
                        ${eval.status === 'pending' ? 'En attente' : 
                          eval.status === 'evaluated' ? 'Évalué' : 'À réviser'}
                    </div>
                    <button class="btn-primary" onclick="dashboard.showEvaluationForm(${eval.id})">
                        <i class="fas fa-edit"></i>
                        ${eval.status === 'pending' ? 'Évaluer' : 'Modifier'}
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Obtenir le texte pour l'état vide des évaluations
    getEvalTypeTextForEmptyState() {
        const activeTab = document.querySelector('.eval-tab.active');
        const type = activeTab?.dataset.type;
        
        switch(type) {
            case 'pending': return 'à évaluer';
            case 'evaluated': return 'évalué';
            case 'revised': return 'à réviser';
            default: return '';
        }
    }

    // ===== FONCTIONNALITÉS DU CALENDRIER =====

    // Charger le calendrier
    loadCalendar() {
        const currentDate = new Date();
        this.currentCalendarDate = currentDate;
        this.renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
        this.loadUpcomingDefenses();
    }

    // Afficher le calendrier
    renderCalendar(year, month) {
        const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                          'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        
        document.getElementById('currentMonthYear').textContent = `${monthNames[month]} ${year}`;

        // Simulation d'événements
        const events = {
            '2025-03-15': [{type: 'deadline', title: 'Dépôt plan détaillé'}],
            '2025-03-18': [{type: 'meeting', title: 'Réunion équipe 1'}],
            '2025-03-20': [{type: 'defense', title: 'Soutenance PFE - Groupe A'}],
            '2025-03-25': [{type: 'deadline', title: 'Rapport intermédiaire'}]
        };

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startingDay = firstDay.getDay();
        const monthLength = lastDay.getDate();

        // Ajuster pour lundi premier jour
        const adjustedStart = startingDay === 0 ? 6 : startingDay - 1;

        let calendarHTML = '';
        let day = 1;

        for (let i = 0; i < 6; i++) {
            calendarHTML += `<div class="calendar-week">`;
            
            for (let j = 0; j < 7; j++) {
                if (i === 0 && j < adjustedStart) {
                    const prevMonthDay = new Date(year, month, 0 - (adjustedStart - j - 1)).getDate();
                    calendarHTML += `
                        <div class="calendar-day other-month">
                            <div class="day-number">${prevMonthDay}</div>
                        </div>
                    `;
                } else if (day > monthLength) {
                    const nextMonthDay = day - monthLength;
                    calendarHTML += `
                        <div class="calendar-day other-month">
                            <div class="day-number">${nextMonthDay}</div>
                        </div>
                    `;
                    day++;
                } else {
                    const currentDate = new Date(year, month, day);
                    const dateString = currentDate.toISOString().split('T')[0];
                    const isToday = this.isToday(currentDate);
                    const dayEvents = events[dateString] || [];
                    
                    calendarHTML += `
                        <div class="calendar-day ${isToday ? 'today' : ''}">
                            <div class="day-number">${day}</div>
                            <div class="day-events">
                                ${dayEvents.map(event => `
                                    <div class="day-event ${event.type}" title="${event.title}">
                                        ${event.title}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                    day++;
                }
            }
            
            calendarHTML += `</div>`;
        }

        const calendar = document.getElementById('teacherCalendar');
        if (calendar) {
            calendar.innerHTML = `
                <div class="calendar-month-view">
                    <div class="calendar-week-days">
                        <div class="week-day">Lun</div>
                        <div class="week-day">Mar</div>
                        <div class="week-day">Mer</div>
                        <div class="week-day">Jeu</div>
                        <div class="week-day">Ven</div>
                        <div class="week-day">Sam</div>
                        <div class="week-day">Dim</div>
                    </div>
                    <div class="calendar-weeks">
                        ${calendarHTML}
                    </div>
                </div>
            `;
        }
    }

    // Changer de mois
    changeMonth(delta) {
        this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() + delta);
        this.renderCalendar(
            this.currentCalendarDate.getFullYear(),
            this.currentCalendarDate.getMonth()
        );
    }

    // Changer la vue du calendrier
    changeCalendarView(view) {
        // Mettre à jour les boutons actifs
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Pour l'instant, seule la vue mois est implémentée
        if (view === 'month') {
            this.renderCalendar(
                this.currentCalendarDate.getFullYear(),
                this.currentCalendarDate.getMonth()
            );
        } else {
            this.showMessage(`Vue ${view} non implémentée dans cette version`, 'info');
        }
    }

    // Charger les soutenances à venir
    loadUpcomingDefenses() {
        // Simulation - à remplacer par une vraie API
        const defenses = [
            {
                id: 1,
                student_name: 'Ahmed Salem',
                subject_title: 'Analyse des systèmes dynamiques non linéaires',
                date: '2025-03-20',
                time: '10:00 - 12:00',
                room: 'Salle 201'
            },
            {
                id: 2,
                student_name: 'Fatimata Mint Ali',
                subject_title: 'Optimisation de réseaux de transport',
                date: '2025-03-25',
                time: '14:00 - 16:00',
                room: 'Salle 205'
            },
            {
                id: 3,
                student_name: 'Moussa Demba',
                subject_title: 'Cryptographie et sécurité des données',
                date: '2025-03-28',
                time: '09:00 - 11:00',
                room: 'Salle 210'
            }
        ];

        this.renderUpcomingDefenses(defenses);
    }

    // Afficher les soutenances à venir
    renderUpcomingDefenses(defenses) {
        const container = document.getElementById('upcomingDefensesList');
        if (!container) return;

        if (defenses.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>Aucune soutenance planifiée</p>
                </div>
            `;
            return;
        }

        container.innerHTML = defenses.map(defense => `
            <div class="defense-item">
                <div class="defense-info">
                    <h4>${defense.student_name}</h4>
                    <p>${defense.subject_title}</p>
                    <p>Salle: ${defense.room}</p>
                </div>
                <div class="defense-time">
                    <div class="defense-date">${new Date(defense.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                    <div class="defense-hour">${defense.time}</div>
                </div>
            </div>
        `).join('');
    }

    // ===== FONCTIONNALITÉS DES RESSOURCES =====

    // Charger les ressources
    async loadResources() {
        const container = document.getElementById('resourcesList');
        if (!container) return;

        container.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin fa-2x"></i>
                <p>Chargement des ressources...</p>
            </div>
        `;

        try {
            // Simulation - à remplacer par une vraie API
            this.resources = [
                {
                    id: 1,
                    title: 'Modèle de rapport PFE',
                    description: 'Structure standard pour les rapports de Projet de Fin d\'Études',
                    category: 'templates',
                    file_type: 'pdf',
                    file_size: '2.1 MB',
                    upload_date: '2025-01-15',
                    downloads: 45
                },
                {
                    id: 2,
                    title: 'Guide d\'évaluation des livrables',
                    description: 'Critères et grille d\'évaluation pour les différents types de livrables',
                    category: 'guides',
                    file_type: 'docx',
                    file_size: '1.5 MB',
                    upload_date: '2025-01-20',
                    downloads: 32
                },
                {
                    id: 3,
                    title: 'Exemples de code Python',
                    description: 'Bibliothèque d\'exemples de code pour les projets de mathématiques appliquées',
                    category: 'examples',
                    file_type: 'zip',
                    file_size: '5.3 MB',
                    upload_date: '2025-02-05',
                    downloads: 28
                },
                {
                    id: 4,
                    title: 'Règlement PFE 2025-2026',
                    description: 'Règlement officiel des Projets de Fin d\'Études pour l\'année académique',
                    category: 'regulations',
                    file_type: 'pdf',
                    file_size: '3.2 MB',
                    upload_date: '2025-01-10',
                    downloads: 67
                }
            ];

            this.filterResources('all');

        } catch (error) {
            console.error('❌ Erreur chargement ressources:', error);
        }
    }

    // Filtrer les ressources
    filterResources(category) {
        // Mettre à jour les boutons actifs
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });

        let filteredResources = this.resources;
        
        if (category !== 'all') {
            filteredResources = this.resources.filter(resource => resource.category === category);
        }

        this.renderResourcesList(filteredResources);
    }

    // Afficher la liste des ressources
    renderResourcesList(resources) {
        const container = document.getElementById('resourcesList');
        if (!container) return;

        if (resources.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <p>Aucune ressource dans cette catégorie</p>
                </div>
            `;
            return;
        }

        container.innerHTML = resources.map(resource => `
            <div class="resource-item">
                <div class="resource-icon">
                    <i class="fas fa-file-${resource.file_type === 'pdf' ? 'pdf' : 
                                           resource.file_type === 'docx' ? 'word' : 
                                           resource.file_type === 'zip' ? 'archive' : 'alt'}"></i>
                </div>
                <div class="resource-content">
                    <h3>${resource.title}</h3>
                    <p>${resource.description}</p>
                    <div class="resource-meta">
                        <span class="resource-category category-${resource.category}">
                            ${this.getResourceCategoryText(resource.category)}
                        </span>
                        <div class="resource-info">
                            <span class="resource-size">${resource.file_size}</span>
                            <span class="resource-downloads">${resource.downloads} téléchargements</span>
                        </div>
                    </div>
                </div>
                <div class="resource-actions">
                    <button class="btn-secondary" onclick="dashboard.downloadResource(${resource.id})">
                        <i class="fas fa-download"></i> Télécharger
                    </button>
                    <button class="btn-secondary" onclick="dashboard.shareResource(${resource.id})">
                        <i class="fas fa-share"></i> Partager
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Obtenir le texte de la catégorie de ressource
    getResourceCategoryText(category) {
        const categoryMap = {
            'templates': 'Modèles',
            'guides': 'Guides',
            'examples': 'Exemples',
            'regulations': 'Règlements',
            'other': 'Autres'
        };
        return categoryMap[category] || 'Inconnu';
    }

    // Basculer l'affichage de la zone d'upload
    toggleResourceUpload() {
        const uploadZone = document.getElementById('resourceUploadZone');
        if (!uploadZone) return;

        uploadZone.classList.toggle('expanded');
        
        if (uploadZone.classList.contains('expanded')) {
            uploadZone.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // ===== UTILITAIRES =====

    // Vérifier si une date est aujourd'hui
    isToday(date) {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    }

    // Obtenir l'icône du type de fichier
    getFileTypeIcon(type) {
        switch(type) {
            case 'proposal': return 'file-pdf';
            case 'report': return 'file-word';
            case 'code': return 'file-code';
            case 'presentation': return 'file-powerpoint';
            default: return 'file';
        }
    }

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

        // Ajouter les animations CSS si elles n'existent pas
        if (!document.getElementById('message-animations')) {
            const style = document.createElement('style');
            style.id = 'message-animations';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
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

    // ===== FONCTIONS À IMPLÉMENTER =====

    // Ces fonctions sont des placeholders pour des fonctionnalités à implémenter

    loadUrgentApplications() {
        // À implémenter
        console.log('Chargement des candidatures urgentes...');
    }

    viewSubjectApplications(subjectId) {
        this.showMessage(`Affichage des candidatures pour le sujet ${subjectId}`, 'info');
        // À implémenter
    }

    sendGroupMessage() {
        this.showMessage('Envoi de message groupé aux étudiants', 'info');
        // À implémenter
    }

    exportStudentsList() {
        this.showMessage('Export de la liste des étudiants', 'info');
        // À implémenter
    }

    showBulkEvaluation() {
        this.showMessage('Évaluation groupée des livrables', 'info');
        // À implémenter
    }

    showDefenseForm() {
        this.showMessage('Formulaire de planification de soutenance', 'info');
        // À implémenter
    }

    viewStudentDetails(studentId) {
        this.showMessage(`Détails de l'étudiant ${studentId}`, 'info');
        // À implémenter
    }

    sendMessageToStudent(studentId) {
        this.showMessage(`Message à l'étudiant ${studentId}`, 'info');
        // À implémenter
    }

    evaluateStudent(studentId) {
        this.showMessage(`Évaluation de l'étudiant ${studentId}`, 'info');
        // À implémenter
    }

    showEvaluationForm(evaluationId) {
        this.showMessage(`Formulaire d'évaluation ${evaluationId}`, 'info');
        // À implémenter
    }

    downloadResource(resourceId) {
        this.showMessage(`Téléchargement de la ressource ${resourceId}`, 'info');
        // À implémenter
    }

    shareResource(resourceId) {
        this.showMessage(`Partage de la ressource ${resourceId}`, 'info');
        // À implémenter
    }

    submitResource() {
        this.showMessage('Soumission de ressource pédagogique', 'info');
        // À implémenter
    }

    closeDefenseModal() {
        const modal = document.getElementById('defenseModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }
}

// Initialiser le dashboard lorsque la page est chargée
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new TeacherDashboard();
});