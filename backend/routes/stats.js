// backend/routes/stats.js

const express = require('express');
const router = express.Router();

// Statistiques globales
router.get('/', (req, res) => {
    const stats = {
        general: {
            totalSubjects: 24,
            availableSubjects: 18,
            completedProjects: 6,
            activeProjects: 15,
            pendingProjects: 3
        },
        byDepartment: {
            mathematics: {
                total: 24,
                available: 18,
                enrolled: 42
            },
            computerScience: {
                total: 18,
                available: 12,
                enrolled: 30
            },
            physics: {
                total: 15,
                available: 10,
                enrolled: 25
            }
        },
        timeline: {
            january: { submissions: 5, completions: 1 },
            february: { submissions: 8, completions: 2 },
            march: { submissions: 12, completions: 3 },
            april: { submissions: 15, completions: 6 }
        },
        currentYear: "2025-2026",
        lastUpdated: new Date().toISOString()
    };
    
    res.json({
        success: true,
        stats: stats
    });
});

// Statistiques en temps réel
router.get('/realtime', (req, res) => {
    const realtimeStats = {
        onlineUsers: Math.floor(Math.random() * 50) + 10,
        activeSessions: Math.floor(Math.random() * 30) + 5,
        submissionsToday: Math.floor(Math.random() * 10) + 1,
        pendingApprovals: Math.floor(Math.random() * 5) + 1,
        serverLoad: Math.floor(Math.random() * 30) + 10,
        timestamp: new Date().toISOString()
    };
    
    res.json({
        success: true,
        realtime: realtimeStats
    });
});

module.exports = router;