// backend/routes/protected/teacher.js

const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Subject = require('../../models/Subject');
const Enrollment = require('../../models/Enrollment');

// Middleware pour vérifier que l'utilisateur est un enseignant
const isTeacher = (req, res, next) => {
    if (req.user.role !== 'teacher') {
        return res.status(403).json({
            success: false,
            message: 'Accès réservé aux enseignants'
        });
    }
    next();
};

// Appliquer le middleware à toutes les routes
router.use(isTeacher);

// ===== STATISTIQUES =====

// Récupérer les statistiques de l'enseignant
router.get('/stats', async (req, res) => {
    try {
        const teacherId = req.user.id;
        
        // Récupérer les sujets de l'enseignant
        const subjects = await Subject.findByTeacher(teacherId);
        
        // Compter les étudiants encadrés
        const students = await User.getStudentsWithSubjects();
        const teacherStudents = students.filter(s => 
            s.pfe_title && subjects.some(sub => sub.title === s.pfe_title)
        );
        
        // Compter les candidatures en attente
        let pendingApplications = 0;
        for (const subject of subjects) {
            const enrollments = await Enrollment.findBySubject(subject.id, 'pending');
            pendingApplications += enrollments.length;
        }
        
        // Calculer les échéances à venir (dans les 7 jours)
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        
        const upcomingDeadlines = subjects.filter(subject => {
            if (!subject.deadline) return false;
            const deadline = new Date(subject.deadline);
            return deadline >= today && deadline <= nextWeek;
        }).length;
        
        const stats = {
            total_subjects: subjects.length,
            available_subjects: subjects.filter(s => s.status === 'available').length,
            total_students: teacherStudents.length,
            pending_applications: pendingApplications,
            upcoming_deadlines: upcomingDeadlines,
            active_students: teacherStudents.filter(s => s.pfe_status === 'in_progress').length,
            completed_students: teacherStudents.filter(s => s.pfe_status === 'completed').length,
            delayed_students: teacherStudents.filter(s => s.enrollment_status === 'delayed').length,
            average_grade: teacherStudents.length > 0 ? 
                teacherStudents.reduce((sum, s) => sum + (s.grade || 0), 0) / teacherStudents.length : 0
        };
        
        res.json({
            success: true,
            stats: stats
        });
        
    } catch (error) {
        console.error('❌ Erreur récupération statistiques enseignant:', error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des statistiques"
        });
    }
});

// ===== GESTION DES SUJETS =====

// Récupérer les sujets de l'enseignant
router.get('/subjects', async (req, res) => {
    try {
        const teacherId = req.user.id;
        const filters = {
            teacher_id: teacherId,
            status: req.query.status !== 'all' ? req.query.status : null,
            limit: parseInt(req.query.limit) || 50
        };
        
        const subjects = await Subject.findAll(filters);
        
        // Appliquer le tri
        const sortBy = req.query.sort || 'newest';
        let sortedSubjects = [...subjects];
        
        switch(sortBy) {
            case 'oldest':
                sortedSubjects.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                break;
            case 'title':
                sortedSubjects.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'deadline':
                sortedSubjects.sort((a, b) => new Date(a.deadline || '9999-12-31') - new Date(b.deadline || '9999-12-31'));
                break;
            case 'newest':
            default:
                sortedSubjects.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
        
        // Recherche par texte
        if (req.query.search) {
            const searchTerm = req.query.search.toLowerCase();
            sortedSubjects = sortedSubjects.filter(subject =>
                subject.title.toLowerCase().includes(searchTerm) ||
                subject.description.toLowerCase().includes(searchTerm) ||
                subject.specialization?.toLowerCase().includes(searchTerm)
            );
        }
        
        res.json({
            success: true,
            subjects: sortedSubjects,
            total: sortedSubjects.length
        });
        
    } catch (error) {
        console.error('❌ Erreur récupération sujets enseignant:', error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des sujets"
        });
    }
});

// Créer un nouveau sujet
router.post('/subjects', async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { title, description, specialization, capacity, requirements, keywords, deadline, status } = req.body;
        
        if (!title || !description) {
            return res.status(400).json({
                success: false,
                message: "Le titre et la description sont obligatoires"
            });
        }
        
        const subjectData = {
            title,
            description,
            teacher_id: teacherId,
            specialization: specialization || null,
            capacity: capacity || 2,
            requirements: requirements || null,
            keywords: keywords || null,
            deadline: deadline || null,
            status: status || 'available'
        };
        
        const newSubject = await Subject.create(subjectData);
        
        res.status(201).json({
            success: true,
            message: "Sujet créé avec succès",
            subject: newSubject
        });
        
    } catch (error) {
        console.error('❌ Erreur création sujet:', error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la création du sujet"
        });
    }
});

