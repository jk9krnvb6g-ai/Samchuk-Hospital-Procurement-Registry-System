
const express = require('express');
const mysql = require('mysql2');
const router = express.Router();

// ==========================================
// 🛠️ DATABASE CONFIGURATION
// ==========================================
const DB_CONFIG = { 
    host: '10.1.0.201', user: 'sa', password: 'Sam#11294', database: 'procurement_db', 
    port: 3306, waitForConnections: true, connectionLimit: 10, timezone: '+07:00',
    dateStrings: true, charset: 'utf8mb4', supportBigNumbers: true, bigNumberStrings: true
};

const db = mysql.createPool(DB_CONFIG);

const query = (sql, params) => new Promise((resolve, reject) => {
    db.getConnection((err, connection) => {
        if (err) return reject(err);
        connection.query("SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci';", (err) => {
            if (err) { connection.release(); return reject(err); }
            connection.query(sql, params, (err, res) => {
                connection.release();
                if (err) reject(err); else resolve(res);
            });
        });
    });
});

// ==========================================
// 🛡️ CONTROLLED AUTO-MIGRATION (SAFEGUARD)
// ==========================================
// Encapsulated function: will NEVER execute automatically on Gateway module require().
// Protects production database schema and records from unexpected DDL/ALTER execution.
const runAutoMigration = async () => {
    try { await query('ALTER TABLE receivings ADD COLUMN procurement_id VARCHAR(50)'); } catch (e) {}
    try { await query('ALTER TABLE considerations ADD COLUMN procurement_id VARCHAR(50)'); } catch (e) {}
    try { await query('ALTER TABLE procurements ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE'); } catch (e) {}
    try { await query('ALTER TABLE procurements ADD COLUMN deleted_at BIGINT'); } catch (e) {}
    try { await query('ALTER TABLE procurements ADD COLUMN deleted_by VARCHAR(100)'); } catch (e) {}
    try { await query('ALTER TABLE procurements ADD COLUMN is_locked BOOLEAN DEFAULT FALSE'); } catch (e) {}
    try { await query('ALTER TABLE procurements ADD COLUMN locked_at BIGINT'); } catch (e) {}
    try { await query('ALTER TABLE procurements ADD COLUMN locked_by VARCHAR(100)'); } catch (e) {}
    try { 
        await query(`CREATE TABLE IF NOT EXISTS audit_logs (
            id VARCHAR(50) PRIMARY KEY, 
            timestamp BIGINT NOT NULL, 
            user_id VARCHAR(50), 
            user_name VARCHAR(100), 
            action VARCHAR(50), 
            record_id VARCHAR(50), 
            request_id VARCHAR(50), 
            details TEXT, 
            changes JSON
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`); 
    } catch (e) {}
};

// Export method on router for standalone execution or explicit administrative migration
router.runAutoMigration = runAutoMigration;

const toArabic = (str) => str ? str.toString().replace(/[๐-๙]/g, d => "๐๑๒๓๔๕๖๗๘๙".indexOf(d).toString()) : "";
const toThaiNum = (num) => num.toString().replace(/\d/g, d => ['๐','๑','๒','๓','๔','๕','๖','๗','๘','๙'][parseInt(d)]);

const getFiscalYear = (dateStr) => {
    if (!dateStr) {
        const now = new Date();
        const m = now.getMonth() + 1;
        const y = now.getFullYear();
        return m >= 10 ? y + 1 + 543 : y + 543;
    }
    const str = dateStr.toString().split('T')[0].trim();
    const parts = str.split(/[-\/]/);
    let y, m, d;
    if (parts[0].length === 4) {
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
        d = parseInt(parts[2], 10);
    } else if (parts[2] && parts[2].length === 4) {
        d = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
        y = parseInt(parts[2], 10);
    } else {
        const dateObj = new Date(str);
        y = dateObj.getFullYear();
        m = dateObj.getMonth() + 1;
    }

    if (isNaN(y) || isNaN(m)) {
        const now = new Date();
        const curM = now.getMonth() + 1;
        const curY = now.getFullYear();
        return curM >= 10 ? curY + 1 + 543 : curY + 543;
    }
    // Handle both Buddhist Era (2569/2570) and Gregorian (2026/2027)
    if (y > 2400) {
        return m >= 10 ? y + 1 : y;
    }
    return m >= 10 ? y + 1 + 543 : y + 543;
};

