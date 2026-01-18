// frontend/js/upload.js
// Système de dépôt de fichiers pour les livrables PFE

class FileUploadSystem {
    constructor() {
        this.files = [];
        this.uploadProgress = {};
        this.currentUser = null;
        this.deliverableTypes = [];
        this.API_BASE_URL = 'http://localhost:3000/api';
        
        this.init();
    }
    
    async init() {
        console.log('📁 Système d\'upload initialisé');
        
        // Récupérer l'utilisateur
        const userData = sessionStorage.getItem('pfe_user');
        if (userData) {
            this.currentUser = JSON.parse(userData);
        }
        
        // Charger les types de livrables
        await this.loadDeliverableTypes();
        
        // Initialiser les événements
        this.initEvents();
        
        // Charger les livrables existants
        await this.loadExistingDeliverables();
    }
    
    // Initialiser les événements
    initEvents() {
        const uploadZone = document.getElementById('uploadZone');
        const browseBtn = document.getElementById('browseFilesBtn');
        const fileInput = document.getElementById('fileInput');
        const uploadForm = document.getElementById('uploadForm');
        
        if (browseBtn && fileInput) {
            browseBtn.addEventListener('click', () => {
                fileInput.click();
            });
            
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelection(e.target.files);
            });
        }
        
        if (uploadZone) {
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
                this.handleFileSelection(e.dataTransfer.files);
            });
        }
        
        if (uploadForm) {
            uploadForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleUpload();
            });
        }
        
        // Gestion de la suppression
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-remove-file')) {
                const fileId = e.target.closest('.btn-remove-file').dataset.fileId;
                this.removeSelectedFile(fileId);
            }
            
            if (e.target.closest('.btn-delete-deliverable')) {
                const deliverableId = e.target.closest('.btn-delete-deliverable').dataset.id;
                this.deleteDeliverable(deliverableId);
            }
            
            if (e.target.closest('.btn-download-deliverable')) {
                const deliverableId = e.target.closest('.btn-download-deliverable').dataset.id;
                this.downloadDeliverable(deliverableId);
            }
        });
    }
    
    // Charger les types de livrables depuis l'API
    async loadDeliverableTypes() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/deliverables/types`);
            const data = await response.json();
            
            if (data.success) {
                this.deliverableTypes = data.types;
                this.populateTypeSelect();
            }
        } catch (error) {
            console.error('❌ Erreur chargement types:', error);
            // Types par défaut
            this.deliverableTypes = [
                { value: 'proposal', label: 'Proposition' },
                { value: 'report', label: 'Rapport' },
                { value: 'code', label: 'Code source' },
                { value: 'presentation', label: 'Présentation' },
                { value: 'other', label: 'Autre' }
            ];
            this.populateTypeSelect();
        }
    }
    
    // Remplir le select des types
    populateTypeSelect() {
        const typeSelect = document.getElementById('deliverableType');
        if (!typeSelect) return;
        
        typeSelect.innerHTML = '<option value="">Sélectionnez un type...</option>';
        
        this.deliverableTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type.value;
            option.textContent = type.label;
            if (type.description) {
                option.title = type.description;
            }
            typeSelect.appendChild(option);
        });
    }
    
    // Gérer la sélection de fichiers
    handleFileSelection(fileList) {
        if (!fileList || fileList.length === 0) return;
        
        const maxFiles = 5;
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        Array.from(fileList).forEach(file => {
            // Vérifier la limite de fichiers
            if (this.files.length >= maxFiles) {
                this.showMessage(`Limite de ${maxFiles} fichiers atteinte`, 'warning');
                return;
            }
            
            // Vérifier la taille
            if (file.size > maxSize) {
                this.showMessage(`Fichier "${file.name}" trop volumineux (max: 10MB)`, 'error');
                return;
            }
            
            // Vérifier le type
            const allowedExtensions = ['.pdf', '.doc', '.docx', '.zip', '.txt', '.py', '.js', '.html', '.css', '.jpg', '.jpeg', '.png'];
            const ext = '.' + file.name.split('.').pop().toLowerCase();
            
            if (!allowedExtensions.includes(ext)) {
                this.showMessage(`Type de fichier non supporté: ${ext}`, 'error');
                return;
            }
            
            // Ajouter le fichier
            const fileId = Date.now() + Math.random();
            this.files.push({
                id: fileId,
                file: file,
                name: file.name,
                size: file.size,
                type: this.getFileType(file),
                status: 'pending'
            });
        });
        
        this.renderFileList();
        this.updateUploadZone();
    }
    
    // Déterminer le type de fichier
    getFileType(file) {
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        
        if (['.pdf'].includes(ext)) return 'pdf';
        if (['.doc', '.docx'].includes(ext)) return 'word';
        if (['.zip', '.rar', '.7z'].includes(ext)) return 'archive';
        if (['.py', '.js', '.html', '.css', '.java', '.c', '.cpp'].includes(ext)) return 'code';
        if (['.jpg', '.jpeg', '.png', '.gif', '.svg'].includes(ext)) return 'image';
        return 'document';
    }
    
    // Afficher la liste des fichiers
    renderFileList() {
        const container = document.getElementById('selectedFilesList');
        if (!container) return;
        
        if (this.files.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-upload"></i>
                    <p>Aucun fichier sélectionné</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.files.map(file => `
            <div class="file-item" data-file-id="${file.id}">
                <div class="file-icon">
                    <i class="fas fa-${this.getFileIcon(file.type)}"></i>
                </div>
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${this.formatFileSize(file.size)}</div>
                </div>
                <div class="file-progress" style="display: ${file.status === 'uploading' ? 'block' : 'none'}">
                    <div class="file-progress-bar" style="width: ${this.uploadProgress[file.id] || 0}%"></div>
                </div>
                <div class="file-actions">
                    <button class="btn-file-action btn-remove" data-file-id="${file.id}">
                        <i class="fas fa-times"></i> Retirer
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    // Obtenir l'icône selon le type
    getFileIcon(type) {
        const icons = {
            pdf: 'file-pdf',
            word: 'file-word',
            archive: 'file-archive',
            code: 'file-code',
            image: 'file-image',
            document: 'file'
        };
        return icons[type] || 'file';
    }
    
    // Formatter la taille
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Mettre à jour la zone d'upload
    updateUploadZone() {
        const uploadZone = document.getElementById('uploadZone');
        if (!uploadZone) return;
        
        if (this.files.length > 0) {
            uploadZone.classList.add('has-files');
            uploadZone.innerHTML = `
                <div class="upload-icon">
                    <i class="fas fa-files"></i>
                </div>
                <h3>${this.files.length} fichier(s) sélectionné(s)</h3>
                <p>Prêt à être déposé(s). Remplissez les informations ci-dessous.</p>
            `;
        }
    }
    
    // Supprimer un fichier sélectionné
    removeSelectedFile(fileId) {
        this.files = this.files.filter(file => file.id !== fileId);
        this.renderFileList();
        this.updateUploadZone();
    }
    
    // Gérer l'upload
    async handleUpload() {
        if (this.files.length === 0) {
            this.showMessage('Veuillez sélectionner au moins un fichier', 'warning');
            return;
        }
        
        const typeSelect = document.getElementById('deliverableType');
        const titleInput = document.getElementById('deliverableTitle');
        const descriptionInput = document.getElementById('deliverableDescription');
        
        if (!typeSelect.value) {
            this.showMessage('Veuillez sélectionner un type de livrable', 'error');
            typeSelect.focus();
            return;
        }
        
        if (!titleInput.value.trim()) {
            this.showMessage('Veuillez saisir un titre', 'error');
            titleInput.focus();
            return;
        }
        
        // Désactiver le formulaire
        this.setFormDisabled(true);
        
        // Upload séquentiel des fichiers
        for (const fileObj of this.files) {
            try {
                await this.uploadSingleFile(fileObj, {
                    type: typeSelect.value,
                    title: titleInput.value,
                    description: descriptionInput.value
                });
            } catch (error) {
                console.error('❌ Erreur upload:', error);
                this.showMessage(`Erreur pour ${fileObj.name}: ${error.message}`, 'error');
            }
        }
        
        // Réactiver le formulaire
        this.setFormDisabled(false);
        
        // Recharger les livrables
        await this.loadExistingDeliverables();
        
        // Réinitialiser
        if (this.files.every(f => f.status === 'success')) {
            this.showMessage('Tous les fichiers ont été déposés avec succès !', 'success');
            this.resetForm();
        }
    }
    
    // Upload d'un seul fichier
    async uploadSingleFile(fileObj, metadata) {
        return new Promise((resolve, reject) => {
            fileObj.status = 'uploading';
            this.renderFileList();
            
            const formData = new FormData();
            formData.append('file', fileObj.file);
            formData.append('type', metadata.type);
            formData.append('title', metadata.title);
            formData.append('description', metadata.description || '');
            
            const xhr = new XMLHttpRequest();
            
            // Suivi de la progression
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    this.uploadProgress[fileObj.id] = percent;
                    this.renderFileList();
                }
            });
            
            xhr.addEventListener('load', () => {
                try {
                    const response = JSON.parse(xhr.responseText);
                    
                    if (xhr.status === 201 && response.success) {
                        fileObj.status = 'success';
                        this.showMessage(`${fileObj.name} déposé avec succès`, 'success');
                        resolve(response);
                    } else {
                        fileObj.status = 'error';
                        reject(new Error(response.message || 'Erreur inconnue'));
                    }
                } catch (error) {
                    fileObj.status = 'error';
                    reject(error);
                }
            });
            
            xhr.addEventListener('error', () => {
                fileObj.status = 'error';
                reject(new Error('Erreur réseau'));
            });
            
            xhr.addEventListener('abort', () => {
                fileObj.status = 'cancelled';
                reject(new Error('Upload annulé'));
            });
            
            // Ajouter le token d'authentification
            const token = sessionStorage.getItem('pfe_token');
            xhr.open('POST', `${this.API_BASE_URL}/deliverables/upload`);
            if (token) {
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }
            
            xhr.send(formData);
        });
    }
    
    // Charger les livrables existants
    async loadExistingDeliverables() {
        try {
            const token = sessionStorage.getItem('pfe_token');
            const response = await fetch(`${this.API_BASE_URL}/deliverables/student`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Erreur de chargement');
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.renderDeliverablesTable(data.deliverables);
                this.updateStats(data.deliverables);
            }
        } catch (error) {
            console.error('❌ Erreur chargement livrables:', error);
            this.showMessage('Erreur lors du chargement des livrables', 'error');
        }
    }
    
    // Afficher le tableau des livrables
    renderDeliverablesTable(deliverables) {
        const tbody = document.getElementById('deliverablesTableBody');
        if (!tbody) return;
        
        if (!deliverables || deliverables.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>Aucun livrable déposé pour le moment</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = deliverables.map(deliverable => `
            <tr data-deliverable-id="${deliverable.id}">
                <td>
                    <div class="type-badge type-${deliverable.type}">
                        ${this.getTypeLabel(deliverable.type)}
                    </div>
                </td>
                <td>
                    <div class="file-cell">
                        <div class="file-icon small">
                            <i class="fas fa-${this.getDeliverableIcon(deliverable.type)}"></i>
                        </div>
                        <div>
                            <div class="file-name">${deliverable.title}</div>
                            ${deliverable.description ? 
                                `<div class="file-description">${deliverable.description}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td>
                    <div class="file-info">
                        <div>${deliverable.file_name}</div>
                        <div class="file-size">${deliverable.file_size_formatted || ''}</div>
                    </div>
                </td>
                <td>${new Date(deliverable.submitted_at).toLocaleDateString('fr-FR')}</td>
                <td>
                    <span class="status-badge status-${deliverable.status}">
                        ${this.getStatusLabel(deliverable.status)}
                    </span>
                </td>
                <td>
                    <span class="grade">${deliverable.grade ? `${deliverable.grade}/20` : '--/20'}</span>
                </td>
                <td>
                    <div class="actions">
                        <button class="btn-table-action btn-download btn-download-deliverable" 
                                data-id="${deliverable.id}"
                                title="Télécharger">
                            <i class="fas fa-download"></i>
                        </button>
                        ${deliverable.status === 'submitted' ? `
                        <button class="btn-table-action btn-delete btn-delete-deliverable" 
                                data-id="${deliverable.id}"
                                title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    // Obtenir le label du type
    getTypeLabel(type) {
        const typeMap = {
            proposal: 'PROP',
            report: 'RAPP',
            code: 'CODE',
            presentation: 'PRES',
            data: 'DATA',
            other: 'AUTRE'
        };
        return typeMap[type] || type.toUpperCase();
    }
    
    // Obtenir l'icône du livrable
    getDeliverableIcon(type) {
        const icons = {
            proposal: 'file-alt',
            report: 'file-pdf',
            code: 'file-code',
            presentation: 'file-powerpoint',
            data: 'database',
            other: 'file'
        };
        return icons[type] || 'file';
    }
    
    // Obtenir le label du statut
    getStatusLabel(status) {
        const statusMap = {
            submitted: 'Déposé',
            reviewed: 'Révisé',
            approved: 'Approuvé',
            rejected: 'Rejeté'
        };
        return statusMap[status] || status;
    }
    
    // Télécharger un livrable
    async downloadDeliverable(deliverableId) {
        try {
            const token = sessionStorage.getItem('pfe_token');
            const response = await fetch(`${this.API_BASE_URL}/deliverables/${deliverableId}/download`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Erreur de téléchargement');
            }
            
            // Créer un blob et déclencher le téléchargement
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Extraire le nom du fichier depuis les headers
            const contentDisposition = response.headers.get('content-disposition');
            let filename = 'livrable.pdf';
            
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="(.+)"/);
                if (match) filename = match[1];
            }
            
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('❌ Erreur téléchargement:', error);
            this.showMessage('Erreur lors du téléchargement', 'error');
        }
    }
    
    // Supprimer un livrable
    async deleteDeliverable(deliverableId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce livrable ? Cette action est irréversible.')) {
            return;
        }
        
        try {
            const token = sessionStorage.getItem('pfe_token');
            const response = await fetch(`${this.API_BASE_URL}/deliverables/${deliverableId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showMessage('Livrable supprimé avec succès', 'success');
                await this.loadExistingDeliverables();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('❌ Erreur suppression:', error);
            this.showMessage(error.message, 'error');
        }
    }
    
    // Mettre à jour les statistiques
    updateStats(deliverables) {
        const totalCount = document.getElementById('deliverablesCount');
        if (totalCount) {
            totalCount.textContent = deliverables.length;
        }
        
        // Mettre à jour d'autres statistiques si besoin
        const approvedCount = deliverables.filter(d => d.status === 'approved').length;
        const pendingCount = deliverables.filter(d => d.status === 'submitted').length;
        
        console.log(`📊 Stats: ${deliverables.length} total, ${approvedCount} approuvés, ${pendingCount} en attente`);
    }
    
    // Désactiver/réactiver le formulaire
    setFormDisabled(disabled) {
        const form = document.getElementById('uploadForm');
        const submitBtn = document.querySelector('#uploadForm button[type="submit"]');
        
        if (form) {
            Array.from(form.elements).forEach(element => {
                element.disabled = disabled;
            });
        }
        
        if (submitBtn) {
            submitBtn.innerHTML = disabled ? 
                '<i class="fas fa-spinner fa-spin"></i> Envoi en cours...' : 
                '<i class="fas fa-upload"></i> Déposer les fichiers';
        }
    }
    
    // Réinitialiser le formulaire
    resetForm() {
        this.files = [];
        this.uploadProgress = {};
        
        const form = document.getElementById('uploadForm');
        if (form) form.reset();
        
        const uploadZone = document.getElementById('uploadZone');
        if (uploadZone) {
            uploadZone.classList.remove('has-files');
            uploadZone.innerHTML = `
                <div class="upload-icon">
                    <i class="fas fa-cloud-upload-alt"></i>
                </div>
                <h3>Déposer un fichier</h3>
                <p>Glissez-déposez vos fichiers ici ou cliquez pour parcourir</p>
                <button class="btn-secondary" id="browseFilesBtn">
                    <i class="fas fa-folder-open"></i> Parcourir les fichiers
                </button>
                <div class="file-types">
                    <span><i class="fas fa-file-pdf"></i> PDF</span>
                    <span><i class="fas fa-file-word"></i> Word</span>
                    <span><i class="fas fa-file-code"></i> Code</span>
                    <span><i class="fas fa-file-archive"></i> ZIP</span>
                </div>
            `;
        }
        
        this.renderFileList();
        this.initEvents(); // Réinitialiser les événements
    }
    
    // Afficher un message
    showMessage(text, type = 'info') {
        // Utiliser le système de message existant ou créer un simple
        const messageDiv = document.createElement('div');
        messageDiv.className = `upload-message ${type}`;
        messageDiv.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${text}</span>
        `;
        
        messageDiv.style.cssText = `
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
            background-color: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        `;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => messageDiv.remove(), 300);
        }, 5000);
    }
}

// Initialiser le système d'upload quand la page est chargée
document.addEventListener('DOMContentLoaded', () => {
    window.fileUploadSystem = new FileUploadSystem();
    
    // Exporter des fonctions utiles pour la console
    window.UploadUtils = {
        clearFiles: function() {
            window.fileUploadSystem.files = [];
            window.fileUploadSystem.renderFileList();
            window.fileUploadSystem.updateUploadZone();
        },
        
        testUpload: function() {
            // Simuler la sélection d'un fichier
            const testFile = new File(['Test content'], 'test-document.pdf', { 
                type: 'application/pdf' 
            });
            window.fileUploadSystem.handleFileSelection([testFile]);
        }
    };
});