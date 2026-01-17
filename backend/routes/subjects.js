// backend/routes/subjects.js

const express = require('express');
const router = express.Router();

// Données temporaires
let subjects = [
    {
        id: 1,
        title: "Analyse des systèmes dynamiques non linéaires",
        description: "Étude des comportements chaotiques dans les systèmes différentiels",
        teacherId: 2,
        teacherName: "Dr. Mohamed Ould Ahmed",
        department: "Mathématiques",
        specialization: "Analyse",
        capacity: 2,
        enrolled: 1,
        status: "available",
        requirements: "Bonne maîtrise de l'analyse réelle et des équations différentielles",
        createdAt: "2025-01-15",
        deadline: "2025-03-15"
    },
    {
        id: 2,
        title: "Optimisation de réseaux de transport",
        description: "Application des algorithmes d'optimisation aux problèmes de logistique",
        teacherId: 2,
        teacherName: "Dr. Mohamed Ould Ahmed",
        department: "Mathématiques",
        specialization: "Recherche Opérationnelle",
        capacity: 3,
        enrolled: 0,
        status: "available",
        requirements: "Connaissances en programmation linéaire et Python",
        createdAt: "2025-01-20",
        deadline: "2025-03-20"
    },
    {
        id: 3,
        title: "Cryptographie et sécurité des données",
        description: "Implémentation d'algorithmes cryptographiques modernes",
        teacherId: 2,
        teacherName: "Dr. Mohamed Ould Ahmed",
        department: "Mathématiques",
        specialization: "Informatique Théorique",
        capacity: 2,
        enrolled: 2,
        status: "full",
        requirements: "Mathématiques discrètes, programmation en C/C++",
        createdAt: "2025-01-10",
        deadline: "2025-03-10"
    }
];

// Récupérer tous les sujets
router.get('/', (req, res) => {
    res.json({
        success: true,
        count: subjects.length,
        subjects: subjects
    });
});

// Récupérer un sujet par ID
router.get('/:id', (req, res) => {
    const subject = subjects.find(s => s.id === parseInt(req.params.id));
    
    if (!subject) {
        return res.status(404).json({
            success: false,
            message: "Sujet non trouvé"
        });
    }
    
    res.json({
        success: true,
        subject: subject
    });
});

// Créer un nouveau sujet (enseignant)
router.post('/', (req, res) => {
    const { title, description, teacherId, requirements, capacity } = req.body;
    
    if (!title || !description || !teacherId) {
        return res.status(400).json({
            success: false,
            message: "Titre, description et enseignant sont requis"
        });
    }
    
    const newSubject = {
        id: subjects.length + 1,
        title,
        description,
        teacherId,
        teacherName: "À déterminer",
        department: "Mathématiques",
        specialization: "Général",
        capacity: capacity || 2,
        enrolled: 0,
        status: "available",
        requirements: requirements || "Aucune exigence particulière",
        createdAt: new Date().toISOString().split('T')[0],
        deadline: "2025-03-31"
    };
    
    subjects.push(newSubject);
    
    res.status(201).json({
        success: true,
        message: "Sujet créé avec succès",
        subject: newSubject
    });
});

// Mettre à jour un sujet
router.put('/:id', (req, res) => {
    const subjectId = parseInt(req.params.id);
    const updates = req.body;
    
    const subjectIndex = subjects.findIndex(s => s.id === subjectId);
    
    if (subjectIndex === -1) {
        return res.status(404).json({
            success: false,
            message: "Sujet non trouvé"
        });
    }
    
    // Mettre à jour le sujet
    subjects[subjectIndex] = { ...subjects[subjectIndex], ...updates };
    
    res.json({
        success: true,
        message: "Sujet mis à jour",
        subject: subjects[subjectIndex]
    });
});

// Supprimer un sujet
router.delete('/:id', (req, res) => {
    const subjectId = parseInt(req.params.id);
    
    const subjectIndex = subjects.findIndex(s => s.id === subjectId);
    
    if (subjectIndex === -1) {
        return res.status(404).json({
            success: false,
            message: "Sujet non trouvé"
        });
    }
    
    // Vérifier si des étudiants sont inscrits
    if (subjects[subjectIndex].enrolled > 0) {
        return res.status(400).json({
            success: false,
            message: "Impossible de supprimer un sujet avec des étudiants inscrits"
        });
    }
    
    const deletedSubject = subjects.splice(subjectIndex, 1)[0];
    
    res.json({
        success: true,
        message: "Sujet supprimé",
        subject: deletedSubject
    });
});

// Rechercher des sujets
router.get('/search/:keyword', (req, res) => {
    const keyword = req.params.keyword.toLowerCase();
    
    const filteredSubjects = subjects.filter(subject =>
        subject.title.toLowerCase().includes(keyword) ||
        subject.description.toLowerCase().includes(keyword) ||
        subject.specialization.toLowerCase().includes(keyword)
    );
    
    res.json({
        success: true,
        count: filteredSubjects.length,
        subjects: filteredSubjects
    });
});

module.exports = router;