// Mettre à jour un sujet
router.put('/subjects/:id', async (req, res) => {
    try {
        const subjectId = req.params.id;
        const teacherId = req.user.id;
        
        // Vérifier que le sujet appartient à l'enseignant
        const subject = await Subject.findById(subjectId);
        if (!subject) {
            return res.status(404).json({
                success: false,
                message: "Sujet non trouvé"
            });
        }
        
        if (subject.teacher_id !== teacherId) {
            return res.status(403).json({
                success: false,
                message: "Vous n'êtes pas autorisé à modifier ce sujet"
            });
        }
        
        const updates = req.body;
        
        // Empêcher la modification de certaines propriétés
        delete updates.teacher_id;
        delete updates.enrolled;
        
        const updatedSubject = await Subject.update(subjectId, updates);
        
        res.json({
            success: true,
            message: "Sujet mis à jour avec succès",
            subject: updatedSubject
        });
        
    } catch (error) {
        console.error('❌ Erreur mise à jour sujet:', error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la mise à jour du sujet"
        });
    }
});

// Supprimer un sujet
router.delete('/subjects/:id', async (req, res) => {
    try {
        const subjectId = req.params.id;
        const teacherId = req.user.id;
        
        // Vérifier que le sujet appartient à l'enseignant
        const subject = await Subject.findById(subjectId);
        if (!subject) {
            return res.status(404).json({
                success: false,
                message: "Sujet non trouvé"
            });
        }
        
        if (subject.teacher_id !== teacherId) {
            return res.status(403).json({
                success: false,
                message: "Vous n'êtes pas autorisé à supprimer ce sujet"
            });
        }
        
        await Subject.delete(subjectId);
        
        res.json({
            success: true,
            message: "Sujet supprimé avec succès"
        });
        
    } catch (error) {
        console.error('❌ Erreur suppression sujet:', error);
        res.status(500).json({
            success: false,
            message: error.message || "Erreur serveur lors de la suppression du sujet"
        });
    }
});

// ===== GESTION DES CANDIDATURES =====

// Récupérer les candidatures pour les sujets de l'enseignant
router.get('/applications', async (req, res) => {
    try {
        const teacherId = req.user.id;
        
        // Récupérer les sujets de l'enseignant
        const subjects = await Subject.findByTeacher(teacherId);
        const subjectIds = subjects.map(s => s.id);
        
        if (subjectIds.length === 0) {
            return res.json({
                success: true,
                applications: []
            });
        }
        
        // Récupérer toutes les inscriptions pour ces sujets
        let allApplications = [];
        
        for (const subjectId of subjectIds) {
            const enrollments = await Enrollment.findBySubject(subjectId);
            allApplications = allApplications.concat(enrollments.map(enrollment => ({
                ...enrollment,
                subject_title: subjects.find(s => s.id === subjectId)?.title
            })));
        }
        
        res.json({
            success: true,
            applications: allApplications,
            total: allApplications.length
        });
        
    } catch (error) {
        console.error('❌ Erreur récupération candidatures:', error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des candidatures"
        });
    }
});

// Traiter une candidature (approuver/rejeter)
router.put('/applications/:id', async (req, res) => {
    try {
        const enrollmentId = req.params.id;
        const { action, notes } = req.body;
        const teacherId = req.user.id;
        
        if (!action || !['approve', 'reject'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: "Action invalide. Utilisez 'approve' ou 'reject'"
            });
        }
        
        // Récupérer l'inscription
        const enrollment = await Enrollment.findById(enrollmentId);
        if (!enrollment) {
            return res.status(404).json({
                success: false,
                message: "Candidature non trouvée"
            });
        }
        
        // Vérifier que le sujet appartient à l'enseignant
        const subject = await Subject.findById(enrollment.subject_id);
        if (!subject || subject.teacher_id !== teacherId) {
            return res.status(403).json({
                success: false,
                message: "Vous n'êtes pas autorisé à traiter cette candidature"
            });
        }
        
        let result;
        if (action === 'approve') {
            result = await Enrollment.approve(enrollmentId, notes);
        } else {
            result = await Enrollment.reject(enrollmentId, notes);
        }
        
        res.json({
            success: true,
            message: action === 'approve' ? 
                "Candidature approuvée avec succès" : 
                "Candidature rejetée",
            enrollment: result
        });
        
    } catch (error) {
        console.error('❌ Erreur traitement candidature:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// ===== GESTION DES ÉTUDIANTS =====

// Récupérer les étudiants encadrés par l'enseignant
router.get('/students', async (req, res) => {
    try {
        const teacherId = req.user.id;
        
        // Récupérer les sujets de l'enseignant
        const subjects = await Subject.findByTeacher(teacherId);
        const subjectIds = subjects.map(s => s.id);
        
        if (subjectIds.length === 0) {
            return res.json({
                success: true,
                students: []
            });
        }
        
        // Récupérer les étudiants inscrits à ces sujets
        let students = [];
        
        for (const subjectId of subjectIds) {
            const enrollments = await Enrollment.findBySubject(subjectId, 'approved');
            
            for (const enrollment of enrollments) {
                const student = await User.findById(enrollment.student_id);
                if (student) {
                    students.push({
                        ...student,
                        subject_title: subjects.find(s => s.id === subjectId)?.title,
                        enrollment_status: enrollment.status,
                        enrollment_id: enrollment.id,
                        grade: enrollment.grade
                    });
                }
            }
        }
        
        res.json({
            success: true,
            students: students,
            total: students.length
        });
        
    } catch (error) {
        console.error('❌ Erreur récupération étudiants:', error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des étudiants"
        });
    }
});

module.exports = router;