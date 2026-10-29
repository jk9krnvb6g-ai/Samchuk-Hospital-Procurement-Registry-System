
const mysql = require('mysql2/promise');

const DB_CONFIG = { 
    host: '10.1.0.201', 
    user: 'sa', 
    password: 'Sam#11294', 
    database: 'procurement_db', 
    port: 3306,
    charset: 'utf8mb4' 
};

// --- Helpers ---
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const getRandomDateInFiscalYear = (year) => {
    // FY68 = Oct 2024 - Sep 2025
    // FY69 = Oct 2025 - Sep 2026
    const adYear = year - 543;
    const start = new Date(`${adYear - 1}-10-01`);
    const end = new Date(`${adYear}-09-30`);
    const timeDiff = end.getTime() - start.getTime();
    const randomTime = Math.random() * timeDiff;
    const d = new Date(start.getTime() + randomTime);
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
};

// Helper to split array into chunks for batch insert
const chunkArray = (myArray, chunk_size) => {
    let index = 0;
    const arrayLength = myArray.length;
    const tempArray = [];
    for (index = 0; index < arrayLength; index += chunk_size) {
        let myChunk = myArray.slice(index, index + chunk_size);
        tempArray.push(myChunk);
    }
    return tempArray;
};

const run = async () => {
    let connection;
    try {
        console.log('🔌 Connecting to database...');
        connection = await mysql.createConnection(DB_CONFIG);
        await connection.query('SET NAMES utf8mb4');
        console.log('✅ Connected.');

        // 1. Clean Data
        console.log('🧹 Cleaning old data...');
        await connection.execute('DELETE FROM receivings');
        await connection.execute('DELETE FROM considerations');
        await connection.execute('DELETE FROM procurements');
        await connection.execute('DELETE FROM users');
        await connection.execute('DELETE FROM procurement_categories');
        await connection.execute('DELETE FROM departments');
        await connection.execute('DELETE FROM work_groups');

        // 2. Generate Work Groups (100 unique)
        console.log('🏢 Generating 100 Work Groups...');
        const wgData = [];
        const wgIds = [];
        for(let i=1; i<=100; i++) {
            const id = `g${i}`;
            wgIds.push(id);
            wgData.push([id, `กลุ่มงานที่ ${i} (Work Group ${i})`, true]);
        }
        await connection.query('INSERT INTO work_groups (id, name, is_active) VALUES ?', [wgData]);

        // 3. Generate Departments (5,000 unique) -> Linked to WGs
        console.log('🏥 Generating 5,000 Departments...');
        const deptData = [];
        const deptIds = [];
        for(let i=1; i<=5000; i++) {
            const id = `d${i}`;
            deptIds.push(id);
            // Link to random WG
            const wgId = wgIds[getRandomInt(0, wgIds.length - 1)];
            // Create realistic prefix
            const prefix = `D${(i % 900) + 100}.`;
            const reqPrefix = `สพ.๐๐๓3.${(i % 99) + 1}/`;

            deptData.push([
                id, 
                `ฝ่าย/งานที่ ${i} (Dept ${i})`, 
                prefix, 
                reqPrefix, 
                wgId, 
                true
            ]);
        }
        const deptChunks = chunkArray(deptData, 1000);
        for(const chunk of deptChunks) {
            await connection.query('INSERT INTO departments (id, name, prefix, request_prefix, work_group_id, is_active) VALUES ?', [chunk]);
        }

        // 4. Generate Categories (5,000 unique) -> Linked to Depts
        console.log('📦 Generating 5,000 Categories...');
        const catData = [];
        const catNames = []; 
        for(let i=1; i<=5000; i++) {
            const id = `c${i}`;
            const name = `หมวดพัสดุ ${i} (Category ${i})`;
            catNames.push(name);
            const deptId = deptIds[getRandomInt(0, deptIds.length - 1)];
            catData.push([id, name, deptId, true]);
        }
        const catChunks = chunkArray(catData, 1000);
        for(const chunk of catChunks) {
            await connection.query('INSERT INTO procurement_categories (id, name, department_id, is_active) VALUES ?', [chunk]);
        }

        // 5. Generate Users (1,000 unique) -> Linked to Depts
        console.log('👥 Generating 1,000 Users...');
        const userData = [];
        const userIds = [];
        
        // Add Admin
        userData.push(['admin', 'admin', 'password', 'System Admin', 'admin@host.com', 'ADMIN', deptIds[0], 'ACTIVE', Date.now()]);
        userIds.push('admin');

        for(let i=1; i<=1000; i++) {
            const id = `u${i}`;
            userIds.push(id);
            const deptId = deptIds[getRandomInt(0, deptIds.length - 1)];
            userData.push([
                id, 
                `user${i}`, 
                'password', 
                `User ${i} Test`, 
                `user${i}@example.com`, 
                'USER', 
                deptId, 
                'ACTIVE', 
                Date.now()
            ]);
        }
        const userChunks = chunkArray(userData, 500);
        for(const chunk of userChunks) {
            await connection.query('INSERT INTO users (id, username, password, name, email, role, department_id, status, created_at) VALUES ?', [chunk]);
        }

        // Helper to generate Procurements
        let allGeneratedRequestIds = [];

        const generateProcurementBatch = (type, count, startIdIndex) => {
            const data = [];
            for(let i=0; i<count; i++) {
                const globalIndex = startIdIndex + i;
                const id = `p_${type}_${globalIndex}`;
                
                const fy = Math.random() > 0.5 ? 2568 : 2569;
                const reqDate = getRandomDateInFiscalYear(fy);
                const reqId = `REQ-${type}-${globalIndex}/${fy}`;
                
                allGeneratedRequestIds.push({ reqId, reqDate }); 

                const userId = userIds[getRandomInt(0, userIds.length - 1)];
                const deptId = deptIds[getRandomInt(0, deptIds.length - 1)]; 
                const amount = getRandomInt(1000, 500000);
                const category = catNames[getRandomInt(0, catNames.length - 1)];
                const offNum = amount > 5000 ? `${getRandomInt(1, 9999)}/${fy}` : null;

                data.push([
                    id, reqId, reqDate, category, getRandomInt(1, 20), amount,
                    `บริษัท ทดสอบ ${globalIndex} จำกัด`, `หมายเหตุรายการที่ ${globalIndex}`,
                    offNum, type, deptId, userId, Date.now()
                ]);
            }
            return data;
        };

        // 6. Generate 30,000 Procurements
        console.log('🛒 Generating 30,000 Procurements (Purchase/Hiring/Other)...');
        const purchaseData = generateProcurementBatch('PURCHASE', 10000, 1);
        const hiringData = generateProcurementBatch('HIRING', 10000, 1);
        const otherData = generateProcurementBatch('OTHER', 10000, 1);

        const allProcurements = [...purchaseData, ...hiringData, ...otherData];
        const procChunks = chunkArray(allProcurements, 2000);
        
        for(const chunk of procChunks) {
            await connection.query('INSERT INTO procurements (id, request_id, request_date, category, item_count, amount, company, remarks, official_number, type, department_id, created_by, created_at) VALUES ?', [chunk]);
            process.stdout.write('.');
        }
        console.log(' Done.');

        // 7. Generate 5,000 Considerations
        console.log('📝 Generating 5,000 Considerations...');
        // Shuffle request IDs to pick random ones
        const shuffledReqs = [...allGeneratedRequestIds].sort(() => 0.5 - Math.random());
        const selectedReqs = shuffledReqs.slice(0, 5000);

        const considerationData = [];
        for(let i=0; i<selectedReqs.length; i++) {
            const req = selectedReqs[i];
            const id = `cons_${i+1}`;
            const consNum = `CONS-${i+1}/${req.reqId.split('/')[1]}`;
            
            const rDate = new Date(req.reqDate);
            rDate.setDate(rDate.getDate() + getRandomInt(1, 7)); 
            const consDate = rDate.toISOString().split('T')[0];

            considerationData.push([id, req.reqId, consNum, consDate]);
        }
        const consChunks = chunkArray(considerationData, 1000);
        for(const chunk of consChunks) {
            await connection.query('INSERT INTO considerations (id, request_id, consideration_number, consideration_date) VALUES ?', [chunk]);
        }
        console.log(' Done.');

        // 8. Generate 5,000 Receivings (NEW)
        console.log('🚚 Generating 5,000 Receivings (Linked to Procurements)...');
        // Reshuffle to pick a different or overlapping set
        const shuffledForRecv = [...allGeneratedRequestIds].sort(() => 0.5 - Math.random());
        const selectedForRecv = shuffledForRecv.slice(0, 5000);
        
        const receivingData = [];
        for(let i=0; i<selectedForRecv.length; i++) {
            const req = selectedForRecv[i];
            const id = `recv_${i+1}`;
            const deliveryNo = `IV-${getRandomInt(1000, 9999)}/6${getRandomInt(8,9)}`; // Random Invoice

            // Receive date = Request Date + 7 to 30 days
            const rDate = new Date(req.reqDate);
            rDate.setDate(rDate.getDate() + getRandomInt(7, 30));
            const receiveDate = rDate.toISOString().split('T')[0];
            
            // Random category for the mock data
            const randomCat = catNames[getRandomInt(0, catNames.length - 1)];

            receivingData.push([
                id,
                req.reqId,
                deliveryNo,
                receiveDate,
                randomCat,
                Date.now()
            ]);
        }

        const recvChunks = chunkArray(receivingData, 1000);
        for(const chunk of recvChunks) {
            await connection.query('INSERT INTO receivings (id, request_id, delivery_note_no, receive_date, category, created_at) VALUES ?', [chunk]);
        }
        console.log(' Done.');

        console.log('\n✨ Database Seeded Successfully!');
        console.log('------------------------------------------------');
        console.log('Summary:');
        console.log('- 100 Work Groups');
        console.log('- 5,000 Departments');
        console.log('- 5,000 Categories');
        console.log('- 1,000 Users');
        console.log('- 30,000 Procurement Records');
        console.log('- 5,000 Considerations');
        console.log('- 5,000 Receivings [UPDATED]');
        console.log('------------------------------------------------');

    } catch (err) {
        console.error('\n❌ Error seeding database:', err);
    } finally {
        if (connection) await connection.end();
    }
};

run();
