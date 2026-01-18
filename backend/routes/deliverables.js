// backend/routes/deliverables.js

const express = require('express');
const router = express.Router();
const Deliverable = require('../models/Deliverable');
const { authenticate, authorize, studentOnly } = require('../middlewares/auth');
const { uploadSingle, formatFileSize, cleanupFiles } = require('../middlewares/upload');
const fs = require('fs');
const path = require('path');

// ==================== ROUTES PUBLIQUES ====================

// Récupérer les types de livrables disponibles
router.get('/types', (req, res) => {
    try {
        const types = Deliverable.getDeliverableTypes();
        res.json({
            success: true,
            types: types
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des types"
        });
    }
});

// ==================== ROUTES PROTÉGÉES ====================

// Récupérer les livrables d'un étudiant (étudiant seulement)
router.get('/student', authenticate, studentOnly, async (req, res) => {
    try {
        const studentId = req.user.id;
        const { type, status } = req.query;
        
        const filters = {};
        if (type) filters.type = type;
        if (status) filters.status = status;
        
        const deliverables = await Deliverable.findByStudent(studentId, filters);
        
        // Formatter les tailles de fichiers
        const formattedDeliverables = deliverables.map(d => ({
            ...d,
            file_size_formatted: d.file_size ? formatFileSize(d.file_size) : null
        }));
        
        res.json({
            success: true,
            count: deliverables.length,
            deliverables: formattedDeliverables
        });
        
    } catch (error) {
        console.error('❌ Erreur récupération livrables étudiant:', error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des livrables"
        });
    }
});

// Dépôt d'un nouveau livrable
router.post('/upload', authenticate, studentOnly, async (req, res) => {
    let uploadedFile = null;
    
    try {
        // Vérifier que l'étudiant peut déposer
        const { type, title, description } = req.body;
        
        if (!type || !title) {
            return res.status(400).json({
                success: false,
                message: "Type et titre sont requis"
            });
        }
        
        // Vérifier les permissions
        const enrollmentId = await Deliverable.canSubmitDeliverable(req.user.id, type);
        
        // Middleware d'upload
        uploadSingle('file')(req, res, async (err) => {
            if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "Aucun fichier fourni"
                });
            }
            
            uploadedFile = req.file;
            
            try {
                // Créer le livrable en base de données
                const deliverableData = {
                    enrollment_id: enrollmentId,
                    type: type,
                    title: title,
                    description: description || null,
                    file_path: uploadedFile.path,
                    file_name: uploadedFile.originalname,
                    file_size: uploadedFile.size,
                    version: 1
                };
                
                const newDeliverable = await Deliverable.create(deliverableData);
                
                // Formatter la réponse
                const responseDeliverable = {
                    ...newDeliverable,
                    file_size_formatted: formatFileSize(uploadedFile.size),
                    download_url: `/api/deliverables/${newDeliverable.id}/download`
                };
                
                res.status(201).json({
                    success: true,
                    message: "Livrable déposé avec succès",
                    deliverable: responseDeliverable
                });
                
            } catch (dbError) {
                // Nettoyer le fichier uploadé en cas d'erreur BDD
                if (uploadedFile && fs.existsSync(uploadedFile.path)) {
                    fs.unlinkSync(uploadedFile.path);
                }
                
                throw dbError;
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur dépôt livrable:', error);
        
        // Nettoyer le fichier s'il a été uploadé
        if (uploadedFile && fs.existsSync(uploadedFile.path)) {
            fs.unlinkSync(uploadedFile.path);
        }
        
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Télécharger un livrable
router.get('/:id/download', authenticate, async (req, res) => {
    try {
        const deliverableId = req.params.id;
        const userId = req.user.id;
        const userRole = req.user.role;
        
        // Récupérer le livrable
        const deliverable = await Deliverable.findById(deliverableId);
        
        if (!deliverable) {
            return res.status(404).json({
                success: false,
                message: "Livrable non trouvé"
            });
        }
        
        // Vérifier les permissions
        const canAccess = userRole === 'admin' || 
                         (userRole === 'teacher' && deliverable.subject_id) ||
                         (userRole === 'student' && deliverable.student_id === userId);
        
        if (!canAccess) {
            return res.status(403).json({
                success: false,
                message: "Accès non autorisé à ce livrable"
            });
        }
        
        // Vérifier que le fichier existe
        if (!deliverable.file_path || !fs.existsSync(deliverable.file_path)) {
            return res.status(404).json({
                success: false,
                message: "Fichier non trouvé sur le serveur"
            });
        }
        
        // Déterminer le type MIME
        const ext = path.extname(deliverable.file_path).toLowerCase();
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.zip': 'application/zip',
            '.txt': 'text/plain',
            '.py': 'text/x-python',
            '.js': 'application/javascript',
            '.html': 'text/html',
            '.css': 'text/css',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png'
        };
        
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        
        // Envoyer le fichier
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${deliverable.file_name}"`);
        res.setHeader('Content-Length', deliverable.file_size);
        
        const fileStream = fs.createReadStream(deliverable.file_path);
        fileStream.pipe(res);
        
    } catch (error) {
        console.error('❌ Erreur téléchargement:', error);
        res.status(500).json({
            success: false,
            message: "Erreur lors du téléchargement"
        });
    }
});

// Supprimer un livrable (étudiant seulement, statut "submitted" seulement)
router.delete('/:id', authenticate, studentOnly, async (req, res) => {
    try {
        const deliverableId = req.params.id;
        
        // Récupérer le livrable pour vérifier l'appartenance
        const deliverable = await Deliverable.findById(deliverableId);
        
        if (!deliverable) {
            return res.status(404).json({
                success: false,
                message: "Livrable non trouvé"
            });
        }
        
        // Vérifier que l'étudiant est le propriétaire
        if (deliverable.student_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "Vous n'êtes pas autorisé à supprimer ce livrable"
            });
        }
        
        // Supprimer de la base de données
        const result = await Deliverable.delete(deliverableId);
        
        // Supprimer le fichier physique
        if (result.file_path && fs.existsSync(result.file_path)) {
            fs.unlinkSync(result.file_path);
            console.log(`🗑️ Fichier supprimé: ${result.file_path}`);
        }
        
        res.json({
            success: true,
            message: "Livrable supprimé avec succès",
            deliverable: deliverable
        });
        
    } catch (error) {
        console.error('❌ Erreur suppression:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Récupérer les statistiques des livrables
router.get('/stats', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        
        let stats = {};
        
        if (userRole === 'student') {
            // Stats pour étudiant
            const counts = await Deliverable.countByStatus(userId);
            
            stats = {
                total: counts.reduce((sum, item) => sum + item.count, 0),
                byStatus: counts,
                types: Deliverable.getDeliverableTypes()
            };
            
        } else if (userRole === 'teacher') {
            // Stats pour enseignant (à implémenter plus tard)
            stats = {
                message: "Statistiques enseignant - à implémenter"
            };
        } else if (userRole === 'admin') {
            // Stats pour admin (à implémenter plus tard)
            stats = {
                message: "Statistiques administrateur - à implémenter"
            };
        }
        
        res.json({
            success: true,
            stats: stats
        });
        
    } catch (error) {
        console.error('❌ Erreur statistiques:', error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des statistiques"
        });
    }
});

module.exports = router;