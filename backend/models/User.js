// backend/models/User.js

const db = require('../database/db');
const bcrypt = require('bcryptjs');

class User {
    // Créer un nouvel utilisateur
    static async create(userData) {
        try {
            // Hasher le mot de passe
            const hashedPassword = await bcrypt.hash(userData.password, 10);
            
            const result = await db.run(
                `INSERT INTO users 
                 (email, password, name, role, matricule, department, specialization, year, phone, address) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userData.email,
                    hashedPassword,
                    userData.name,
                    userData.role,
                    userData.matricule || null,
                    userData.department || 'Mathématiques',
                    userData.specialization || null,
                    userData.year || null,
                    userData.phone || null,
                    userData.address || null
                ]
            );
            
            return { id: result.id, ...userData, password: undefined };
        } catch (error) {
            throw new Error(`Erreur création utilisateur: ${error.message}`);
        }
    }

    // Trouver un utilisateur par email
    static async findByEmail(email) {
        try {
            const user = await db.get(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );
            return user;
        } catch (error) {
            throw new Error(`Erreur recherche utilisateur: ${error.message}`);
        }
    }

    // Trouver un utilisateur par ID
    static async findById(id) {
        try {
            const user = await db.get(
                'SELECT id, email, name, role, matricule, department, specialization, year, status, created_at FROM users WHERE id = ?',
                [id]
            );
            return user;
        } catch (error) {
            throw new Error(`Erreur recherche utilisateur: ${error.message}`);
        }
    }

    // Vérifier le mot de passe
    static async verifyPassword(plainPassword, hashedPassword) {
        try {
            return await bcrypt.compare(plainPassword, hashedPassword);
        } catch (error) {
            throw new Error(`Erreur vérification mot de passe: ${error.message}`);
        }
    }

    // Mettre à jour un utilisateur
    static async update(id, updates) {
        try {
            const fields = [];
            const values = [];
            
            // Construire dynamiquement la requête
            for (const [key, value] of Object.entries(updates)) {
                if (value !== undefined) {
                    fields.push(`${key} = ?`);
                    values.push(value);
                }
            }
            
            if (fields.length === 0) {
                throw new Error('Aucune donnée à mettre à jour');
            }
            
            fields.push('updated_at = CURRENT_TIMESTAMP');
            values.push(id);
            
            const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
            
            const result = await db.run(sql, values);
            return result;
        } catch (error) {
            throw new Error(`Erreur mise à jour utilisateur: ${error.message}`);
        }
    }

    // Changer le mot de passe
    static async changePassword(id, newPassword) {
        try {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            
            const result = await db.run(
                'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [hashedPassword, id]
            );
            
            return result;
        } catch (error) {
            throw new Error(`Erreur changement mot de passe: ${error.message}`);
        }
    }

    // Récupérer tous les utilisateurs (avec pagination)
    static async findAll(limit = 100, offset = 0, role = null) {
        try {
            let sql = 'SELECT id, email, name, role, matricule, department, status, created_at FROM users';
            const params = [];
            
            if (role) {
                sql += ' WHERE role = ?';
                params.push(role);
            }
            
            sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);
            
            const users = await db.query(sql, params);
            return users;
        } catch (error) {
            throw new Error(`Erreur récupération utilisateurs: ${error.message}`);
        }
    }

    // Compter les utilisateurs par rôle
    static async countByRole() {
        try {
            const counts = await db.query(
                `SELECT role, COUNT(*) as count 
                 FROM users 
                 WHERE status = 'active' 
                 GROUP BY role`
            );
            return counts;
        } catch (error) {
            throw new Error(`Erreur comptage utilisateurs: ${error.message}`);
        }
    }

    // Désactiver un utilisateur
    static async deactivate(id) {
        try {
            const result = await db.run(
                "UPDATE users SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [id]
            );
            return result;
        } catch (error) {
            throw new Error(`Erreur désactivation utilisateur: ${error.message}`);
        }
    }

    // Récupérer les étudiants avec leur sujet PFE
    static async getStudentsWithSubjects() {
        try {
            const students = await db.query(
                `SELECT u.id, u.name, u.email, u.matricule, 
                        s.title as pfe_title, s.status as pfe_status,
                        e.status as enrollment_status
                 FROM users u
                 LEFT JOIN enrollments e ON u.id = e.student_id AND e.status = 'approved'
                 LEFT JOIN subjects s ON e.subject_id = s.id
                 WHERE u.role = 'student' AND u.status = 'active'
                 ORDER BY u.name`
            );
            return students;
        } catch (error) {
            throw new Error(`Erreur récupération étudiants: ${error.message}`);
        }
    }

    // Rechercher des utilisateurs
    static async search(query, role = null) {
        try {
            let sql = `SELECT id, email, name, role, matricule, department, status 
                       FROM users 
                       WHERE (name LIKE ? OR email LIKE ? OR matricule LIKE ?)`;
            
            const params = [`%${query}%`, `%${query}%`, `%${query}%`];
            
            if (role) {
                sql += ' AND role = ?';
                params.push(role);
            }
            
            sql += ' ORDER BY name LIMIT 50';
            
            const users = await db.query(sql, params);
            return users;
        } catch (error) {
            throw new Error(`Erreur recherche utilisateurs: ${error.message}`);
        }
    }
}

module.exports = User;