const generateMasterSequence = async (deptId, explicitPrefix = null, requestDate = null) => {
    let prefix = explicitPrefix;
    if (!prefix) {
        let deptRes = [];
        if (deptId) {
            deptRes = await query('SELECT request_prefix FROM departments WHERE id = ?', [deptId]);
        }
        if (deptRes.length === 0) {
            deptRes = await query('SELECT request_prefix FROM departments WHERE request_prefix IS NOT NULL AND request_prefix != "" ORDER BY id LIMIT 1');
        }
        prefix = deptRes[0]?.request_prefix?.trim() || 'สพ.';
    }

    const targetDate = requestDate || new Date().toISOString().split('T')[0];
    const fy = getFiscalYear(targetDate);
    const adYear = fy > 2400 ? fy - 543 : fy;
    
    // Dates in Gregorian and Buddhist for comparison
    const start = `${adYear - 1}-10-01`;
    const end = `${adYear}-09-30`;
    const thaiStart = `${(adYear - 1) + 543}-10-01`;
    const thaiEnd = `${adYear + 543}-09-30`;

    const pattern = `${prefix}%`;

    // Unified Master Sequence Pool:
    // Any request (กำหนดขอบเขตงาน, รายงานขอ, ผลพิจารณา) shares the same running sequence for this prefix & fiscal year!
    const rowsP = await query(`
        SELECT request_id as val 
        FROM procurements 
        WHERE request_id LIKE ? 
          AND (request_date BETWEEN ? AND ? OR request_date BETWEEN ? AND ?)
    `, [pattern, start, end, thaiStart, thaiEnd]).catch(() => []);

    const rowsC = await query(`
        SELECT consideration_number as val 
        FROM considerations 
        WHERE consideration_number LIKE ? 
          AND (consideration_date BETWEEN ? AND ? OR consideration_date BETWEEN ? AND ?)
    `, [pattern, start, end, thaiStart, thaiEnd]).catch(() => []);

    const rowsR = await query(`
        SELECT delivery_note_no as val 
        FROM receivings 
        WHERE delivery_note_no LIKE ? 
          AND (receive_date BETWEEN ? AND ? OR receive_date BETWEEN ? AND ?)
    `, [pattern, start, end, thaiStart, thaiEnd]).catch(() => []);

    // Also check considerations and receivings linked to procurements in this fiscal year (in case their date was recorded differently)
    const linkedC = await query(`
        SELECT c.consideration_number as val
        FROM considerations c
        JOIN procurements p ON c.procurement_id = p.id
        WHERE c.consideration_number LIKE ?
          AND (p.request_date BETWEEN ? AND ? OR p.request_date BETWEEN ? AND ?)
    `, [pattern, start, end, thaiStart, thaiEnd]).catch(() => []);

    const linkedR = await query(`
        SELECT r.delivery_note_no as val
        FROM receivings r
        JOIN procurements p ON r.procurement_id = p.id
        WHERE r.delivery_note_no LIKE ?
          AND (p.request_date BETWEEN ? AND ? OR p.request_date BETWEEN ? AND ?)
    `, [pattern, start, end, thaiStart, thaiEnd]).catch(() => []);

    const allRows = [...rowsP, ...rowsC, ...rowsR, ...linkedC, ...linkedR];

    let maxNum = 0;
    allRows.forEach(row => {
        if (!row.val) return;
        const parts = toArabic(row.val).split('/');
        const lastPart = parts[parts.length - 1];
        const match = lastPart.match(/(\d+)/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
        }
    });

    const formattedPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;
    return `${formattedPrefix}${toThaiNum(maxNum + 1)}`;
};

// ==========================================
// 🚀 API ROUTES
// ==========================================

