// backend/database/db.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Chemin vers la base de données
const DB_PATH = path.join(__dirname, 'pfe_fst_una.db');

// Créer le dossier database s'il n'existe pas
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`📁 Dossier database créé: ${dbDir}`);
}

// Connexion à la base de données
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Erreur de connexion à la base de données:', err.message);
    } else {
        console.log(`✅ Connecté à la base de données SQLite: ${DB_PATH}`);
        initializeDatabase();
    }
});

// Initialiser la base de données
function initializeDatabase() {
    // Table des utilisateurs
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT CHECK(role IN ('student', 'teacher', 'admin')) NOT NULL,
            matricule TEXT,
            department TEXT DEFAULT 'Mathématiques',
            specialization TEXT,
            year TEXT,
            phone TEXT,
            address TEXT,
            status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
            pfe_subject_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pfe_subject_id) REFERENCES subjects(id)
        )
    `, (err) => {
        if (err) {
            console.error('❌ Erreur création table users:', err.message);
        } else {
            console.log('✅ Table users prête');
            // Ajouter un utilisateur admin par défaut
            addDefaultAdmin();
        }
    });

    // Table des sujets PFE
    db.run(`
        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            teacher_id INTEGER NOT NULL,
            department TEXT DEFAULT 'Mathématiques',
            specialization TEXT,
            capacity INTEGER DEFAULT 2,
            enrolled INTEGER DEFAULT 0,
            status TEXT DEFAULT 'available' CHECK(status IN ('available', 'full', 'archived', 'in_progress', 'completed')),
            requirements TEXT,
            keywords TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            deadline DATE,
            start_date DATE,
            end_date DATE,
            FOREIGN KEY (teacher_id) REFERENCES users(id)
        )
    `, (err) => {
        if (err) {
            console.error('❌ Erreur création table subjects:', err.message);
        } else {
            console.log('✅ Table subjects prête');
            // Ajouter des sujets par défaut
            addDefaultSubjects();
        }
    });

    // Table des inscriptions étudiantes
    db.run(`
        CREATE TABLE IF NOT EXISTS enrollments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            subject_id INTEGER NOT NULL,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'completed', 'abandoned')),
            application_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            approval_date DATETIME,
            teacher_notes TEXT,
            student_motivation TEXT,
            UNIQUE(student_id, subject_id),
            FOREIGN KEY (student_id) REFERENCES users(id),
            FOREIGN KEY (subject_id) REFERENCES subjects(id)
        )
    `, (err) => {
        if (err) {
            console.error('❌ Erreur création table enrollments:', err.message);
        } else {
            console.log('✅ Table enrollments prête');
        }
    });

    // Table des livrables
    db.run(`
        CREATE TABLE IF NOT EXISTS deliverables (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            enrollment_id INTEGER NOT NULL,
            type TEXT CHECK(type IN ('proposal', 'report', 'code', 'presentation', 'other')) NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            file_path TEXT,
            file_name TEXT,
            file_size INTEGER,
            status TEXT DEFAULT 'submitted' CHECK(status IN ('submitted', 'reviewed', 'approved', 'rejected', 'revised')),
            submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            reviewed_at DATETIME,
            grade REAL CHECK(grade >= 0 AND grade <= 20),
            teacher_feedback TEXT,
            version INTEGER DEFAULT 1,
            FOREIGN KEY (enrollment_id) REFERENCES enrollments(id)
        )
    `, (err) => {
        if (err) {
            console.error('❌ Erreur création table deliverables:', err.message);
        } else {
            console.log('✅ Table deliverables prête');
        }
    });

    // Table des soutenances
    db.run(`
        CREATE TABLE IF NOT EXISTS defenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            enrollment_id INTEGER NOT NULL,
            defense_date DATETIME NOT NULL,
            room TEXT,
            jury_members TEXT, -- JSON array des IDs des enseignants
            grade REAL CHECK(grade >= 0 AND grade <= 20),
            comments TEXT,
            status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'completed', 'postponed', 'cancelled')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (enrollment_id) REFERENCES enrollments(id)
        )
    `, (err) => {
        if (err) {
            console.error('❌ Erreur création table defenses:', err.message);
        } else {
            console.log('✅ Table defenses prête');
        }
    });

    // Table des notifications
    db.run(`
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT CHECK(type IN ('info', 'success', 'warning', 'error')) NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            is_read BOOLEAN DEFAULT 0,
            link TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `, (err) => {
        if (err) {
            console.error('❌ Erreur création table notifications:', err.message);
        } else {
            console.log('✅ Table notifications prête');
        }
    });

    console.log('🎉 Initialisation de la base de données terminée !');
}

// Ajouter un administrateur par défaut
function addDefaultAdmin() {
    const adminEmail = 'admin.pfe@fst.una.mr';
    
    db.get('SELECT * FROM users WHERE email = ?', [adminEmail], (err, row) => {
        if (err) {
            console.error('❌ Erreur vérification admin:', err.message);
            return;
        }
        
        if (!row) {
            const admin = {
                email: adminEmail,
                password: '$2a$10$YourHashedPasswordHere', // "admin123" hashé
                name: 'Administrateur Système',
                role: 'admin',
                department: 'Informatique',
                status: 'active'
            };
            
            db.run(
                `INSERT INTO users (email, password, name, role, department, status) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [admin.email, admin.password, admin.name, admin.role, admin.department, admin.status],
                function(err) {
                    if (err) {
                        console.error('❌ Erreur création admin:', err.message);
                    } else {
                        console.log(`👑 Administrateur par défaut créé (ID: ${this.lastID})`);
                    }
                }
            );
        }
    });
}

