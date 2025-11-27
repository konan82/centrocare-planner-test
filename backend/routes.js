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
        const { id, name, specialties } = req.body;
        await pool.query(
            'INSERT INTO tutors (id, name, specialties) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = $2, specialties = $3',
            [id, name, JSON.stringify(specialties)]
        );
        res.json({ ok: true });
    } catch (error) {
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
        const { id, name, age } = req.body;
        await pool.query(
            'INSERT INTO youths (id, name, age) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = $2, age = $3',
            [id, name, age]
        );
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
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
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/shifts', async (req, res) => {
    try {
        const { id, tutorId, youthId, day, start, end } = req.body;
        await pool.query(
            `INSERT INTO shifts (id, tutorId, youthId, day, start, "end") 
       VALUES ($1, $2, $3, $4, $5, $6) 
       ON CONFLICT (id) DO UPDATE SET tutorId = $2, youthId = $3, day = $4, start = $5, "end" = $6`,
            [id, tutorId, youthId, day, start, end]
        );
        res.json({ ok: true });
    } catch (error) {
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
