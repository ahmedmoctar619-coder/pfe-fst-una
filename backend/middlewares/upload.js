// backend/middlewares/upload.js

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Créer le dossier uploads s'il n'existe pas
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`📁 Dossier uploads créé: ${uploadDir}`);
}

// Configuration du stockage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Dossier par type d'utilisateur (étudiant/enseignant)
        const userType = req.user?.role || 'student';
        const userDir = path.join(uploadDir, userType, req.user?.id?.toString() || 'anonymous');
        
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }
        
        cb(null, userDir);
    },
    filename: function (req, file, cb) {
        // Nom de fichier sécurisé : timestamp + ID unique + extension originale
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const safeName = file.originalname
            .toLowerCase()
            .replace(/[^a-z0-9.]/g, '-')
            .replace(/-+/g, '-');
        
        const filename = `pfe-${uniqueSuffix}-${safeName}`;
        cb(null, filename);
    }
});

// Filtrage des types de fichiers autorisés
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        // Documents
        'application/pdf', // PDF
        'application/msword', // DOC
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
        'application/vnd.ms-excel', // XLS
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
        'application/vnd.ms-powerpoint', // PPT
        'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
        'text/plain', // TXT
        
        // Archives
        'application/zip',
        'application/x-rar-compressed',
        'application/x-7z-compressed',
        
        // Code
        'text/x-python',
        'application/javascript',
        'text/html',
        'text/css',
        'application/json',
        
        // Images (pour rapports)
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/svg+xml'
    ];
    
    const allowedExtensions = [
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt',
        '.zip', '.rar', '.7z',
        '.py', '.js', '.html', '.css', '.json', '.java', '.c', '.cpp', '.cs',
        '.jpg', '.jpeg', '.png', '.gif', '.svg'
    ];
    
    // Vérifier le type MIME
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } 
    // Vérifier l'extension
    else if (allowedExtensions.includes(path.extname(file.originalname).toLowerCase())) {
        cb(null, true);
    }
    else {
        cb(new Error(`Type de fichier non autorisé: ${file.mimetype}. Seuls ${allowedExtensions.join(', ')} sont acceptés.`), false);
    }
};

// Limites de taille
const limits = {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 5 // Max 5 fichiers par requête
};

// Middleware d'upload configuré
const upload = multer({ 
    storage, 
    fileFilter, 
    limits,
    onError: function(err, next) {
        console.error('❌ Erreur upload Multer:', err);
        next(err);
    }
});

// Middleware pour un seul fichier
const uploadSingle = (fieldName) => upload.single(fieldName);

// Middleware pour plusieurs fichiers
const uploadMultiple = (fieldName, maxCount = 5) => upload.array(fieldName, maxCount);

// Fonction utilitaire pour formatter la taille des fichiers
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Nettoyer les fichiers temporaires en cas d'erreur
function cleanupFiles(files) {
    if (files && Array.isArray(files)) {
        files.forEach(file => {
            if (file.path && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
                console.log(`🗑️ Fichier nettoyé: ${file.path}`);
            }
        });
    }
}

module.exports = {
    upload,
    uploadSingle,
    uploadMultiple,
    formatFileSize,
    cleanupFiles,
    uploadDir
};