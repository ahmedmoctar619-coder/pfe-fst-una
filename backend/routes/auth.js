// backend/routes/auth.js 

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, authenticate } = require('../middlewares/auth');

// ===== ROUTE GET POUR TEST (à retirer en production) =====
router.get('/login', (req, res) => {
    res.json({
        success: true,
        message: "API d'authentification PFE FST-UNA",
        instructions: "Utilisez POST pour vous connecter",
        test_credentials: {
            student: {
                email: "ahmed.salem@etudiant.una.mr",
                password: "etu123"
            },
            teacher: {
                email: "mohamed.ouldahmed@fst.una.mr",
                password: "prof123"
            },
            admin: {
                email: "admin.pfe@fst.una.mr",
                password: "admin123"
            }
        },
        example_post: {
            method: "POST",
            url: "/api/auth/login",
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                email: "ahmed.salem@etudiant.una.mr",
                password: "etu123",
                role: "student"
            }
        }
    });
});

// ===== ROUTE POST POUR LA CONNEXION =====
router.post('/login', async (req, res) => {
    try {
        console.log('📨 Requête de connexion reçue:', req.body);
        
        const { email, password, role } = req.body;
        
        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email et mot de passe requis"
            });
        }
        
        // Chercher l'utilisateur
        const user = await User.findByEmail(email);
        console.log('👤 Utilisateur trouvé:', user ? 'Oui' : 'Non');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Identifiants incorrects"
            });
        }
        
        // Vérifier le rôle si spécifié
        if (role && user.role !== role) {
            return res.status(401).json({
                success: false,
                message: `Accès non autorisé. Votre rôle est: ${user.role}`
            });
        }
        
        // Vérifier le statut
        if (user.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: "Compte désactivé ou suspendu"
            });
        }
        
        // Vérifier le mot de passe
        const isValidPassword = await User.verifyPassword(password, user.password);
        console.log('🔐 Mot de passe valide:', isValidPassword);
        
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: "Identifiants incorrects"
            });
        }
        
        // Générer le token JWT
        const token = generateToken(user);
        
        // Créer la réponse (sans mot de passe)
        const { password: _, ...userWithoutPassword } = user;
        
        console.log('✅ Connexion réussie pour:', user.email);
        
        res.json({
            success: true,
            message: "Connexion réussie",
            user: userWithoutPassword,
            token: token,
            expiresIn: '8h',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Erreur connexion:', error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la connexion",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Vérifier la session (avec token)
router.get('/verify', authenticate, (req, res) => {
    res.json({
        success: true,
        message: "Session valide",
        user: req.user,
        timestamp: new Date().toISOString()
    });
});

// Changer le mot de passe (utilisateur connecté)
router.post('/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const userId = req.user.id;
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Tous les champs sont requis"
            });
        }
        
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Les nouveaux mots de passe ne correspondent pas"
            });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Le nouveau mot de passe doit contenir au moins 6 caractères"
            });
        }
        
        // Récupérer l'utilisateur
        const user = await User.findByEmail(req.user.email);
        
        // Vérifier l'ancien mot de passe
        const isValidPassword = await User.verifyPassword(currentPassword, user.password);
        
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: "Mot de passe actuel incorrect"
            });
        }
        
        // Changer le mot de passe
        await User.changePassword(userId, newPassword);
        
        res.json({
            success: true,
            message: "Mot de passe changé avec succès"
        });
        
    } catch (error) {
        console.error('❌ Erreur changement mot de passe:', error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors du changement de mot de passe"
        });
    }
});

// Déconnexion (côté client seulement - invalider le token côté client)
router.post('/logout', authenticate, (req, res) => {
    res.json({
        success: true,
        message: "Déconnexion réussie. Veuillez supprimer le token côté client."
    });
});

