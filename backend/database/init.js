// backend/database/init.js

const db = require('./db');
const bcrypt = require('bcryptjs');

async function initializeDatabaseWithData() {
    console.log('🚀 Initialisation de la base de données avec des données de test...\n');
    
    try {
        // 1. Créer des enseignants
        console.log('👨‍🏫 Création des enseignants...');
        
        const teachers = [
            {
                email: "mohamed.ouldahmed@fst.una.mr",
                password: await bcrypt.hash("prof123", 10),
                name: "Dr. Mohamed Ould Ahmed",
                role: "teacher",
                department: "Mathématiques",
                specialization: "Analyse Mathématique",
                status: "active"
            },
            {
                email: "aicha.mintmohamed@fst.una.mr",
                password: await bcrypt.hash("prof123", 10),
                name: "Dr. Aicha Mint Mohamed",
                role: "teacher",
                department: "Mathématiques",
                specialization: "Recherche Opérationnelle",
                status: "active"
            },
            {
                email: "sidi.ouldcheikh@fst.una.mr",
                password: await bcrypt.hash("prof123", 10),
                name: "Dr. Sidi Ould Cheikh",
                role: "teacher",
                department: "Mathématiques",
                specialization: "Informatique Théorique",
                status: "active"
            }
        ];
        
        for (const teacher of teachers) {
            const existing = await db.get('SELECT id FROM users WHERE email = ?', [teacher.email]);
            if (!existing) {
                const result = await db.run(
                    `INSERT INTO users (email, password, name, role, department, specialization, status) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [teacher.email, teacher.password, teacher.name, teacher.role, 
                     teacher.department, teacher.specialization, teacher.status]
                );
                console.log(`   ✅ ${teacher.name} créé (ID: ${result.id})`);
            }
        }
        
        // 2. Créer des étudiants
        console.log('\n👨‍🎓 Création des étudiants...');
        
        const students = [
            {
                email: "ahmed.salem@etudiant.una.mr",
                password: await bcrypt.hash("etu123", 10),
                name: "Ahmed Salem",
                role: "student",
                matricule: "MAT2025001",
                department: "Mathématiques",
                year: "Master 1"
            },
            {
                email: "fatimata.mintali@etudiant.una.mr",
                password: await bcrypt.hash("etu123", 10),
                name: "Fatimata Mint Ali",
                role: "student",
                matricule: "MAT2025002",
                department: "Mathématiques",
                year: "Master 1"
            },
            {
                email: "moussa.demba@etudiant.una.mr",
                password: await bcrypt.hash("etu123", 10),
                name: "Moussa Demba",
                role: "student",
                matricule: "MAT2025003",
                department: "Mathématiques",
                year: "Master 1"
            }
        ];
        
        for (const student of students) {
            const existing = await db.get('SELECT id FROM users WHERE email = ?', [student.email]);
            if (!existing) {
                const result = await db.run(
                    `INSERT INTO users (email, password, name, role, matricule, department, year, status) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
                    [student.email, student.password, student.name, student.role, 
                     student.matricule, student.department, student.year]
                );
                console.log(`   ✅ ${student.name} créé (ID: ${result.id})`);
            }
        }
        
        // 3. Créer des sujets PFE
        console.log('\n📚 Création des sujets PFE...');
        
        const subjects = [
            {
                title: "Analyse des systèmes dynamiques non linéaires",
                description: "Étude des comportements chaotiques dans les systèmes différentiels avec applications aux modèles économiques et écologiques en contexte mauritanien.",
                teacher_id: 1,
                specialization: "Analyse Mathématique",
                capacity: 2,
                requirements: "Bonne maîtrise de l'analyse réelle, équations différentielles, programmation Python (numpy, matplotlib)",
                keywords: "dynamique, chaos, modélisation, Mauritanie",
                deadline: "2025-03-15"
            },
            {
                title: "Optimisation de réseaux de transport urbain à Nouakchott",
                description: "Application des algorithmes d'optimisation et de la recherche opérationnelle aux problèmes de transport public dans la capitale mauritanienne.",
                teacher_id: 2,
                specialization: "Recherche Opérationnelle",
                capacity: 3,
                requirements: "Programmation linéaire, théorie des graphes, Python/Julia, collecte de données terrain",
                keywords: "optimisation, transport, Nouakchott, logistique",
                deadline: "2025-03-20"
            },
            {
                title: "Implémentation d'algorithmes cryptographiques pour la sécurisation des données administratives",
                description: "Développement et analyse d'algorithmes de cryptographie moderne (RSA, AES, ECC) avec application à la protection des données sensibles des administrations mauritaniennes.",
                teacher_id: 3,
                specialization: "Informatique Théorique",
                capacity: 2,
                requirements: "Mathématiques discrètes, théorie des nombres, programmation C/C++/Python, bases de cryptographie",
                keywords: "cryptographie, sécurité, algorithmes, administration",
                deadline: "2025-03-10"
            },
            {
                title: "Modélisation mathématique de l'érosion côtière en Mauritanie",
                description: "Développement de modèles mathématiques pour prédire et analyser l'érosion des côtes mauritaniennes sous l'effet du changement climatique.",
                teacher_id: 1,
                specialization: "Mathématiques Appliquées",
                capacity: 2,
                requirements: "Équations aux dérivées partielles, analyse numérique, MATLAB/Python, intérêt pour l'environnement",
                keywords: "modélisation, érosion, environnement, climat",
                deadline: "2025-03-25"
            }
        ];
        
        for (const subject of subjects) {
            const existing = await db.get('SELECT id FROM subjects WHERE title = ?', [subject.title]);
            if (!existing) {
                const result = await db.run(
                    `INSERT INTO subjects (title, description, teacher_id, specialization, capacity, requirements, keywords, deadline) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [subject.title, subject.description, subject.teacher_id, subject.specialization,
                     subject.capacity, subject.requirements, subject.keywords, subject.deadline]
                );
                console.log(`   ✅ "${subject.title.substring(0, 50)}..." créé (ID: ${result.id})`);
            }
        }
        
        // 4. Créer des inscriptions
        console.log('\n📝 Création des inscriptions...');
        
        // Ahmed postule au sujet 1
        await db.run(
            `INSERT INTO enrollments (student_id, subject_id, student_motivation, status) 
             VALUES (4, 1, 'Passionné par les systèmes dynamiques et leurs applications écologiques.', 'approved')`
        );
        
        // Mettre à jour le compteur du sujet
        await db.run('UPDATE subjects SET enrolled = 1 WHERE id = 1');
        
        // Fatimata postule au sujet 2
        await db.run(
            `INSERT INTO enrollments (student_id, subject_id, student_motivation, status) 
             VALUES (5, 2, 'Intéressée par les problèmes de transport à Nouakchott.', 'pending')`
        );
        
        // Moussa postule au sujet 3
        await db.run(
            `INSERT INTO enrollments (student_id, subject_id, student_motivation, status) 
             VALUES (6, 3, 'Souhaite contribuer à la sécurité informatique en Mauritanie.', 'pending')`
        );
        
        console.log('   ✅ Inscriptions créées');
        
        // 5. Mettre à jour l'étudiant avec son sujet approuvé
        await db.run('UPDATE users SET pfe_subject_id = 1 WHERE id = 4');
        
        console.log('\n🎉 Initialisation terminée avec succès !');
        console.log('\n📊 Résumé:');
        console.log('   - 3 enseignants créés');
        console.log('   - 3 étudiants créés');
        console.log('   - 4 sujets PFE créés');
        console.log('   - 3 inscriptions créées (1 approuvée, 2 en attente)');
        console.log('\n🔑 Identifiants de test:');
        console.log('   👨‍🏫 Enseignant: mohamed.ouldahmed@fst.una.mr / prof123');
        console.log('   👨‍🎓 Étudiant: ahmed.salem@etudiant.una.mr / etu123');
        console.log('   👑 Admin: admin.pfe@fst.una.mr / admin123');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
    } finally {
        // Fermer la connexion
        db.db.close();
    }
}

// Exécuter l'initialisation
if (require.main === module) {
    initializeDatabaseWithData();
}

module.exports = { initializeDatabaseWithData };