// Ajouter des sujets par défaut
function addDefaultSubjects() {
    const defaultSubjects = [
        {
            title: "Analyse des systèmes dynamiques non linéaires",
            description: "Étude des comportements chaotiques dans les systèmes différentiels avec applications aux modèles économiques et écologiques.",
            teacher_id: 1,
            specialization: "Analyse Mathématique",
            capacity: 2,
            requirements: "Bonne maîtrise de l'analyse réelle, équations différentielles, programmation Python",
            keywords: "dynamique, chaos, modélisation",
            deadline: "2025-03-15"
        },
        {
            title: "Optimisation de réseaux de transport en Mauritanie",
            description: "Application des algorithmes d'optimisation et de la recherche opérationnelle aux problèmes de logistique et transport en contexte mauritanien.",
            teacher_id: 1,
            specialization: "Recherche Opérationnelle",
            capacity: 3,
            requirements: "Programmation linéaire, graphes, Python/Julia, connaissances en géographie",
            keywords: "optimisation, transport, logistique",
            deadline: "2025-03-20"
        },
        {
            title: "Cryptographie et sécurité des données sensibles",
            description: "Implémentation et analyse d'algorithmes cryptographiques modernes avec applications à la protection des données administratives.",
            teacher_id: 1,
            specialization: "Informatique Théorique",
            capacity: 2,
            requirements: "Mathématiques discrètes, théorie des nombres, programmation C/C++",
            keywords: "cryptographie, sécurité, algorithmes",
            deadline: "2025-03-10"
        }
    ];

    // Vérifier si des sujets existent déjà
    db.get('SELECT COUNT(*) as count FROM subjects', [], (err, row) => {
        if (err) {
            console.error('❌ Erreur vérification sujets:', err.message);
            return;
        }
        
        if (row.count === 0) {
            console.log('📚 Ajout des sujets par défaut...');
            
            defaultSubjects.forEach((subject, index) => {
                db.run(
                    `INSERT INTO subjects 
                     (title, description, teacher_id, specialization, capacity, requirements, keywords, deadline) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        subject.title,
                        subject.description,
                        subject.teacher_id,
                        subject.specialization,
                        subject.capacity,
                        subject.requirements,
                        subject.keywords,
                        subject.deadline
                    ],
                    function(err) {
                        if (err) {
                            console.error(`❌ Erreur création sujet ${index + 1}:`, err.message);
                        } else {
                            console.log(`✅ Sujet "${subject.title.substring(0, 40)}..." créé (ID: ${this.lastID})`);
                        }
                    }
                );
            });
        }
    });
}

// Fonctions utilitaires
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id: this.lastID, changes: this.changes });
            }
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

// Exporter la connexion et les fonctions utilitaires
module.exports = {
    db,
    query,
    run,
    get,
    DB_PATH
};