// Inscription (première connexion étudiant)
router.post('/register', async (req, res) => {
    try {
        const { email, matricule, password, confirmPassword, name } = req.body;
        
        // Validation
        if (!email || !matricule || !password) {
            return res.status(400).json({
                success: false,
                message: "Tous les champs sont requis"
            });
        }
        
        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Les mots de passe ne correspondent pas"
            });
        }
        
        // Vérifier si c'est un email étudiant UNA
        if (!email.includes('@etudiant.una.mr')) {
            return res.status(400).json({
                success: false,
                message: "Veuillez utiliser votre email étudiant UNA (@etudiant.una.mr)"
            });
        }
        
        // Vérifier si l'utilisateur existe déjà
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Cet email est déjà utilisé"
            });
        }
        
        // Créer l'utilisateur
        const userData = {
            email,
            password,
            name: name || email.split('@')[0].replace('.', ' '),
            role: 'student',
            matricule,
            department: 'Mathématiques',
            year: '2025-2026'
        };
        
        const newUser = await User.create(userData);
        
        res.status(201).json({
            success: true,
            message: "Compte créé avec succès",
            user: newUser,
            token: `token-${Date.now()}-${newUser.id}`
        });
        
    } catch (error) {
        console.error('❌ Erreur inscription:', error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de l'inscription"
        });
    }
});

// Données temporaires (à remplacer par la base de données)
const users = [
    {
        id: 1,
        email: "etudiant.demo@etudiant.una.mr",
        password: "demo123",
        name: "Ahmed Salem",
        role: "student",
        matricule: "MAT2025001",
        department: "Mathématiques",
        year: "2025-2026"
    },
    {
        id: 2,
        email: "enseignant.demo@fst.una.mr",
        password: "demo123",
        name: "Dr. Mohamed Ould Ahmed",
        role: "teacher",
        department: "Mathématiques",
        specialization: "Analyse Mathématique"
    },
    {
        id: 3,
        email: "admin.pfe@fst.una.mr",
        password: "admin123",
        name: "Administrateur Système",
        role: "admin",
        department: "Informatique"
    }
];

// Connexion
router.post('/login', (req, res) => {
    const { email, password, role } = req.body;
    
    // Validation
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email et mot de passe requis"
        });
    }
    
    // Rechercher l'utilisateur
    const user = users.find(u => 
        u.email === email && 
        u.password === password && 
        (!role || u.role === role)
    );
    
    if (!user) {
        return res.status(401).json({
            success: false,
            message: "Identifiants incorrects"
        });
    }
    
    // Créer la réponse (sans le mot de passe)
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
        success: true,
        message: "Connexion réussie",
        user: userWithoutPassword,
        token: `token-${Date.now()}-${user.id}`,
        timestamp: new Date().toISOString()
    });
});

// Inscription (première connexion)
router.post('/register', (req, res) => {
    const { email, matricule, password, confirmPassword } = req.body;
    
    // Validation
    if (!email || !matricule || !password) {
        return res.status(400).json({
            success: false,
            message: "Tous les champs sont requis"
        });
    }
    
    if (password !== confirmPassword) {
        return res.status(400).json({
            success: false,
            message: "Les mots de passe ne correspondent pas"
        });
    }
    
    // Vérifier si l'utilisateur existe déjà
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        return res.status(409).json({
            success: false,
            message: "Cet email est déjà utilisé"
        });
    }
    
    // Créer un nouvel utilisateur
    const newUser = {
        id: users.length + 1,
        email,
        password, // À hasher en production !
        name: email.split('@')[0].replace('.', ' '),
        role: email.includes('etudiant') ? 'student' : 
              email.includes('fst') ? 'teacher' : 'student',
        matricule,
        department: "Mathématiques",
        year: "2025-2026",
        createdAt: new Date().toISOString()
    };
    
    // En production, sauvegarder dans la base de données
    users.push(newUser);
    
    // Réponse
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json({
        success: true,
        message: "Compte créé avec succès",
        user: userWithoutPassword,
        token: `token-${Date.now()}-${newUser.id}`
    });
});

// Vérifier la session
router.get('/check', (req, res) => {
    const token = req.headers.authorization;
    
    if (!token) {
        return res.status(401).json({
            authenticated: false,
            message: "Non authentifié"
        });
    }
    
    // En production, valider le token JWT
    res.json({
        authenticated: true,
        message: "Session valide",
        timestamp: new Date().toISOString()
    });
});

// Déconnexion
router.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: "Déconnexion réussie"
    });
});

// Mot de passe oublié
router.post('/forgot-password', (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({
            success: false,
            message: "Email requis"
        });
    }
    
    // En production, envoyer un email de réinitialisation
    res.json({
        success: true,
        message: "Un email de réinitialisation a été envoyé",
        email: email
    });
});

module.exports = router;