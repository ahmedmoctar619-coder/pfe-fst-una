// backend/models/Deliverable.js

const db = require('../database/db');

class Deliverable {
    // Créer un nouveau livrable
    static async create(deliverableData) {
        try {
            const result = await db.run(
                `INSERT INTO deliverables 
                 (enrollment_id, type, title, description, file_path, file_name, file_size, version) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    deliverableData.enrollment_id,
                    deliverableData.type,
                    deliverableData.title,
                    deliverableData.description || null,
                    deliverableData.file_path,
                    deliverableData.file_name,
                    deliverableData.file_size,
                    deliverableData.version || 1
                ]
            );
            
            return { id: result.id, ...deliverableData };
        } catch (error) {
            throw new Error(`Erreur création livrable: ${error.message}`);
        }
    }

    // Trouver un livrable par ID
    static async findById(id) {
        try {
            const deliverable = await db.get(
                `SELECT d.*, e.student_id, e.subject_id, u.name as student_name,
                        s.title as subject_title
                 FROM deliverables d
                 JOIN enrollments e ON d.enrollment_id = e.id
                 JOIN users u ON e.student_id = u.id
                 JOIN subjects s ON e.subject_id = s.id
                 WHERE d.id = ?`,
                [id]
            );
            return deliverable;
        } catch (error) {
            throw new Error(`Erreur recherche livrable: ${error.message}`);
        }
    }

    // Récupérer tous les livrables d'un étudiant
    static async findByStudent(studentId, filters = {}) {
        try {
            let sql = `SELECT d.*, s.title as subject_title, e.status as enrollment_status,
                              d.status as deliverable_status
                       FROM deliverables d
                       JOIN enrollments e ON d.enrollment_id = e.id
                       JOIN subjects s ON e.subject_id = s.id
                       WHERE e.student_id = ?`;
            
            const params = [studentId];
            
            if (filters.type) {
                sql += ' AND d.type = ?';
                params.push(filters.type);
            }
            
            if (filters.status) {
                sql += ' AND d.status = ?';
                params.push(filters.status);
            }
            
            sql += ' ORDER BY d.submitted_at DESC';
            
            const deliverables = await db.query(sql, params);
            return deliverables;
        } catch (error) {
            throw new Error(`Erreur récupération livrables étudiant: ${error.message}`);
        }
    }

    // Récupérer les livrables d'un sujet
    static async findBySubject(subjectId) {
        try {
            const deliverables = await db.query(
                `SELECT d.*, u.name as student_name, u.matricule,
                        e.status as enrollment_status
                 FROM deliverables d
                 JOIN enrollments e ON d.enrollment_id = e.id
                 JOIN users u ON e.student_id = u.id
                 WHERE e.subject_id = ?
                 ORDER BY d.submitted_at DESC`,
                [subjectId]
            );
            return deliverables;
        } catch (error) {
            throw new Error(`Erreur récupération livrables sujet: ${error.message}`);
        }
    }

    // Mettre à jour un livrable
    static async update(id, updates) {
        try {
            const fields = [];
            const values = [];
            
            for (const [key, value] of Object.entries(updates)) {
                if (value !== undefined) {
                    fields.push(`${key} = ?`);
                    values.push(value);
                }
            }
            
            if (fields.length === 0) {
                throw new Error('Aucune donnée à mettre à jour');
            }
            
            // Ajouter la date de révision si le statut change
            if (updates.status && updates.status === 'reviewed') {
                fields.push('reviewed_at = CURRENT_TIMESTAMP');
            }
            
            values.push(id);
            
            const sql = `UPDATE deliverables SET ${fields.join(', ')} WHERE id = ?`;
            
            const result = await db.run(sql, values);
            return result;
        } catch (error) {
            throw new Error(`Erreur mise à jour livrable: ${error.message}`);
        }
    }

    // Supprimer un livrable
    static async delete(id) {
        try {
            const deliverable = await this.findById(id);
            
            if (!deliverable) {
                throw new Error('Livrable non trouvé');
            }
            
            if (deliverable.status !== 'submitted') {
                throw new Error('Seuls les livrables avec statut "soumis" peuvent être supprimés');
            }
            
            const result = await db.run('DELETE FROM deliverables WHERE id = ?', [id]);
            return { ...result, file_path: deliverable.file_path };
        } catch (error) {
            throw new Error(`Erreur suppression livrable: ${error.message}`);
        }
    }

    // Compter les livrables par statut
    static async countByStatus(studentId = null) {
        try {
            let sql = `SELECT status, COUNT(*) as count FROM deliverables`;
            const params = [];
            
            if (studentId) {
                sql += ` WHERE enrollment_id IN (
                    SELECT id FROM enrollments WHERE student_id = ?
                )`;
                params.push(studentId);
            }
            
            sql += ' GROUP BY status';
            
            const counts = await db.query(sql, params);
            return counts;
        } catch (error) {
            throw new Error(`Erreur comptage livrables: ${error.message}`);
        }
    }

    // Récupérer les types de livrables disponibles
    static getDeliverableTypes() {
        return [
            { value: 'proposal', label: 'Proposition', description: 'Proposition initiale du PFE' },
            { value: 'report', label: 'Rapport', description: 'Rapport intermédiaire ou final' },
            { value: 'code', label: 'Code source', description: 'Code source du projet' },
            { value: 'presentation', label: 'Présentation', description: 'Diapositives de soutenance' },
            { value: 'data', label: 'Données', description: 'Jeux de données utilisés' },
            { value: 'other', label: 'Autre', description: 'Autre type de document' }
        ];
    }

    // Vérifier si un étudiant peut déposer un livrable
    static async canSubmitDeliverable(studentId, type) {
        try {
            // Vérifier si l'étudiant a un PFE approuvé
            const enrollment = await db.get(
                `SELECT id FROM enrollments 
                 WHERE student_id = ? AND status = 'approved'`,
                [studentId]
            );
            
            if (!enrollment) {
                throw new Error('Vous devez avoir un PFE approuvé pour déposer des livrables');
            }
            
            // Vérifier les limites par type
            const typeLimits = {
                proposal: 2, // Max 2 propositions
                report: 5,   // Max 5 rapports
                code: 10,    // Max 10 uploads de code
                presentation: 3 // Max 3 présentations
            };
            
            if (typeLimits[type]) {
                const count = await db.get(
                    `SELECT COUNT(*) as count FROM deliverables 
                     WHERE enrollment_id = ? AND type = ?`,
                    [enrollment.id, type]
                );
                
                if (count.count >= typeLimits[type]) {
                    throw new Error(`Limite atteinte pour les livrables de type "${type}" (max: ${typeLimits[type]})`);
                }
            }
            
            return enrollment.id;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Deliverable;