// backend/routes/users.js

const express = require('express');
const router = express.Router();

// Données temporaires
let users = [
    {
        id: 1,
        email: "ahmed.salem@etudiant.una.mr",
        name: "Ahmed Salem",
        role: "student",
        matricule: "MAT2025001",
        department: "Mathématiques",
        year: "Master 1",
        status: "active",
        pfeSubjectId: 1,
        createdAt: "2025-01-10"
    },
    {
        id: 2,
        email: "mohamed.ouldahmed@fst.una.mr",
        name: "Dr. Mohamed Ould Ahmed",
        role: "teacher",
        department: "Mathématiques",
        specialization: "Analyse Mathématique",
        status: "active",
        createdAt: "2025-01-01"
    }
];

// Récupérer tous les utilisateurs (admin seulement)
router.get('/', (req, res) => {
    // En production, vérifier le token admin
    res.json({
        success: true,
        count: users.length,
        users: users.map(user => {
            const { ...userWithoutSensitive } = user;
            return userWithoutSensitive;
        })
    });
});

// Récupérer un utilisateur par ID
router.get('/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    const user = users.find(u => u.id === userId);
    
    if (!user) {
        return res.status(404).json({
            success: false,
            message: "Utilisateur non trouvé"
        });
    }
    
    const { ...userWithoutSensitive } = user;
    
    res.json({
        success: true,
        user: userWithoutSensitive
    });
});

// Créer un utilisateur (admin)
router.post('/', (req, res) => {
    const { email, name, role, department } = req.body;
    
    if (!email || !name || !role) {
        return res.status(400).json({
            success: false,
            message: "Email, nom et rôle requis"
        });
    }
    
    const newUser = {
        id: users.length + 1,
        email,
        name,
        role,
        department: department || "Mathématiques",
        status: "active",
        createdAt: new Date().toISOString().split('T')[0]
    };
    
    if (role === 'student') {
        newUser.matricule = `MAT2025${String(users.length + 1).padStart(3, '0')}`;
        newUser.year = "2025-2026";
    }
    
    users.push(newUser);
    
    res.status(201).json({
        success: true,
        message: "Utilisateur créé",
        user: newUser
    });
});

// Mettre à jour un utilisateur
router.put('/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    const updates = req.body;
    
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
        return res.status(404).json({
            success: false,
            message: "Utilisateur non trouvé"
        });
    }
    
    users[userIndex] = { ...users[userIndex], ...updates };
    
    res.json({
        success: true,
        message: "Utilisateur mis à jour",
        user: users[userIndex]
    });
});

// Statistiques des utilisateurs
router.get('/stats/count', (req, res) => {
    const students = users.filter(u => u.role === 'student').length;
    const teachers = users.filter(u => u.role === 'teacher').length;
    const admins = users.filter(u => u.role === 'admin').length;
    
    res.json({
        success: true,
        counts: {
            total: users.length,
            students,
            teachers,
            admins
        },
        percentage: {
            students: Math.round((students / users.length) * 100),
            teachers: Math.round((teachers / users.length) * 100),
            admins: Math.round((admins / users.length) * 100)
        }
    });
});

module.exports = router;