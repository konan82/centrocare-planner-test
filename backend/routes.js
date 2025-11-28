import express from 'express';
import pool from './db.js';

const router = express.Router();

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

export default router;
