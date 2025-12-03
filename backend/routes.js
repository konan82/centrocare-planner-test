import express from 'express';
import pool from './db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-this';

// ----- Auth & Users -----

// Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, username: user.username, permissions: user.permissions }, JWT_SECRET, { expiresIn: '24h' });

        res.json({ token, user: { id: user.id, username: user.username, permissions: user.permissions } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Users
router.get('/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, permissions, created_at FROM users ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create User
router.post('/users', async (req, res) => {
    const { username, password, permissions } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (username, password_hash, permissions) VALUES ($1, $2, $3) RETURNING id, username, permissions',
            [username, hashedPassword, JSON.stringify(permissions || [])]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update User Permissions
router.put('/users/:id', async (req, res) => {
    const { permissions } = req.body;
    try {
        const result = await pool.query(
            'UPDATE users SET permissions = $1 WHERE id = $2 RETURNING id, username, permissions',
            [JSON.stringify(permissions), req.params.id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update User Permissions (dedicated endpoint)
router.put('/users/:id/permissions', async (req, res) => {
    const { permissions } = req.body;
    try {
        const result = await pool.query(
            'UPDATE users SET permissions = $1 WHERE id = $2 RETURNING id, username, permissions',
            [JSON.stringify(permissions), req.params.id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete User
router.delete('/users/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ----- Tutors -----
router.get('/tutors', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tutors');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/tutors', async (req, res) => {
    try {
        const { id, name, specialties, maxHoursPerWeek, unavailableDays, notes } = req.body;
        await pool.query(
            `INSERT INTO tutors (id, name, specialties, maxHoursPerWeek, unavailableDays, notes) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       ON CONFLICT (id) DO UPDATE SET 
       name = $2, specialties = $3, maxHoursPerWeek = $4, unavailableDays = $5, notes = $6`,
            [id, name, JSON.stringify(specialties || []), maxHoursPerWeek || 20, JSON.stringify(unavailableDays || []), notes || '']
        );
        res.json({ ok: true });
    } catch (error) {
        console.error("Error saving tutor:", error);
        res.status(500).json({ error: error.message });
    }
});

router.delete('/tutors/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM tutors WHERE id = $1', [req.params.id]);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ----- Youths -----
router.get('/youths', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM youths');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/youths', async (req, res) => {
    try {
        const { id, name, needs, requiredHoursPerWeek, notes } = req.body;
        await pool.query(
            `INSERT INTO youths (id, name, needs, requiredHoursPerWeek, notes) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (id) DO UPDATE SET 
       name = $2, needs = $3, requiredHoursPerWeek = $4, notes = $5`,
            [id, name, JSON.stringify(needs || []), requiredHoursPerWeek || 4, notes || '']
        );
        res.json({ ok: true });
    } catch (error) {
        console.error("Error saving youth:", error.message);
        if (error.detail) console.error("Error detail:", error.detail);
        if (error.code) console.error("Error code:", error.code);
        res.status(500).json({ error: error.message, detail: error.detail });
    }
});

router.delete('/youths/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM youths WHERE id = $1', [req.params.id]);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ----- Shifts -----
router.get('/shifts', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM shifts');
        console.log(`GET /shifts: returning ${result.rows.length} shifts`);
        if (result.rows.length > 0) {
            console.log("First shift columns:", Object.keys(result.rows[0]));
            console.log("First shift data:", result.rows[0]);
        }
        res.json(result.rows);
    } catch (error) {
        console.error("GET /shifts error:", error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/shifts', async (req, res) => {
    try {
        const { id, tutorId, youthId, date, startTime, endTime, activity } = req.body;
        await pool.query(
            `INSERT INTO shifts (id, "tutorId", "youthId", date, "startTime", "endTime", activity) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       ON CONFLICT (id) DO UPDATE SET 
       "tutorId" = $2, "youthId" = $3, date = $4, "startTime" = $5, "endTime" = $6, activity = $7`,
            [id, tutorId, youthId, date, startTime, endTime, activity || '']
        );
        res.json({ ok: true });
    } catch (error) {
        console.error("Error saving shift:", error);
        res.status(500).json({ error: error.message });
    }
});

router.delete('/shifts/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM shifts WHERE id = $1', [req.params.id]);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// TEMPORARY: Clear all shifts (GET so it works in browser)
router.get('/shifts-clear-all/confirm', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM shifts');
        console.log(`🗑️ Cleared ${result.rowCount} shifts from database`);
        res.json({ ok: true, deleted: result.rowCount });
    } catch (error) {
        console.error("Error clearing shifts:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
