// backend/server.js (version corrigée)

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { authenticate, authorize } = require('./middlewares/auth');

// Initialisation de l'application
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: ['http://localhost', 'http://127.0.0.1', 'file://'],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques du frontend (pour le développement)
app.use(express.static(path.join(__dirname, '../frontend')));

// Route de bienvenue
app.get('/', (req, res) => {
    res.json({
        message: "API du Système de Suivi des PFE - FST UNA",
        version: "1.0.0",
        année: "2025-2026",
        département: "Mathématiques",
        endpoints: {
            auth: "/api/auth",
            subjects: "/api/subjects",
            users: "/api/users",
            stats: "/api/stats"
        }
    });
});

// Route de statut de l'API
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        timestamp: new Date().toISOString(),
        server: 'PFE FST-UNA Backend',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Routes d'authentification
app.use('/api/auth', require('./routes/auth'));

// Routes des sujets PFE (publiques en lecture)
app.use('/api/subjects', require('./routes/subjects'));

// Routes des utilisateurs (publiques pour test)
app.use('/api/users', require('./routes/users'));

// Routes des statistiques
app.use('/api/stats', require('./routes/stats'));

// ===== ROUTES PROTÉGÉES (TEMPORAIREMENT SIMPLIFIÉES) =====

// Route test d'authentification
app.get('/api/protected/test', authenticate, (req, res) => {
    res.json({
        success: true,
        message: "Accès autorisé",
        user: req.user
    });
});

// Route pour étudiants
app.get('/api/student/dashboard', authenticate, authorize('student'), (req, res) => {
    res.json({
        success: true,
        message: "Dashboard étudiant",
        user: req.user,
        data: {
            enrollments: [],
            subjects: [],
            stats: {
                pfeStatus: "En attente",
                progress: 0
            }
        }
    });
});

// Route pour enseignants
app.get('/api/teacher/dashboard', authenticate, authorize('teacher'), (req, res) => {
    res.json({
        success: true,
        message: "Dashboard enseignant",
        user: req.user,
        data: {
            subjects: [],
            students: [],
            pendingApplications: 0
        }
    });
});

// Route pour administrateurs
app.get('/api/admin/dashboard', authenticate, authorize('admin'), (req, res) => {
    res.json({
        success: true,
        message: "Dashboard administrateur",
        user: req.user,
        data: {
            totalUsers: 0,
            totalSubjects: 0,
            systemStatus: "Operational"
        }
    });
});

// Gestion des erreurs 404
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint non trouvé',
        path: req.path,
        method: req.method
    });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
    console.error('❌ Erreur serveur:', err);
    
    res.status(err.status || 500).json({
        error: 'Erreur interne du serveur',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue',
        timestamp: new Date().toISOString()
    });
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur backend FST-UNA PFE démarré`);
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌐 Environnement: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📅 ${new Date().toLocaleString('fr-FR')}`);
    console.log(`🔗 http://localhost:${PORT}`);
    console.log(`🔗 http://localhost:${PORT}/api/status`);
    console.log(`👤 Test: http://localhost:${PORT}/api/auth/login`);
    
    // Vérifier la structure des dossiers
    checkDirectoryStructure();
});

// Vérifier la structure des dossiers
function checkDirectoryStructure() {
    const requiredDirs = [
        './uploads',
        './database',
        './routes',
        './models',
        './controllers',
        './middlewares'
    ];
    
    console.log('\n📁 Vérification de la structure des dossiers:');
    
    requiredDirs.forEach(dir => {
        const dirPath = path.join(__dirname, dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`   ✅ Créé: ${dir}`);
        } else {
            console.log(`   ✓ Existe: ${dir}`);
        }
    });
    
    console.log('\n✅ Structure des dossiers prête !\n');
}

// Gestion propre de l'arrêt
process.on('SIGINT', () => {
    console.log('\n👋 Arrêt du serveur...');
    process.exit(0);
});