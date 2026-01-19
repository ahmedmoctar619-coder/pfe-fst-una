// backend/routes/protected/admin.js

const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Subject = require('../../models/Subject');
const Enrollment = require('../../models/Enrollment');

// Middleware pour vérifier que l'utilisateur est un administrateur
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Accès réservé aux administrateurs'
        });
    }
    next();
};

// Appliquer le middleware à toutes les routes
router.use(isAdmin);

// ===== STATISTIQUES ADMIN =====

// Récupérer les statistiques globales
router.get('/stats', async (req, res) => {
    try {
        // Compter les utilisateurs par rôle
        const userCounts = await User.countByRole();
        
        // Récupérer tous les sujets
        const subjects = await Subject.findAll({});
        
        // Compter les inscriptions
        const enrollmentCounts = await Enrollment.countByStatus();
        
        // Calculer les statistiques
        const stats = {
            total_users: userCounts.reduce((sum, item) => sum + item.count, 0),
            students: userCounts.find(item => item.role === 'student')?.count || 0,
            teachers: userCounts.find(item => item.role === 'teacher')?.count || 0,
            admins: userCounts.find(item => item.role === 'admin')?.count || 0,
            
            total_projects: subjects.length,
            active_projects: subjects.filter(s => s.status === 'in_progress').length,
            completed_projects: subjects.filter(s => s.status === 'completed').length,
            
            system_status: 'online',
            database_status: 'connected',
            storage_usage: 15.2, // Simulation
            recent_logins: 12, // Simulation
            today_logins: 3, // Simulation
            system_alerts: 1, // Simulation
            online_users: Math.floor(Math.random() * 10) + 1 // Simulation
        };
        
        res.json({
            success: true,
            stats: stats
        });
        
    } catch (error) {
        console.error('❌ Erreur récupération statistiques admin:', error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des statistiques"
        });
    }
});

// ===== GESTION DES UTILISATEURS =====

// Récupérer tous les utilisateurs
router.get('/users', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const role = req.query.role !== 'all' ? req.query.role : null;
        const status = req.query.status !== 'all' ? req.query.status : null;
        const search = req.query.search || '';
        
        const offset = (page - 1) * limit;
        
        let users;
        let total;
        
        if (search) {
            // Recherche
            users = await User.search(search, role);
            total = users.length;
            users = users.slice(offset, offset + limit);
        } else {
            // Récupération normale
            users = await User.findAll(limit, offset, role);
            
            // Filtrer par statut si spécifié
            if (status) {
                users = users.filter(user => user.status === status);
            }
            
            // Pour le total, on fait une requête séparée
            let countQuery = 'SELECT COUNT(*) as count FROM users';
            let countParams = [];
            
            if (role) {
                countQuery += ' WHERE role = ?';
                countParams.push(role);
                
                if (status) {
                    countQuery += ' AND status = ?';
                    countParams.push(status);
                }
            } else if (status) {
                countQuery += ' WHERE status = ?';
                countParams.push(status);
            }
            
            // Note: Pour simplifier, on utilise une méthode directe avec la base de données
            // En pratique, il faudrait ajouter une méthode count() au modèle User
            total = users.length; // Approximation pour la démo
        }
        
        res.json({
            success: true,
            users: users,
            total: total,
            page: page,
            totalPages: Math.ceil(total / limit)
        });
        
    } catch (error) {
        console.error('❌ Erreur récupération utilisateurs:', error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des utilisateurs"
        });
    }
});

// Créer un nouvel utilisateur
router.post('/users', async (req, res) => {
    try {
        const { name, email, password, role, status, matricule } = req.body;
        
        // Validation
        if (!name || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: "Tous les champs obligatoires doivent être remplis"
            });
        }
        
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Le mot de passe doit contenir au moins 6 caractères"
            });
        }
        
        // Vérifier que l'email n'existe pas déjà
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Cet email est déjà utilisé"
            });
        }
        
        const userData = {
            name,
            email,
            password,
            role,
            status: status || 'active',
            matricule: role === 'student' ? matricule || null : null
        };
        
        const newUser = await User.create(userData);
        
        res.status(201).json({
            success: true,
            message: "Utilisateur créé avec succès",
            user: newUser
        });
        
    } catch (error) {
        console.error('❌ Erreur création utilisateur:', error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la création de l'utilisateur"
        });
    }
});

// Mettre à jour un utilisateur
router.put('/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const updates = req.body;
        
        // Empêcher la modification du mot de passe via cette route
        delete updates.password;
        
        // Empêcher un non-admin de devenir admin (sécurité supplémentaire)
        if (updates.role === 'admin' && req.user.id.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: "Seul un administrateur peut modifier son propre rôle"
            });
        }
        
        const result = await User.update(userId, updates);
        
        res.json({
            success: true,
            message: "Utilisateur mis à jour avec succès",
            user: result
        });
        
    } catch (error) {
        console.error('❌ Erreur mise à jour utilisateur:', error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la mise à jour de l'utilisateur"
        });
    }
});

// Changer le statut d'un utilisateur
router.put('/users/:id/status', async (req, res) => {
    try {
        const userId = req.params.id;
        const { status } = req.body;
        
        if (!status || !['active', 'inactive'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Statut invalide. Utilisez 'active' ou 'inactive'"
            });
        }
        
        // Vérifier que l'utilisateur existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Utilisateur non trouvé"
            });
        }
        
        // Empêcher la désactivation d'un administrateur
        if (user.role === 'admin' && status === 'inactive') {
            return res.status(403).json({
                success: false,
                message: "Impossible de désactiver un administrateur"
            });
        }
        
        const result = await User.update(userId, { status });
        
        res.json({
            success: true,
            message: `Utilisateur ${status === 'active' ? 'réactivé' : 'désactivé'} avec succès`,
            user: result
        });
        
    } catch (error) {
        console.error('❌ Erreur changement statut utilisateur:', error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors du changement de statut"
        });
    }
});

// Supprimer un utilisateur
router.delete('/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Vérifier que l'utilisateur existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Utilisateur non trouvé"
            });
        }
        
        // Empêcher la suppression d'un administrateur
        if (user.role === 'admin') {
            return res.status(403).json({
                success: false,
                message: "Impossible de supprimer un administrateur"
            });
        }
        
        // Vérifier si l'utilisateur a des projets en cours
        if (user.role === 'teacher') {
            const teacherSubjects = await Subject.findByTeacher(userId);
            if (teacherSubjects.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Impossible de supprimer un enseignant avec des sujets attribués"
                });
            }
        }
        
        if (user.role === 'student') {
            const studentEnrollments = await Enrollment.findByStudent(userId);
            const activeEnrollments = studentEnrollments.filter(e => 
                ['approved', 'in_progress'].includes(e.status)
            );
            
            if (activeEnrollments.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Impossible de supprimer un étudiant avec des projets en cours"
                });
            }
        }
        
        // Désactiver au lieu de supprimer (meilleure pratique)
        await User.deactivate(userId);
        
        res.json({
            success: true,
            message: "Utilisateur désactivé avec succès"
        });
        
    } catch (error) {
        console.error('❌ Erreur suppression utilisateur:', error);
        res.status(500).json({
            success: false,
            message: error.message || "Erreur serveur lors de la suppression de l'utilisateur"
        });
    }
});

module.exports = router;