router.get('/data', async (req, res) => {
    try {
        const [p, r, c, d, w, cat, a, u] = await Promise.all([
            query('SELECT * FROM procurements'), 
            query('SELECT * FROM receivings'),
            query('SELECT * FROM considerations'), 
            query('SELECT * FROM departments'),
            query('SELECT * FROM work_groups'), 
            query('SELECT * FROM procurement_categories'),
            query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 2000').catch(() => []),
            query('SELECT id, username, name, email, role, department_id, status FROM users').catch(() => [])
        ]);
        res.json({
            procurements: p.map(x => ({ 
                ...x, 
                requestId: x.request_id, 
                requestDate: x.request_date, 
                officialNumber: x.official_number, 
                departmentId: x.department_id, 
                createdBy: x.created_by, 
                itemCount: x.item_count, 
                createdAt: x.created_at,
                isDeleted: x.is_deleted === 1 || x.is_deleted === true,
                deletedAt: x.deleted_at,
                deletedBy: x.deleted_by,
                isLocked: x.is_locked === 1 || x.is_locked === true,
                lockedAt: x.locked_at,
                lockedBy: x.locked_by
            })),
            receivings: r.map(x => ({ ...x, requestId: x.request_id, deliveryNoteNo: x.delivery_note_no, receiveDate: x.receive_date, procurementId: x.procurement_id })),
            considerations: c.map(x => ({ ...x, requestId: x.request_id, considerationNumber: x.consideration_number, considerationDate: x.consideration_date, procurementId: x.procurement_id })),
            auditLogs: a.map(x => ({ ...x, recordId: x.record_id, requestId: x.request_id, userName: x.user_name, userId: x.user_id })),
            users: u.map(x => ({ ...x, departmentId: x.department_id })),
            settings: { 
                departments: d.map(dept => ({ ...dept, isActive: dept.is_active === 1, workGroupId: dept.work_group_id, requestPrefix: dept.request_prefix })), 
                categories: cat.map(ctg => ({ ...ctg, isActive: ctg.is_active === 1, departmentId: ctg.department_id })), 
                workGroups: w.map(i => ({ ...i, isActive: i.is_active === 1, prefix: i.prefix })) 
            }
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/procurements', async (req, res) => {
    const p = req.body;
    try {
        const finalRequestId = await generateMasterSequence(p.departmentId, null, p.requestDate);
        let finalOfficialNumber = p.officialNumber || null;

        // Logic: Check by Work Group instead of Department (1 บาทขึ้นไปออกเลขที่ได้เลย)
        if (!finalOfficialNumber && p.amount >= 1) {
            // Find Work Group ID and Prefix for this Department
            const wgRes = await query(`
                SELECT w.id as wg_id, w.prefix as wg_prefix 
                FROM departments d 
                JOIN work_groups w ON d.work_group_id = w.id 
                WHERE d.id = ?`, [p.departmentId]);
            
            const wgId = wgRes[0]?.wg_id;
            let wgPrefix = wgRes[0]?.wg_prefix?.trim();
            if (!wgPrefix) {
                wgPrefix = p.type === 'PURCHASE' ? 'พด.' : p.type === 'HIRING' ? 'จง.' : 'อต.';
            }
            const fy = getFiscalYear(p.requestDate);
            const start = `${fy - 544}-10-01`, end = `${fy - 543}-09-30`;

            // Find max number within ALL departments belonging to the same Work Group
            const rows = await query(`
                SELECT p.official_number 
                FROM procurements p
                JOIN departments d ON p.department_id = d.id
                WHERE d.work_group_id = ? AND p.request_date BETWEEN ? AND ? AND p.official_number LIKE ?`, 
                [wgId, start, end, `${wgPrefix}%`]);

            let maxNum = 0;
            rows.forEach(row => {
                const parts = row.official_number.replace(wgPrefix, '').split('/');
                const num = parseInt(parts[0]?.match(/(\d+)/)?.[0] || 0);
                if (num > maxNum) maxNum = num;
            });
            finalOfficialNumber = `${wgPrefix} ${maxNum + 1}/${fy}`;
        }

        const newId = `proc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        await query('INSERT INTO procurements (id, request_id, request_date, category, item_count, amount, company, remarks, official_number, type, department_id, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
            [newId, finalRequestId, p.requestDate, p.category, p.itemCount, p.amount, p.company, p.remarks, finalOfficialNumber, p.type, p.departmentId, p.createdBy, Date.now()]);
        
        res.json({ success: true, requestId: finalRequestId });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/procurements/:id', async (req, res) => {
    try { await query('DELETE FROM procurements WHERE id = ?', [req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/procurements/:id', async (req, res) => {
    try {
        const p = req.body;
        const fields = []; const params = [];
        if (p.requestId !== undefined) { fields.push('request_id = ?'); params.push(p.requestId); }
        if (p.requestDate !== undefined) { fields.push('request_date = ?'); params.push(p.requestDate); }
        if (p.category !== undefined) { fields.push('category = ?'); params.push(p.category); }
        if (p.itemCount !== undefined) { fields.push('item_count = ?'); params.push(p.itemCount); }
        if (p.amount !== undefined) { fields.push('amount = ?'); params.push(p.amount); }
        if (p.company !== undefined) { fields.push('company = ?'); params.push(p.company); }
        if (p.remarks !== undefined) { fields.push('remarks = ?'); params.push(p.remarks); }
        if (p.officialNumber !== undefined) { fields.push('official_number = ?'); params.push(p.officialNumber); }
        if (fields.length > 0) { params.push(req.params.id); await query(`UPDATE procurements SET ${fields.join(', ')} WHERE id = ?`, params); }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/receivings/upsert', async (req, res) => {
    const r = req.body;
    try {
        let proc = [];
        if (r.procurementId) {
            proc = await query('SELECT id, request_id, department_id, request_date FROM procurements WHERE id = ?', [r.procurementId]);
        }
        if (proc.length === 0 && r.requestDate) {
            const fy = getFiscalYear(r.requestDate);
            const adYear = fy > 2400 ? fy - 543 : fy;
            const start = `${adYear - 1}-10-01`, end = `${adYear}-09-30`;
            proc = await query('SELECT id, request_id, department_id, request_date FROM procurements WHERE request_id = ? AND request_date BETWEEN ? AND ? ORDER BY created_at DESC LIMIT 1', [r.requestId, start, end]);
        }
        if (proc.length === 0 && r.receiveDate) {
            const fy = getFiscalYear(r.receiveDate);
            const adYear = fy > 2400 ? fy - 543 : fy;
            const start = `${adYear - 1}-10-01`, end = `${adYear}-09-30`;
            proc = await query('SELECT id, request_id, department_id, request_date FROM procurements WHERE request_id = ? AND request_date BETWEEN ? AND ? ORDER BY created_at DESC LIMIT 1', [r.requestId, start, end]);
        }
        if (proc.length === 0) {
            proc = await query('SELECT id, request_id, department_id, request_date FROM procurements WHERE request_id = ? ORDER BY request_date DESC, created_at DESC LIMIT 1', [r.requestId]);
        }
        if (proc.length === 0) return res.status(404).json({ success: false, message: "ไม่พบเลขขอบเขตงาน" });

        const targetProcId = proc[0].id;
        const targetReqDate = proc[0].request_date;
        const targetDeptId = proc[0].department_id;
        const targetFy = getFiscalYear(targetReqDate);
        const adYear = targetFy > 2400 ? targetFy - 543 : targetFy;
        const start = `${adYear - 1}-10-01`, end = `${adYear}-09-30`;

        let finalNumber = r.deliveryNoteNo;
        if (!finalNumber || finalNumber.trim() === '') {
            const fullId = proc[0].request_id;
            const lastPartMatch = toArabic(fullId).match(/(\d+)$/);
            let prefix = lastPartMatch ? fullId.substring(0, fullId.length - lastPartMatch[0].length) : fullId;
            finalNumber = await generateMasterSequence(targetDeptId, prefix, targetReqDate);
        }

        let existing = [];
        if (targetProcId) {
            existing = await query('SELECT id FROM receivings WHERE procurement_id = ?', [targetProcId]).catch(() => []);
        }
        if (existing.length === 0) {
            existing = await query('SELECT id FROM receivings WHERE request_id = ? AND receive_date BETWEEN ? AND ?', [r.requestId, start, end]);
        }

        if (existing.length > 0) {
            try {
                await query('UPDATE receivings SET delivery_note_no=?, receive_date=?, procurement_id=? WHERE id=?', [finalNumber, r.receiveDate, targetProcId, existing[0].id]);
            } catch (e) {
                await query('UPDATE receivings SET delivery_note_no=?, receive_date=? WHERE id=?', [finalNumber, r.receiveDate, existing[0].id]);
            }
        } else {
            const newId = `recv_${Date.now()}`;
            try {
                await query('INSERT INTO receivings (id, request_id, delivery_note_no, receive_date, created_at, procurement_id) VALUES (?,?,?,?,?,?)', [newId, r.requestId, finalNumber, r.receiveDate, Date.now(), targetProcId]);
            } catch (e) {
                await query('INSERT INTO receivings (id, request_id, delivery_note_no, receive_date, created_at) VALUES (?,?,?,?,?)', [newId, r.requestId, finalNumber, r.receiveDate, Date.now()]);
            }
        }
        res.json({ success: true, deliveryNoteNo: finalNumber });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/considerations/upsert', async (req, res) => {
    const c = req.body;
    try {
        let proc = [];
        if (c.procurementId) {
            proc = await query('SELECT id, request_id, department_id, request_date FROM procurements WHERE id = ?', [c.procurementId]);
        }
        if (proc.length === 0 && c.requestDate) {
            const fy = getFiscalYear(c.requestDate);
            const adYear = fy > 2400 ? fy - 543 : fy;
            const start = `${adYear - 1}-10-01`, end = `${adYear}-09-30`;
            proc = await query('SELECT id, request_id, department_id, request_date FROM procurements WHERE request_id = ? AND request_date BETWEEN ? AND ? ORDER BY created_at DESC LIMIT 1', [c.requestId, start, end]);
        }
        if (proc.length === 0 && c.considerationDate) {
            const fy = getFiscalYear(c.considerationDate);
            const adYear = fy > 2400 ? fy - 543 : fy;
            const start = `${adYear - 1}-10-01`, end = `${adYear}-09-30`;
            proc = await query('SELECT id, request_id, department_id, request_date FROM procurements WHERE request_id = ? AND request_date BETWEEN ? AND ? ORDER BY created_at DESC LIMIT 1', [c.requestId, start, end]);
        }
        if (proc.length === 0) {
            proc = await query('SELECT id, request_id, department_id, request_date FROM procurements WHERE request_id = ? ORDER BY request_date DESC, created_at DESC LIMIT 1', [c.requestId]);
        }
        if (proc.length === 0) return res.status(404).json({ success: false, message: "ไม่พบเลขขอบเขตงาน" });

        const targetProcId = proc[0].id;
        const targetReqDate = proc[0].request_date;
        const targetDeptId = proc[0].department_id;
        const targetFy = getFiscalYear(targetReqDate);
        const adYear = targetFy > 2400 ? targetFy - 543 : targetFy;
        const start = `${adYear - 1}-10-01`, end = `${adYear}-09-30`;

        let finalNumber = c.considerationNumber;
        if (!finalNumber || finalNumber.trim() === '') {
            const fullId = proc[0].request_id;
            const lastPartMatch = toArabic(fullId).match(/(\d+)$/);
            let prefix = lastPartMatch ? fullId.substring(0, fullId.length - lastPartMatch[0].length) : fullId;
            finalNumber = await generateMasterSequence(targetDeptId, prefix, targetReqDate);
        }

        let existing = [];
        if (targetProcId) {
            existing = await query('SELECT id FROM considerations WHERE procurement_id = ?', [targetProcId]).catch(() => []);
        }
        if (existing.length === 0) {
            existing = await query('SELECT id FROM considerations WHERE request_id = ? AND consideration_date BETWEEN ? AND ?', [c.requestId, start, end]);
        }

        if (existing.length > 0) {
            try {
                await query('UPDATE considerations SET consideration_number=?, consideration_date=?, procurement_id=? WHERE id=?', [finalNumber, c.considerationDate, targetProcId, existing[0].id]);
            } catch (e) {
                await query('UPDATE considerations SET consideration_number=?, consideration_date=? WHERE id=?', [finalNumber, c.considerationDate, existing[0].id]);
            }
        } else {
            const newId = `cons_${Date.now()}`;
            try {
                await query('INSERT INTO considerations (id, request_id, consideration_number, consideration_date, procurement_id) VALUES (?,?,?,?,?)', [newId, c.requestId, finalNumber, c.considerationDate, targetProcId]);
            } catch (e) {
                await query('INSERT INTO considerations (id, request_id, consideration_number, consideration_date) VALUES (?,?,?,?)', [newId, c.requestId, finalNumber, c.considerationDate]);
            }
        }
        res.json({ success: true, considerationNumber: finalNumber });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const users = await query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
        if (users.length > 0) res.json({ success: true, user: { id: users[0].id, name: users[0].name, role: users[0].role, departmentId: users[0].department_id } });
        else res.json({ success: false, message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
    } catch (e) { res.status(500).json({ success: false }); }
});

router.get('/users', async (req, res) => {
    try { const users = await query('SELECT * FROM users'); res.json(users.map(u => ({ ...u, departmentId: u.department_id, createdAt: u.created_at }))); } catch (e) { res.status(500).json([]); }
});

router.patch('/users/:id', async (req, res) => {
    try {
        const fields = Object.entries(req.body).map(([k,v]) => `${k === 'departmentId' ? 'department_id' : k} = ?`);
        if (fields.length) await query(`UPDATE users SET ${fields.join(',')} WHERE id = ?`, [...Object.values(req.body), req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

router.post('/workgroup', async (req, res) => {
    const { id, name, prefix, isActive } = req.body;
    try { await query('INSERT INTO work_groups (id, name, prefix, is_active) VALUES (?,?,?,?)', [id, name, prefix, isActive ? 1 : 0]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/workgroup/:id', async (req, res) => {
    const { name, prefix, isActive } = req.body;
    try {
        let sql = 'UPDATE work_groups SET '; const params = []; const updates = [];
        if (name !== undefined) { updates.push('name = ?'); params.push(name); }
        if (prefix !== undefined) { updates.push('prefix = ?'); params.push(prefix); }
        if (isActive !== undefined) { updates.push('is_active = ?'); params.push(isActive ? 1 : 0); }
        if (updates.length > 0) { sql += updates.join(', ') + ' WHERE id = ?'; params.push(req.params.id); await query(sql, params); }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/department', async (req, res) => {
    const { id, name, prefix, requestPrefix, workGroupId, isActive } = req.body;
    try { await query('INSERT INTO departments (id, name, prefix, request_prefix, work_group_id, is_active) VALUES (?,?,?,?,?,?)', [id, name, prefix, requestPrefix, workGroupId, isActive ? 1 : 0]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/department/:id', async (req, res) => {
    const { name, prefix, requestPrefix, isActive } = req.body;
    try {
        let sql = 'UPDATE departments SET '; const params = []; const updates = [];
        if (name !== undefined) { updates.push('name = ?'); params.push(name); }
        if (prefix !== undefined) { updates.push('prefix = ?'); params.push(prefix); }
        if (requestPrefix !== undefined) { updates.push('request_prefix = ?'); params.push(requestPrefix); }
        if (isActive !== undefined) { updates.push('is_active = ?'); params.push(isActive ? 1 : 0); }
        if (updates.length > 0) { sql += updates.join(', ') + ' WHERE id = ?'; params.push(req.params.id); await query(sql, params); }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/category', async (req, res) => {
    const { id, name, departmentId, isActive } = req.body;
    try { await query('INSERT INTO procurement_categories (id, name, department_id, is_active) VALUES (?,?,?,?)', [id, name, departmentId, isActive ? 1 : 0]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/category/:id', async (req, res) => {
    const { name, isActive } = req.body;
    try {
        let sql = 'UPDATE procurement_categories SET '; const params = []; const updates = [];
        if (name !== undefined) { updates.push('name = ?'); params.push(name); }
        if (isActive !== undefined) { updates.push('is_active = ?'); params.push(isActive ? 1 : 0); }
        if (updates.length > 0) { sql += updates.join(', ') + ' WHERE id = ?'; params.push(req.params.id); await query(sql, params); }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/category/:id', async (req, res) => {
    try { await query('UPDATE procurement_categories SET is_active = 0 WHERE id = ?', [req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
