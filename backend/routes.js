import express from 'express';
import db from './db.js';

const router = express.Router();

// ----- Tutors -----
router.get('/tutors', (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM tutors').all();
        // Parse specialties JSON string back to array
        const tutors = rows.map(row => ({
            ...row,
            specialties: JSON.parse(row.specialties)
        }));
        res.json(tutors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/tutors', (req, res) => {
    try {
        const { id, name, specialties } = req.body;
        db.prepare('INSERT OR REPLACE INTO tutors (id, name, specialties) VALUES (?, ?, ?)')
            .run(id, name, JSON.stringify(specialties));
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/tutors/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM tutors WHERE id = ?').run(req.params.id);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ----- Youths -----
router.get('/youths', (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM youths').all();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/youths', (req, res) => {
    try {
        const { id, name, age } = req.body;
        db.prepare('INSERT OR REPLACE INTO youths (id, name, age) VALUES (?, ?, ?)')
            .run(id, name, age);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/youths/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM youths WHERE id = ?').run(req.params.id);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ----- Shifts -----
router.get('/shifts', (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM shifts').all();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/shifts', (req, res) => {
    try {
        const { id, tutorId, youthId, day, start, end } = req.body;
        db.prepare(`
      INSERT OR REPLACE INTO shifts
      (id, tutorId, youthId, day, start, "end") VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, tutorId, youthId, day, start, end);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/shifts/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM shifts WHERE id = ?').run(req.params.id);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
