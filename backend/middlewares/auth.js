// backend/middlewares/auth.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Clé secrète (à mettre dans .env en production)
const JWT_SECRET = process.env.JWT_SECRET || 'fst_una_pfe_2025_secret_key_secure_change_me';

// Générer un token JWT
function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name
        },
        JWT_SECRET,
        { expiresIn: '8h' } // Token valide 8 heures
    );
}

// Vérifier un token JWT
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

// Middleware d'authentification générale
const authenticate = async (req, res, next) => {
    try {
        // Récupérer le token du header Authorization
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Accès non autorisé. Token manquant.'
            });
        }
        
        const token = authHeader.split(' ')[1];
        
        // Vérifier le token
        const decoded = verifyToken(token);
        
        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: 'Token invalide ou expiré.'
            });
        }
        
        // Vérifier si l'utilisateur existe toujours
        const user = await User.findById(decoded.id);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Utilisateur non trouvé.'
            });
        }
        
        if (user.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Compte désactivé ou suspendu.'
            });
        }
        
        // Ajouter l'utilisateur à la requête
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
            department: user.department
        };
        
        next();
        
    } catch (error) {
        console.error('❌ Erreur authentification:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de l\'authentification'
        });
    }
};

// Middleware pour vérifier un rôle spécifique
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Utilisateur non authentifié'
            });
        }
        
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Accès refusé. Rôle ${req.user.role} non autorisé.`
            });
        }
        
        next();
    };
};

// Middleware pour étudiants uniquement
const studentOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'student') {
        return res.status(403).json({
            success: false,
            message: 'Accès réservé aux étudiants'
        });
    }
    next();
};

// Middleware pour enseignants uniquement
const teacherOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'teacher') {
        return res.status(403).json({
            success: false,
            message: 'Accès réservé aux enseignants'
        });
    }
    next();
};

// Middleware pour administrateurs uniquement
const adminOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Accès réservé aux administrateurs'
        });
    }
    next();
};

module.exports = {
    generateToken,
    verifyToken,
    authenticate,
    authorize,
    studentOnly,
    teacherOnly,
    adminOnly,
    JWT_SECRET
};