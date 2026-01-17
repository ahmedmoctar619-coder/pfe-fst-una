// backend/models/Subject.js

const db = require('../database/db');

class Subject {
    // Créer un nouveau sujet
    static async create(subjectData) {
        try {
            const result = await db.run(
                `INSERT INTO subjects 
                 (title, description, teacher_id, department, specialization, 
                  capacity, requirements, keywords, deadline) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    subjectData.title,
                    subjectData.description,
                    subjectData.teacher_id,
                    subjectData.department || 'Mathématiques',
                    subjectData.specialization || null,
                    subjectData.capacity || 2,
                    subjectData.requirements || null,
                    subjectData.keywords || null,
                    subjectData.deadline || null
                ]
            );
            
            return { id: result.id, ...subjectData };
        } catch (error) {
            throw new Error(`Erreur création sujet: ${error.message}`);
        }
    }

    // Trouver un sujet par ID
    static async findById(id) {
        try {
            const subject = await db.get(
                `SELECT s.*, u.name as teacher_name, u.email as teacher_email
                 FROM subjects s
                 JOIN users u ON s.teacher_id = u.id
                 WHERE s.id = ?`,
                [id]
            );
            return subject;
        } catch (error) {
            throw new Error(`Erreur recherche sujet: ${error.message}`);
        }
    }

    // Récupérer tous les sujets (avec filtres)
    static async findAll(filters = {}) {
        try {
            let sql = `SELECT s.*, u.name as teacher_name, 
                              (SELECT COUNT(*) FROM enrollments e 
                               WHERE e.subject_id = s.id AND e.status = 'approved') as enrolled_count
                       FROM subjects s
                       JOIN users u ON s.teacher_id = u.id`;
            
            const params = [];
            const conditions = [];
            
            // Appliquer les filtres
            if (filters.status) {
                conditions.push('s.status = ?');
                params.push(filters.status);
            }
            
            if (filters.specialization) {
                conditions.push('s.specialization = ?');
                params.push(filters.specialization);
            }
            
            if (filters.teacher_id) {
                conditions.push('s.teacher_id = ?');
                params.push(filters.teacher_id);
            }
            
            if (filters.department) {
                conditions.push('s.department = ?');
                params.push(filters.department);
            }
            
            if (filters.available_only) {
                conditions.push('s.enrolled < s.capacity AND s.status = "available"');
            }
            
            if (conditions.length > 0) {
                sql += ' WHERE ' + conditions.join(' AND ');
            }
            
            sql += ' ORDER BY s.created_at DESC';
            
            if (filters.limit) {
                sql += ' LIMIT ?';
                params.push(filters.limit);
            }
            
            const subjects = await db.query(sql, params);
            return subjects;
        } catch (error) {
            throw new Error(`Erreur récupération sujets: ${error.message}`);
        }
    }

    // Mettre à jour un sujet
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
            
            values.push(id);
            
            const sql = `UPDATE subjects SET ${fields.join(', ')} WHERE id = ?`;
            
            const result = await db.run(sql, values);
            return result;
        } catch (error) {
            throw new Error(`Erreur mise à jour sujet: ${error.message}`);
        }
    }

    // Supprimer un sujet
    static async delete(id) {
        try {
            // Vérifier s'il y a des inscriptions
            const enrollments = await db.get(
                'SELECT COUNT(*) as count FROM enrollments WHERE subject_id = ?',
                [id]
            );
            
            if (enrollments.count > 0) {
                throw new Error('Impossible de supprimer un sujet avec des inscriptions');
            }
            
            const result = await db.run('DELETE FROM subjects WHERE id = ?', [id]);
            return result;
        } catch (error) {
            throw new Error(`Erreur suppression sujet: ${error.message}`);
        }
    }

    // Rechercher des sujets
    static async search(query, filters = {}) {
        try {
            let sql = `SELECT s.*, u.name as teacher_name
                       FROM subjects s
                       JOIN users u ON s.teacher_id = u.id
                       WHERE (s.title LIKE ? OR s.description LIKE ? OR s.keywords LIKE ?)`;
            
            const params = [`%${query}%`, `%${query}%`, `%${query}%`];
            
            // Filtres additionnels
            if (filters.status) {
                sql += ' AND s.status = ?';
                params.push(filters.status);
            }
            
            if (filters.specialization) {
                sql += ' AND s.specialization = ?';
                params.push(filters.specialization);
            }
            
            sql += ' ORDER BY s.created_at DESC LIMIT 50';
            
            const subjects = await db.query(sql, params);
            return subjects;
        } catch (error) {
            throw new Error(`Erreur recherche sujets: ${error.message}`);
        }
    }

    // Compter les sujets par statut
    static async countByStatus() {
        try {
            const counts = await db.query(
                `SELECT status, COUNT(*) as count 
                 FROM subjects 
                 GROUP BY status`
            );
            return counts;
        } catch (error) {
            throw new Error(`Erreur comptage sujets: ${error.message}`);
        }
    }

    // Récupérer les sujets d'un enseignant
    static async findByTeacher(teacherId) {
        try {
            const subjects = await db.query(
                `SELECT s.*, 
                        (SELECT COUNT(*) FROM enrollments e 
                         WHERE e.subject_id = s.id AND e.status = 'approved') as enrolled_count
                 FROM subjects s
                 WHERE s.teacher_id = ?
                 ORDER BY s.created_at DESC`,
                [teacherId]
            );
            return subjects;
        } catch (error) {
            throw new Error(`Erreur récupération sujets enseignant: ${error.message}`);
        }
    }

    // Incrémenter le compteur d'inscriptions
    static async incrementEnrolled(id) {
        try {
            const result = await db.run(
                'UPDATE subjects SET enrolled = enrolled + 1 WHERE id = ? AND enrolled < capacity',
                [id]
            );
            
            if (result.changes === 0) {
                throw new Error('Capacité maximale atteinte');
            }
            
            // Vérifier si le sujet est maintenant complet
            const subject = await this.findById(id);
            if (subject.enrolled >= subject.capacity) {
                await this.update(id, { status: 'full' });
            }
            
            return result;
        } catch (error) {
            throw new Error(`Erreur incrémentation inscriptions: ${error.message}`);
        }
    }

    // Décrémenter le compteur d'inscriptions
    static async decrementEnrolled(id) {
        try {
            const result = await db.run(
                'UPDATE subjects SET enrolled = enrolled - 1 WHERE id = ? AND enrolled > 0',
                [id]
            );
            
            // Mettre à jour le statut si nécessaire
            const subject = await this.findById(id);
            if (subject.enrolled < subject.capacity && subject.status === 'full') {
                await this.update(id, { status: 'available' });
            }
            
            return result;
        } catch (error) {
            throw new Error(`Erreur décrémentation inscriptions: ${error.message}`);
        }
    }
}

module.exports = Subject;