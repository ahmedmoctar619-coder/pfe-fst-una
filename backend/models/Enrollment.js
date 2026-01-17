// backend/models/Enrollment.js

const db = require('../database/db');

class Enrollment {
    // Créer une nouvelle inscription
    static async create(enrollmentData) {
        try {
            // Vérifier si l'étudiant a déjà un sujet approuvé
            const existingApproval = await db.get(
                `SELECT id FROM enrollments 
                 WHERE student_id = ? AND status = 'approved'`,
                [enrollmentData.student_id]
            );
            
            if (existingApproval) {
                throw new Error('Cet étudiant a déjà un sujet PFE approuvé');
            }
            
            // Vérifier si l'étudiant a déjà postulé à ce sujet
            const existingApplication = await db.get(
                `SELECT id FROM enrollments 
                 WHERE student_id = ? AND subject_id = ?`,
                [enrollmentData.student_id, enrollmentData.subject_id]
            );
            
            if (existingApplication) {
                throw new Error('Vous avez déjà postulé à ce sujet');
            }
            
            const result = await db.run(
                `INSERT INTO enrollments 
                 (student_id, subject_id, student_motivation) 
                 VALUES (?, ?, ?)`,
                [
                    enrollmentData.student_id,
                    enrollmentData.subject_id,
                    enrollmentData.student_motivation || null
                ]
            );
            
            return { id: result.id, ...enrollmentData };
        } catch (error) {
            throw new Error(`Erreur création inscription: ${error.message}`);
        }
    }

    // Trouver une inscription par ID
    static async findById(id) {
        try {
            const enrollment = await db.get(
                `SELECT e.*, 
                        u.name as student_name, u.email as student_email, u.matricule,
                        s.title as subject_title, s.teacher_id,
                        t.name as teacher_name, t.email as teacher_email
                 FROM enrollments e
                 JOIN users u ON e.student_id = u.id
                 JOIN subjects s ON e.subject_id = s.id
                 JOIN users t ON s.teacher_id = t.id
                 WHERE e.id = ?`,
                [id]
            );
            return enrollment;
        } catch (error) {
            throw new Error(`Erreur recherche inscription: ${error.message}`);
        }
    }

    // Récupérer toutes les inscriptions d'un sujet
    static async findBySubject(subjectId, status = null) {
        try {
            let sql = `SELECT e.*, u.name as student_name, u.email, u.matricule
                       FROM enrollments e
                       JOIN users u ON e.student_id = u.id
                       WHERE e.subject_id = ?`;
            
            const params = [subjectId];
            
            if (status) {
                sql += ' AND e.status = ?';
                params.push(status);
            }
            
            sql += ' ORDER BY e.application_date DESC';
            
            const enrollments = await db.query(sql, params);
            return enrollments;
        } catch (error) {
            throw new Error(`Erreur récupération inscriptions sujet: ${error.message}`);
        }
    }

    // Récupérer toutes les inscriptions d'un étudiant
    static async findByStudent(studentId) {
        try {
            const enrollments = await db.query(
                `SELECT e.*, s.title, s.description, s.status as subject_status,
                        u.name as teacher_name
                 FROM enrollments e
                 JOIN subjects s ON e.subject_id = s.id
                 JOIN users u ON s.teacher_id = u.id
                 WHERE e.student_id = ?
                 ORDER BY e.application_date DESC`,
                [studentId]
            );
            return enrollments;
        } catch (error) {
            throw new Error(`Erreur récupération inscriptions étudiant: ${error.message}`);
        }
    }

    // Approuver une inscription
    static async approve(id, teacherNotes = null) {
        try {
            const enrollment = await this.findById(id);
            
            // Vérifier si le sujet a encore de la capacité
            const subject = await db.get(
                'SELECT capacity, enrolled FROM subjects WHERE id = ?',
                [enrollment.subject_id]
            );
            
            if (subject.enrolled >= subject.capacity) {
                throw new Error('La capacité maximale du sujet est atteinte');
            }
            
            // Désapprouver les autres inscriptions de l'étudiant
            await db.run(
                `UPDATE enrollments 
                 SET status = 'rejected', 
                     teacher_notes = 'Autre sujet approuvé'
                 WHERE student_id = ? AND id != ? AND status = 'pending'`,
                [enrollment.student_id, id]
            );
            
            // Approuver cette inscription
            const result = await db.run(
                `UPDATE enrollments 
                 SET status = 'approved', 
                     teacher_notes = ?,
                     approval_date = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [teacherNotes, id]
            );
            
            // Mettre à jour le compteur d'inscriptions du sujet
            if (result.changes > 0) {
                await db.run(
                    'UPDATE subjects SET enrolled = enrolled + 1 WHERE id = ?',
                    [enrollment.subject_id]
                );
                
                // Mettre à jour le sujet de l'étudiant
                await db.run(
                    'UPDATE users SET pfe_subject_id = ? WHERE id = ?',
                    [enrollment.subject_id, enrollment.student_id]
                );
            }
            
            return result;
        } catch (error) {
            throw new Error(`Erreur approbation inscription: ${error.message}`);
        }
    }

    // Rejeter une inscription
    static async reject(id, teacherNotes = null) {
        try {
            const result = await db.run(
                `UPDATE enrollments 
                 SET status = 'rejected', 
                     teacher_notes = ?
                 WHERE id = ?`,
                [teacherNotes, id]
            );
            
            return result;
        } catch (error) {
            throw new Error(`Erreur rejet inscription: ${error.message}`);
        }
    }

    // Marquer comme terminé
    static async complete(id, grade = null) {
        try {
            const result = await db.run(
                `UPDATE enrollments 
                 SET status = 'completed', 
                     grade = ?
                 WHERE id = ?`,
                [grade, id]
            );
            
            return result;
        } catch (error) {
            throw new Error(`Erreur marquage inscription terminée: ${error.message}`);
        }
    }

    // Compter les inscriptions par statut
    static async countByStatus(subjectId = null) {
        try {
            let sql = `SELECT status, COUNT(*) as count FROM enrollments`;
            const params = [];
            
            if (subjectId) {
                sql += ' WHERE subject_id = ?';
                params.push(subjectId);
            }
            
            sql += ' GROUP BY status';
            
            const counts = await db.query(sql, params);
            return counts;
        } catch (error) {
            throw new Error(`Erreur comptage inscriptions: ${error.message}`);
        }
    }
}

module.exports = Enrollment;