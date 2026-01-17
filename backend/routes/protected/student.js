// backend/routes/protected/student.js

const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Subject = require('../../models/Subject');
const Enrollment = require('../../models/Enrollment');

// Récupérer les sujets disponibles pour l'étudiant
router.get('/subjects', async (req, res) => {
    try {
        const filters = {
            available_only: true,
            status: 'available',
            limit: parseInt(req.query.limit) || 10,
            page: parseInt(req.query.page) || 1
        };
        
        const subjects = await Subject.findAll(filters);
        
        res.json({
            success: true,
            subjects: subjects,
            total: subjects.length,
            page: filters.page
        });
        
    } catch (error) {
        console.error('❌ Erreur récupération sujets étudiant:', error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des sujets"
        });
    }
});

// Récupérer les inscriptions de l'étudiant
router.get('/enrollments', async (req, res) => {
    try {
        const studentId = req.user.id;
        const enrollments = await Enrollment.findByStudent(studentId);
        
        res.json({
            success: true,
            enrollments: enrollments
        });
        
    } catch (error) {
        console.error('❌ Erreur récupération inscriptions:', error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des inscriptions"
        });
    }
});

// Postuler à un sujet
router.post('/enrollments', async (req, res) => {
    try {
        const { subject_id, student_motivation } = req.body;
        const studentId = req.user.id;
        
        if (!subject_id) {
            return res.status(400).json({
                success: false,
                message: "ID du sujet requis"
            });
        }
        
        const enrollmentData = {
            student_id: studentId,
            subject_id: subject_id,
            student_motivation: student_motivation
        };
        
        const newEnrollment = await Enrollment.create(enrollmentData);
        
        res.status(201).json({
            success: true,
            message: "Candidature envoyée avec succès",
            enrollment: newEnrollment
        });
        
    } catch (error) {
        console.error('❌ Erreur candidature:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Récupérer les statistiques de l'étudiant
router.get('/stats', async (req, res) => {
    try {
        const studentId = req.user.id;
        
        // Récupérer l'utilisateur avec son sujet PFE
        const user = await User.findById(studentId);
        
        // Récupérer les inscriptions
        const enrollments = await Enrollment.findByStudent(studentId);
        
        // Récupérer le sujet PFE si approuvé
        let pfeSubject = null;
        const approvedEnrollment = enrollments.find(e => e.status === 'approved');
        
        if (approvedEnrollment && approvedEnrollment.subject_id) {
            pfeSubject = await Subject.findById(approvedEnrollment.subject_id);
        }
        
        const stats = {
            student: {
                name: user.name,
                email: user.email,
                matricule: user.matricule,
                department: user.department,
                year: user.year
            },
            pfe: pfeSubject ? {
                title: pfeSubject.title,
                status: approvedEnrollment?.status || 'pending',
                teacher: pfeSubject.teacher_name,
                start_date: pfeSubject.start_date,
                end_date: pfeSubject.end_date
            } : null,
            enrollments: {
                total: enrollments.length,
                approved: enrollments.filter(e => e.status === 'approved').length,
                pending: enrollments.filter(e => e.status === 'pending').length,
                rejected: enrollments.filter(e => e.status === 'rejected').length
            }
        };
        
        res.json({
            success: true,
            stats: stats
        });
        
    } catch (error) {
        console.error('❌ Erreur récupération statistiques étudiant:', error);
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération des statistiques"
        });
    }
});

module.exports = router;