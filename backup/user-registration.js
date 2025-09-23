#!/usr/bin/env node

/**
 * JAEGER AI - USER REGISTRATION SYSTEM
 * Allows new users to register and get access to the bot
 */

const fs = require('fs');
const path = require('path');

// User database (simple JSON file storage)
const usersDbPath = path.join(__dirname, 'data', 'users.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(usersDbPath))) {
    fs.mkdirSync(path.dirname(usersDbPath), { recursive: true });
}

// Initialize users database if it doesn't exist
if (!fs.existsSync(usersDbPath)) {
    fs.writeFileSync(usersDbPath, JSON.stringify({
        users: {},
        stats: {
            totalUsers: 0,
            totalScans: 0,
            lastUpdate: new Date().toISOString()
        }
    }, null, 2));
}

class UserManager {
    constructor() {
        this.loadUsers();
    }

    loadUsers() {
        try {
            const data = fs.readFileSync(usersDbPath, 'utf8');
            this.db = JSON.parse(data);
        } catch (error) {
            console.error('Error loading users database:', error.message);
            this.db = { users: {}, stats: { totalUsers: 0, totalScans: 0, lastUpdate: new Date().toISOString() } };
        }
    }

    saveUsers() {
        try {
            this.db.stats.lastUpdate = new Date().toISOString();
            fs.writeFileSync(usersDbPath, JSON.stringify(this.db, null, 2));
        } catch (error) {
            console.error('Error saving users database:', error.message);
        }
    }

    registerUser(telegramId, username, firstName, lastName = '') {
        const userId = telegramId.toString();

        if (this.db.users[userId]) {
            return {
                success: false,
                message: 'User already registered',
                user: this.db.users[userId]
            };
        }

        const newUser = {
            telegramId: telegramId,
            username: username || 'unknown',
            firstName: firstName || 'Unknown',
            lastName: lastName,
            registrationDate: new Date().toISOString(),
            status: 'active',
            scansPerformed: 0,
            lastActivity: new Date().toISOString(),
            permissions: {
                maxScansPerDay: 10,
                allowAdvancedScans: true,
                allowRealTools: true
            },
            preferences: {
                outputFormat: 'detailed',
                aiAnalysis: true
            }
        };

        this.db.users[userId] = newUser;
        this.db.stats.totalUsers++;
        this.saveUsers();

        return {
            success: true,
            message: 'User registered successfully',
            user: newUser
        };
    }

    getUser(telegramId) {
        const userId = telegramId.toString();
        return this.db.users[userId] || null;
    }

    updateUserActivity(telegramId) {
        const userId = telegramId.toString();
        if (this.db.users[userId]) {
            this.db.users[userId].lastActivity = new Date().toISOString();
            this.db.users[userId].scansPerformed++;
            this.db.stats.totalScans++;
            this.saveUsers();
        }
    }

    isUserAllowed(telegramId) {
        const user = this.getUser(telegramId);
        if (!user) return false;
        return user.status === 'active';
    }

    getUserStats() {
        return this.db.stats;
    }

    getAllUsers() {
        return Object.values(this.db.users);
    }

    suspendUser(telegramId, reason = 'Violation of terms') {
        const userId = telegramId.toString();
        if (this.db.users[userId]) {
            this.db.users[userId].status = 'suspended';
            this.db.users[userId].suspendReason = reason;
            this.db.users[userId].suspendDate = new Date().toISOString();
            this.saveUsers();
            return true;
        }
        return false;
    }

    reactivateUser(telegramId) {
        const userId = telegramId.toString();
        if (this.db.users[userId]) {
            this.db.users[userId].status = 'active';
            delete this.db.users[userId].suspendReason;
            delete this.db.users[userId].suspendDate;
            this.saveUsers();
            return true;
        }
        return false;
    }
}

module.exports = UserManager;