// frontend/js/dashboard-student.js

class StudentDashboard {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'overview';
        this.subjects = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.notifications = [];
        
        // Configuration API
        this.API_BASE_URL = 'http://localhost:3000/api';
        
        this.init();
    }

    // Initialisation
    async init() {
        console.log('🎓 Dashboard étudiant initialisé');
        
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

        // Recherche de sujets
        const searchInput = document.getElementById('subjectSearch');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.loadSubjects();
            }, 300));
        }

        // Filtre de sujets
        const subjectFilter = document.getElementById('subjectFilter');
        if (subjectFilter) {
            subjectFilter.addEventListener('change', () => {
                this.loadSubjects();
            });
        }

        // Pagination
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('page-btn')) {
                const page = parseInt(e.target.dataset.page);
                if (page && page !== this.currentPage) {
                    this.currentPage = page;
                    this.loadSubjects();
                }
            }
        });

        // Modal sujet
        document.getElementById('closeSubjectModal').addEventListener('click', () => {
            this.closeSubjectModal();
        });

        document.getElementById('closeSubjectBtn').addEventListener('click', () => {
            this.closeSubjectModal();
        });

        // Postuler à un sujet
        document.getElementById('applyToSubjectBtn').addEventListener('click', () => {
            this.applyToSubject();
        });

        // Upload de fichiers
        const uploadZone = document.getElementById('uploadZone');
        const browseBtn = document.getElementById('browseFilesBtn');
        const fileInput = document.getElementById('fileInput');

        if (uploadZone && browseBtn && fileInput) {
            browseBtn.addEventListener('click', () => {
                fileInput.click();
            });

            fileInput.addEventListener('change', (e) => {
                this.handleFileUpload(e.target.files);
            });

            // Drag and drop
            uploadZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadZone.classList.add('drag-over');
            });

            uploadZone.addEventListener('dragleave', () => {
                uploadZone.classList.remove('drag-over');
            });

            uploadZone.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadZone.classList.remove('drag-over');
                const files = e.dataTransfer.files;
                this.handleFileUpload(files);
            });
        }

        // Calendrier
        const prevMonthBtn = document.getElementById('prevMonth');
        const nextMonthBtn = document.getElementById('nextMonth');

        if (prevMonthBtn && nextMonthBtn) {
            prevMonthBtn.addEventListener('click', () => {
                this.changeMonth(-1);
            });

            nextMonthBtn.addEventListener('click', () => {
                this.changeMonth(1);
            });
        }

        // Messages
        const sendMessageBtn = document.getElementById('sendMessageBtn');
        if (sendMessageBtn) {
            sendMessageBtn.addEventListener('click', () => {
                this.sendMessage();
            });
        }

        // Fermer le modal en cliquant en dehors
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('subjectDetailModal');
            if (e.target === modal) {
                this.closeSubjectModal();
            }
        });
    }

    // Mettre à jour les informations utilisateur
    updateUserInfo() {
        if (!this.currentUser) return;

        const userName = document.getElementById('userName');
        const userMatricule = document.getElementById('userMatricule');
        const footerUserName = document.getElementById('footerUserName');
        const lastLogin = document.getElementById('lastLogin');

        if (userName) userName.textContent = this.currentUser.name;
        if (userMatricule) userMatricule.textContent = this.currentUser.matricule || '';
        if (footerUserName) footerUserName.textContent = this.currentUser.name;
        if (lastLogin) {
            lastLogin.textContent = new Date().toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    // Charger les données initiales
    async loadInitialData() {
        try {
            // Charger les notifications
            await this.loadNotifications();
            
            // Charger les statistiques
            await this.loadStats();
            
            // Charger les informations du PFE
            await this.loadPFEInfo();
            
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
                case 'subjects':
                    this.loadSubjects();
                    break;
                case 'deliverables':
                    this.loadDeliverables();
                    break;
                case 'calendar':
                    this.loadCalendar();
                    break;
                case 'messages':
                    this.loadMessages();
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

    // ===== FONCTIONNALITÉS DES SUJETS =====

    // Charger les sujets
    async loadSubjects() {
        const container = document.getElementById('subjectsContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin fa-2x"></i>
                <p>Chargement des sujets disponibles...</p>
            </div>
        `;

        try {
            const search = document.getElementById('subjectSearch')?.value || '';
            const filter = document.getElementById('subjectFilter')?.value || 'all';
            const token = sessionStorage.getItem('pfe_token');

            // Construire l'URL avec les paramètres
            let url = `${this.API_BASE_URL}/subjects?page=${this.currentPage}&limit=6`;
            
            if (search) {
                url += `&search=${encodeURIComponent(search)}`;
            }
            
            if (filter === 'available') {
                url += '&available=true';
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
            this.totalPages = data.totalPages || 1;

            this.renderSubjects();
            this.renderPagination();

        } catch (error) {
            console.error('❌ Erreur chargement sujets:', error);
            container.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Erreur lors du chargement des sujets. Veuillez réessayer.</p>
                </div>
            `;
        }
    }

    // Afficher les sujets
    renderSubjects() {
        const container = document.getElementById('subjectsContainer');
        if (!container) return;

        if (this.subjects.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-book-open"></i>
                    <h3>Aucun sujet disponible</h3>
                    <p>Aucun sujet de PFE n'est disponible pour le moment.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.subjects.map(subject => `
            <div class="subject-card ${subject.enrolled >= subject.capacity ? 'full' : ''}">
                <div class="subject-header">
                    <h3 class="subject-title">${subject.title}</h3>
                    <span class="subject-status ${subject.enrolled < subject.capacity ? 'status-available' : 'status-full'}">
                        ${subject.enrolled < subject.capacity ? 'Disponible' : 'Complet'}
                    </span>
                </div>
                
                <div class="subject-teacher">
                    <i class="fas fa-chalkboard-teacher"></i>
                    <span>${subject.teacher_name || 'Enseignant'}</span>
                </div>
                
                <p class="subject-description">
                    ${subject.description.length > 150 ? 
                      subject.description.substring(0, 150) + '...' : 
                      subject.description}
                </p>
                
                <div class="subject-details">
                    <div class="detail-item">
                        <i class="fas fa-users"></i>
                        <span>${subject.enrolled}/${subject.capacity} places</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-calendar-alt"></i>
                        <span>${subject.deadline ? new Date(subject.deadline).toLocaleDateString('fr-FR') : 'Non spécifié'}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-graduation-cap"></i>
                        <span>${subject.specialization || 'Général'}</span>
                    </div>
                </div>
                
                <div class="subject-actions">
                    <button class="btn-view-details" onclick="dashboard.viewSubjectDetails(${subject.id})">
                        <i class="fas fa-eye"></i> Détails
                    </button>
                    <button class="btn-apply" 
                            onclick="dashboard.applyToSubject(${subject.id})"
                            ${subject.enrolled >= subject.capacity ? 'disabled' : ''}>
                        <i class="fas fa-paper-plane"></i> Postuler
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Afficher la pagination
    renderPagination() {
        const container = document.getElementById('pagination');
        if (!container) return;

        if (this.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '';

        // Bouton précédent
        html += `
            <button class="page-btn ${this.currentPage === 1 ? 'disabled' : ''}" 
                    ${this.currentPage === 1 ? 'disabled' : ''}
                    data-page="${this.currentPage - 1}">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;

        // Pages
        for (let i = 1; i <= this.totalPages; i++) {
            if (i === 1 || i === this.totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
                html += `
                    <button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                            data-page="${i}">
                        ${i}
                    </button>
                `;
            } else if (i === this.currentPage - 2 || i === this.currentPage + 2) {
                html += `<span class="page-dots">...</span>`;
            }
        }

        // Bouton suivant
        html += `
            <button class="page-btn ${this.currentPage === this.totalPages ? 'disabled' : ''}" 
                    ${this.currentPage === this.totalPages ? 'disabled' : ''}
                    data-page="${this.currentPage + 1}">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;

        container.innerHTML = html;
    }

    // Voir les détails d'un sujet
    async viewSubjectDetails(subjectId) {
        try {
            const token = sessionStorage.getItem('pfe_token');
            const response = await fetch(`${this.API_BASE_URL}/subjects/${subjectId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors du chargement du sujet');
            }

            const data = await response.json();
            const subject = data.subject;

            this.showSubjectModal(subject);

        } catch (error) {
            console.error('❌ Erreur chargement détails sujet:', error);
            this.showMessage('Erreur lors du chargement des détails du sujet', 'error');
        }
    }

    // Afficher le modal du sujet
    showSubjectModal(subject) {
        const modal = document.getElementById('subjectDetailModal');
        const title = document.getElementById('modalSubjectTitle');
        const body = document.getElementById('modalSubjectBody');
        const applyBtn = document.getElementById('applyToSubjectBtn');

        if (!modal || !title || !body) return;

        title.textContent = subject.title;

        body.innerHTML = `
            <div class="subject-modal-content">
                <div class="subject-info">
                    <div class="info-row">
                        <strong>Enseignant:</strong>
                        <span>${subject.teacher_name}</span>
                    </div>
                    <div class="info-row">
                        <strong>Spécialisation:</strong>
                        <span>${subject.specialization || 'Non spécifiée'}</span>
                    </div>
                    <div class="info-row">
                        <strong>Département:</strong>
                        <span>${subject.department}</span>
                    </div>
                    <div class="info-row">
                        <strong>Capacité:</strong>
                        <span>${subject.enrolled}/${subject.capacity} étudiants</span>
                    </div>
                    <div class="info-row">
                        <strong>Échéance d'inscription:</strong>
                        <span>${subject.deadline ? new Date(subject.deadline).toLocaleDateString('fr-FR') : 'Non spécifiée'}</span>
                    </div>
                </div>
                
                <div class="subject-description-full">
                    <h4>Description détaillée</h4>
                    <p>${subject.description}</p>
                </div>
                
                ${subject.requirements ? `
                <div class="subject-requirements">
                    <h4>Prérequis</h4>
                    <p>${subject.requirements}</p>
                </div>
                ` : ''}
                
                ${subject.keywords ? `
                <div class="subject-keywords">
                    <h4>Mots-clés</h4>
                    <div class="keywords-list">
                        ${subject.keywords.split(',').map(keyword => `
                            <span class="keyword-tag">${keyword.trim()}</span>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        // Mettre à jour le bouton d'application
        applyBtn.dataset.subjectId = subject.id;
        applyBtn.disabled = subject.enrolled >= subject.capacity;
        applyBtn.innerHTML = subject.enrolled >= subject.capacity ? 
            '<i class="fas fa-times"></i> Complet' : 
            '<i class="fas fa-paper-plane"></i> Postuler à ce sujet';

        modal.classList.add('active');
    }

    // Fermer le modal du sujet
    closeSubjectModal() {
        const modal = document.getElementById('subjectDetailModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // Postuler à un sujet
    async applyToSubject(subjectId) {
        try {
            if (!subjectId) {
                const applyBtn = document.getElementById('applyToSubjectBtn');
                subjectId = applyBtn.dataset.subjectId;
            }

            if (!subjectId) {
                throw new Error('ID du sujet non spécifié');
            }

            const token = sessionStorage.getItem('pfe_token');
            const motivation = prompt('Veuillez indiquer votre motivation pour ce sujet (optionnel):');

            const response = await fetch(`${this.API_BASE_URL}/enrollments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    subject_id: subjectId,
                    student_motivation: motivation || ''
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erreur lors de la candidature');
            }

            this.showMessage('Candidature envoyée avec succès !', 'success');
            this.closeSubjectModal();
            
            // Recharger les données
            await this.loadPFEInfo();
            await this.loadSubjects();

        } catch (error) {
            console.error('❌ Erreur candidature:', error);
            this.showMessage(error.message || 'Erreur lors de la candidature', 'error');
        }
    }

    // ===== FONCTIONNALITÉS DES NOTIFICATIONS =====

    // Charger les notifications
    async loadNotifications() {
        try {
            // Simulation - à remplacer par une vraie API
            this.notifications = [
                {
                    id: 1,
                    title: 'Nouveau sujet disponible',
                    message: 'Un nouveau sujet de PFE a été publié par Dr. Mohamed Ould Ahmed',
                    type: 'info',
                    time: 'Il y a 2 heures',
                    read: false
                },
                {
                    id: 2,
                    title: 'Candidature approuvée',
                    message: 'Votre candidature pour le sujet "Analyse des systèmes dynamiques" a été approuvée',
                    type: 'success',
                    time: 'Il y a 1 jour',
                    read: true
                },
                {
                    id: 3,
                    title: 'Rappel échéance',
                    message: 'La date limite pour le dépôt du plan détaillé approche (15 Mars 2025)',
                    type: 'warning',
                    time: 'Il y a 2 jours',
                    read: false
                }
            ];

            this.renderNotifications();
            this.updateNotificationCount();

        } catch (error) {
            console.error('❌ Erreur chargement notifications:', error);
        }
    }

    // Afficher les notifications
    renderNotifications() {
        const container = document.getElementById('notificationsList');
        if (!container) return;

        if (this.notifications.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bell-slash"></i>
                    <p>Aucune notification pour le moment</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.notifications.map(notification => `
            <div class="notification ${notification.read ? '' : 'unread'} ${notification.type}">
                <i class="fas fa-${this.getNotificationIcon(notification.type)}"></i>
                <div class="notification-content">
                    <h4 class="notification-title">${notification.title}</h4>
                    <p class="notification-message">${notification.message}</p>
                    <span class="notification-time">${notification.time}</span>
                </div>
            </div>
        `).join('');
    }

    // Mettre à jour le compteur de notifications
    updateNotificationCount() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        const badge = document.getElementById('messageCount');
        if (badge) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'flex' : 'none';
        }
    }

    // Obtenir l'icône de notification
    getNotificationIcon(type) {
        switch(type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }

    // ===== FONCTIONNALITÉS DES STATISTIQUES =====

    // Charger les statistiques
    async loadStats() {
        try {
            // Simulation - à remplacer par une vraie API
            const stats = {
                pfeStatus: 'En cours',
                deliverablesCount: 3,
                nextDeadline: '15/03/2025',
                averageGrade: '15.5/20',
                progress: 25
            };

            this.updateStatsDisplay(stats);

        } catch (error) {
            console.error('❌ Erreur chargement statistiques:', error);
        }
    }

    // Mettre à jour l'affichage des statistiques
    updateStatsDisplay(stats) {
        const pfeStatus = document.getElementById('pfeStatus');
        const deliverablesCount = document.getElementById('deliverablesCount');
        const nextDeadline = document.getElementById('nextDeadline');
        const averageGrade = document.getElementById('averageGrade');
        const progressBar = document.getElementById('pfeProgress');
        const progressPercent = document.getElementById('progressPercent');

        if (pfeStatus) pfeStatus.textContent = stats.pfeStatus;
        if (deliverablesCount) deliverablesCount.textContent = stats.deliverablesCount;
        if (nextDeadline) nextDeadline.textContent = stats.nextDeadline;
        if (averageGrade) averageGrade.textContent = stats.averageGrade;
        
        if (progressBar) {
            progressBar.style.width = `${stats.progress}%`;
        }
        
        if (progressPercent) {
            progressPercent.textContent = `${stats.progress}%`;
        }
    }

    // ===== FONCTIONNALITÉS DU PFE =====

    // Charger les informations du PFE
    async loadPFEInfo() {
        try {
            // Simulation - à remplacer par une vraie API
            const pfeInfo = {
                title: 'Analyse des systèmes dynamiques non linéaires',
                teacher: {
                    name: 'Dr. Mohamed Ould Ahmed',
                    email: 'mohamed.ouldahmed@fst.una.mr',
                    phone: '+222 45 XX XX XX',
                    office: 'Bureau 205, Bâtiment Principal'
                },
                status: 'approved',
                startDate: '2025-01-15',
                endDate: '2025-06-30',
                description: 'Étude des comportements chaotiques dans les systèmes différentiels avec applications aux modèles économiques et écologiques en contexte mauritanien.'
            };

            this.renderPFEInfo(pfeInfo);

        } catch (error) {
            console.error('❌ Erreur chargement informations PFE:', error);
        }
    }

    // Afficher les informations du PFE
    renderPFEInfo(pfeInfo) {
        const container = document.getElementById('pfeInfoCard');
        const teacherContainer = document.getElementById('teacherCard');

        if (!container) return;

        container.innerHTML = `
            <div class="pfe-info-header">
                <div>
                    <h2 class="pfe-title">${pfeInfo.title}</h2>
                    <span class="pfe-status-badge">${this.getPFEStatusText(pfeInfo.status)}</span>
                </div>
                <div class="pfe-dates">
                    <p><strong>Début:</strong> ${new Date(pfeInfo.startDate).toLocaleDateString('fr-FR')}</p>
                    <p><strong>Fin estimée:</strong> ${new Date(pfeInfo.endDate).toLocaleDateString('fr-FR')}</p>
                </div>
            </div>
            
            <div class="pfe-details">
                <div class="pfe-detail">
                    <h4>Encadrant</h4>
                    <p>${pfeInfo.teacher.name}</p>
                </div>
                <div class="pfe-detail">
                    <h4>Département</h4>
                    <p>Mathématiques</p>
                </div>
                <div class="pfe-detail">
                    <h4>Spécialisation</h4>
                    <p>Analyse Mathématique</p>
                </div>
            </div>
            
            <div class="pfe-description">
                <h4>Description du projet</h4>
                <p>${pfeInfo.description}</p>
            </div>
        `;

        if (teacherContainer && pfeInfo.teacher) {
            teacherContainer.innerHTML = `
                <div class="teacher-avatar">
                    <i class="fas fa-chalkboard-teacher"></i>
                </div>
                <div class="teacher-info">
                    <h3>${pfeInfo.teacher.name}</h3>
                    <p>Enseignant encadrant</p>
                    <p>Département de Mathématiques - FST UNA</p>
                    
                    <div class="teacher-contact">
                        <div class="contact-item">
                            <i class="fas fa-envelope"></i>
                            <span>${pfeInfo.teacher.email}</span>
                        </div>
                        ${pfeInfo.teacher.phone ? `
                        <div class="contact-item">
                            <i class="fas fa-phone"></i>
                            <span>${pfeInfo.teacher.phone}</span>
                        </div>
                        ` : ''}
                        ${pfeInfo.teacher.office ? `
                        <div class="contact-item">
                            <i class="fas fa-door-open"></i>
                            <span>${pfeInfo.teacher.office}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }
    }

    // Obtenir le texte du statut PFE
    getPFEStatusText(status) {
        switch(status) {
            case 'pending': return 'En attente de validation';
            case 'approved': return 'Approuvé - En cours';
            case 'rejected': return 'Rejeté';
            case 'completed': return 'Terminé';
            default: return 'Non attribué';
        }
    }

    // ===== FONCTIONNALITÉS DES LIVRABLES =====

    // Charger les livrables
    async loadDeliverables() {
        try {
            // Simulation - à remplacer par une vraie API
            const deliverables = [
                {
                    id: 1,
                    type: 'proposal',
                    fileName: 'Proposition_detaille.pdf',
                    fileSize: '2.4 MB',
                    submittedAt: '2025-02-15',
                    status: 'approved',
                    grade: '16/20',
                    feedback: 'Proposition bien structurée. Veuillez approfondir la section méthodologique.'
                },
                {
                    id: 2,
                    type: 'report',
                    fileName: 'Rapport_intermediaire.docx',
                    fileSize: '1.8 MB',
                    submittedAt: '2025-03-10',
                    status: 'reviewed',
                    grade: null,
                    feedback: null
                },
                {
                    id: 3,
                    type: 'code',
                    fileName: 'Implementation_algorithms.zip',
                    fileSize: '4.2 MB',
                    submittedAt: '2025-03-12',
                    status: 'submitted',
                    grade: null,
                    feedback: null
                }
            ];

            this.renderDeliverables(deliverables);

        } catch (error) {
            console.error('❌ Erreur chargement livrables:', error);
        }
    }

    // Afficher les livrables
    renderDeliverables(deliverables) {
        const tbody = document.getElementById('deliverablesTableBody');
        if (!tbody) return;

        if (deliverables.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-file-upload"></i>
                        <p>Aucun livrable déposé pour le moment</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = deliverables.map(deliverable => `
            <tr>
                <td>
                    <div class="file-type-icon">
                        <i class="fas fa-${this.getFileTypeIcon(deliverable.type)}"></i>
                    </div>
                </td>
                <td>
                    <span class="file-name">${deliverable.fileName}</span>
                    <br>
                    <small class="file-size">${deliverable.fileSize}</small>
                </td>
                <td>${new Date(deliverable.submittedAt).toLocaleDateString('fr-FR')}</td>
                <td>${deliverable.fileSize}</td>
                <td>
                    <span class="status-badge status-${deliverable.status}">
                        ${this.getDeliverableStatusText(deliverable.status)}
                    </span>
                </td>
                <td>
                    <span class="grade">${deliverable.grade || '--/20'}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action btn-download" onclick="dashboard.downloadDeliverable(${deliverable.id})">
                            <i class="fas fa-download"></i>
                            <span>Télécharger</span>
                        </button>
                        ${deliverable.status === 'submitted' ? `
                        <button class="btn-action btn-delete" onclick="dashboard.deleteDeliverable(${deliverable.id})">
                            <i class="fas fa-trash"></i>
                            <span>Supprimer</span>
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
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

    // Obtenir le texte du statut du livrable
    getDeliverableStatusText(status) {
        switch(status) {
            case 'submitted': return 'Déposé';
            case 'reviewed': return 'Révisé';
            case 'approved': return 'Approuvé';
            case 'rejected': return 'Rejeté';
            default: return 'Inconnu';
        }
    }

    // Télécharger un livrable
    async downloadDeliverable(deliverableId) {
        try {
            this.showMessage('Téléchargement en cours...', 'info');
            // Simulation - à remplacer par une vraie API
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.showMessage('Téléchargement terminé !', 'success');
        } catch (error) {
            console.error('❌ Erreur téléchargement:', error);
            this.showMessage('Erreur lors du téléchargement', 'error');
        }
    }

    // Supprimer un livrable
    async deleteDeliverable(deliverableId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce livrable ?')) {
            return;
        }

        try {
            this.showMessage('Suppression en cours...', 'info');
            // Simulation - à remplacer par une vraie API
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.showMessage('Livrable supprimé avec succès', 'success');
            await this.loadDeliverables();
        } catch (error) {
            console.error('❌ Erreur suppression:', error);
            this.showMessage('Erreur lors de la suppression', 'error');
        }
    }

    // Gérer l'upload de fichiers
    async handleFileUpload(files) {
        if (!files || files.length === 0) return;

        const file = files[0];
        
        // Validation
        if (file.size > 10 * 1024 * 1024) { // 10MB max
            this.showMessage('Le fichier est trop volumineux (max 10MB)', 'error');
            return;
        }

        const allowedTypes = ['application/pdf', 'application/msword', 
                             'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                             'application/zip', 'text/plain', 'application/x-python-code'];
        
        if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|zip|txt|py|js|html|css)$/i)) {
            this.showMessage('Type de fichier non supporté', 'error');
            return;
        }

        try {
            this.showMessage(`Upload de "${file.name}" en cours...`, 'info');
            
            // Simulation - à remplacer par une vraie API
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            this.showMessage('Fichier déposé avec succès !', 'success');
            
            // Recharger la liste des livrables
            await this.loadDeliverables();
            
        } catch (error) {
            console.error('❌ Erreur upload:', error);
            this.showMessage('Erreur lors du dépôt du fichier', 'error');
        }
    }

    // ===== FONCTIONNALITÉS CALENDRIER =====

    // Charger le calendrier
    loadCalendar() {
        const currentDate = new Date();
        this.renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
        this.loadUpcomingEvents();
    }

    // Afficher le calendrier
    renderCalendar(year, month) {
        const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                          'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        
        const currentMonth = document.getElementById('currentMonth');
        if (currentMonth) {
            currentMonth.textContent = `${monthNames[month]} ${year}`;
        }

        // Simulation d'événements
        const events = {
            '2025-03-15': 'Dépôt plan détaillé',
            '2025-04-10': 'Réunion avec encadrant',
            '2025-05-20': 'Dépôt rapport intermédiaire',
            '2025-06-15': 'Soutenance PFE'
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
                    const hasEvent = events[dateString];
                    
                    calendarHTML += `
                        <div class="calendar-day ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}">
                            <div class="day-number">${day}</div>
                            ${hasEvent ? `
                            <div class="calendar-event" title="${hasEvent}">
                                ${hasEvent}
                            </div>
                            ` : ''}
                        </div>
                    `;
                    day++;
                }
            }
        }

        const grid = document.getElementById('calendarGrid');
        if (grid) {
            grid.innerHTML = calendarHTML;
        }
    }

    // Vérifier si une date est aujourd'hui
    isToday(date) {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    }

    // Changer de mois
    changeMonth(delta) {
        const currentDate = new Date();
        if (document.getElementById('currentMonth').textContent !== 'Mois en cours') {
            const [monthName, year] = document.getElementById('currentMonth').textContent.split(' ');
            const monthIndex = this.getMonthIndex(monthName);
            currentDate.setFullYear(parseInt(year), monthIndex);
        }
        
        currentDate.setMonth(currentDate.getMonth() + delta);
        this.renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
    }

    // Obtenir l'index du mois
    getMonthIndex(monthName) {
        const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
                       'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
        return months.findIndex(m => m.toLowerCase() === monthName.toLowerCase());
    }

    // Charger les événements à venir
    loadUpcomingEvents() {
        // Simulation - à remplacer par une vraie API
        const events = [
            {
                date: '2025-03-15',
                title: 'Dépôt du plan détaillé',
                time: '23:59',
                location: 'Plateforme PFE'
            },
            {
                date: '2025-04-10',
                title: 'Réunion avec encadrant',
                time: '10:00 - 12:00',
                location: 'Bureau 205'
            },
            {
                date: '2025-05-20',
                title: 'Dépôt rapport intermédiaire',
                time: '23:59',
                location: 'Plateforme PFE'
            }
        ];

        this.renderUpcomingEvents(events);
    }

    // Afficher les événements à venir
    renderUpcomingEvents(events) {
        const container = document.getElementById('upcomingEvents');
        if (!container) return;

        if (events.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>Aucun événement à venir</p>
                </div>
            `;
            return;
        }

        container.innerHTML = events.map(event => {
            const date = new Date(event.date);
            const day = date.getDate();
            const month = date.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase();
            
            return `
                <div class="event-item">
                    <div class="event-date">
                        <div class="event-day">${day}</div>
                        <div class="event-month">${month}</div>
                    </div>
                    <div class="event-details">
                        <h4>${event.title}</h4>
                        <p>${event.location}</p>
                        <span class="event-time">${event.time}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ===== FONCTIONNALITÉS MESSAGERIE =====

    // Charger les messages
    loadMessages() {
        // Simulation - à remplacer par une vraie API
        const conversations = [
            {
                id: 1,
                name: 'Dr. Mohamed Ould Ahmed',
                lastMessage: 'Pensez à envoyer votre plan détaillé avant le 15 mars.',
                time: 'Il y a 2 heures',
                unread: 3
            },
            {
                id: 2,
                name: 'Support PFE',
                lastMessage: 'Votre compte a été activé avec succès.',
                time: 'Il y a 3 jours',
                unread: 0
            }
        ];

        this.renderConversations(conversations);
    }

    // Afficher les conversations
    renderConversations(conversations) {
        const container = document.getElementById('conversationsList');
        if (!container) return;

        container.innerHTML = conversations.map(conv => `
            <div class="conversation ${conv.id === 1 ? 'active' : ''}" onclick="dashboard.selectConversation(${conv.id})">
                <div class="conversation-avatar">
                    <i class="fas fa-${conv.id === 1 ? 'chalkboard-teacher' : 'headset'}"></i>
                </div>
                <div class="conversation-info">
                    <h4>${conv.name}</h4>
                    <p class="last-message">${conv.lastMessage}</p>
                    <p class="timestamp">${conv.time}</p>
                </div>
                ${conv.unread > 0 ? `<span class="unread-count">${conv.unread}</span>` : ''}
            </div>
        `).join('');
    }

    // Sélectionner une conversation
    selectConversation(conversationId) {
        // Simulation - à remplacer par une vraie API
        const messages = [
            {
                id: 1,
                sender: 'teacher',
                content: 'Bonjour, votre proposition de sujet a été approuvée.',
                time: '2025-02-10T09:30:00'
            },
            {
                id: 2,
                sender: 'student',
                content: 'Merci beaucoup ! Je vais commencer à travailler sur le plan détaillé.',
                time: '2025-02-10T10:15:00'
            },
            {
                id: 3,
                sender: 'teacher',
                content: 'Pensez à envoyer votre plan détaillé avant le 15 mars.',
                time: '2025-03-08T14:20:00'
            }
        ];

        this.renderMessages(messages);
        
        // Mettre à jour la conversation active
        document.querySelectorAll('.conversation').forEach(conv => {
            conv.classList.remove('active');
        });
        
        const activeConv = document.querySelector(`.conversation[onclick*="${conversationId}"]`);
        if (activeConv) {
            activeConv.classList.add('active');
        }
    }

    // Afficher les messages
    renderMessages(messages) {
        const container = document.getElementById('messagesList');
        const header = document.getElementById('currentConversation');
        
        if (!container || !header) return;

        header.textContent = 'Dr. Mohamed Ould Ahmed';
        
        container.innerHTML = messages.map(msg => `
            <div class="message ${msg.sender === 'student' ? 'sent' : 'received'}">
                <div class="message-content">${msg.content}</div>
                <div class="message-time">
                    ${new Date(msg.time).toLocaleTimeString('fr-FR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    })}
                </div>
            </div>
        `).join('');
        
        // Scroll vers le bas
        container.scrollTop = container.scrollHeight;
    }

    // Envoyer un message
    sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        
        if (!message) return;

        // Simulation - à remplacer par une vraie API
        const newMessage = {
            id: Date.now(),
            sender: 'student',
            content: message,
            time: new Date().toISOString()
        };

        // Ajouter le message à la liste
        const container = document.getElementById('messagesList');
        if (container) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message sent';
            messageDiv.innerHTML = `
                <div class="message-content">${message}</div>
                <div class="message-time">
                    ${new Date().toLocaleTimeString('fr-FR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    })}
                </div>
            `;
            container.appendChild(messageDiv);
            
            // Scroll vers le bas
            container.scrollTop = container.scrollHeight;
        }

        // Effacer le champ de saisie
        input.value = '';
        
        // Simulation de réponse automatique
        setTimeout(() => {
            this.addAutoResponse();
        }, 1000);
    }

    // Ajouter une réponse automatique
    addAutoResponse() {
        const responses = [
            "Merci pour votre message. Je vous répondrai dans les plus brefs délais.",
            "J'ai bien reçu votre message. Nous en discuterons lors de notre prochaine réunion.",
            "Votre demande a été notée. Je vous tiendrai informé des développements."
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        const container = document.getElementById('messagesList');
        if (container) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message received';
            messageDiv.innerHTML = `
                <div class="message-content">${randomResponse}</div>
                <div class="message-time">
                    ${new Date().toLocaleTimeString('fr-FR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    })}
                </div>
            `;
            container.appendChild(messageDiv);
            
            // Scroll vers le bas
            container.scrollTop = container.scrollHeight;
        }
    }

    // ===== UTILITAIRES =====

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
}

// Initialiser le dashboard lorsque la page est chargée
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new StudentDashboard();
});