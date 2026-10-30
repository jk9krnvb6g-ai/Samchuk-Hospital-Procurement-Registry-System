# 🏥 ระบบบริหารงานทะเบียนจัดซื้อจัดจ้าง โรงพยาบาลสามชุก
**Samchuk Hospital Procurement & Budget Management System (v2.6 Central Gateway Ready)**

ระบบสารสนเทศเพื่อการบริหารและติดตามงานพัสดุ การจัดซื้อจัดจ้าง การออกเลขที่เอกสาร และงบประมาณ สำหรับโรงพยาบาลสามชุก จังหวัดสุพรรณบุรี

---

## 🏛️ สถาปัตยกรรมระบบ (System Architecture)

ระบบถูกออกแบบให้ทำงานร่วมกับ **Samchuk Hospital Central API Gateway** บน Windows Server โดยใช้พอร์ตเครือข่ายอย่างเคร่งครัดเพียง 2 พอร์ต:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        WINDOWS SERVER (10.2.0.13)                      │
│                                                                        │
│   🌐 FRONTEND (IIS Web Server)                                         │
│   HTTPS Port: 3001                                                     │
│   URL: https://10.2.0.13:3001/Procurement/                             │
│   Static Files: C:\inetpub\wwwroot\Procurement\dist                    │
│                                                                        │
│   ─────────────────────────────────────────────────────────────────    │
│                                                                        │
│   ⚙️ BACKEND API (Samchuk Hospital Central API Gateway)                │
│   HTTPS Port: 3002 (Single Network Listener)                           │
│   Base URL: https://10.2.0.13:3002/api/Procurement/                    │
│   Gateway Path: C:\inetpub\wwwroot\Samchuk-Hospital-Central-API-Gateway│
│   Procurement Module: C:\inetpub\wwwroot\Procurement\server            │
│                                                                        │
│   ─────────────────────────────────────────────────────────────────    │
│                                                                        │
│   🗄️ DATABASE (MySQL 8 / MariaDB)                                      │
│   IP: 10.1.0.201:3306                                                  │
│   Database: procurement_db                                             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 โครงสร้างโปรเจกต์ (Clean Repository Structure)

```text
├── 📂 server/                         # ⚙️ ซอร์สโค้ด Backend API (Express Router)
│   ├── 📂 routes/
│   │   └── procurement.js             # API Router, Security Middlewares, Sequence Logic
│   ├── 📂 migrations/
│   │   └── 001_safe_schema_update.sql # สคริปต์ SQL Migration สำหรับ DBA ตรวจสอบ
│   ├── index.js                       # Universal Export & Standalone Listener Guard
│   ├── package.json                   # Backend Dependencies (express, mysql2, cors ฯลฯ)
│   ├── test-comprehensive.js          # ชุดทดสอบ 12-Point Automated In-Process Tests
│   └── test-gateway-compatibility.js  # ชุดทดสอบ Gateway Compatibility
│
├── 📂 src/                            # 🌐 ซอร์สโค้ด Frontend (React 18 + TS + Tailwind)
│   ├── 📂 components/                 # UI Components (Sidebar, Modals, Navbar)
│   ├── 📂 pages/                      # Dashboard, ProcurementTable, Receiving, Users ฯลฯ
│   ├── 📂 services/
│   │   └── store.tsx                  # Central Store & Dynamic Gateway Base URL Configuration
│   ├── App.tsx
│   ├── index.tsx
│   └── index.css
│
├── 📂 public/
│   └── web.config                     # IIS URL Rewrite Rules (SPA fallback + Reverse Proxy)
│
├── 📄 .env.example                    # ตัวอย่างการตั้งค่า Environment Variables
├── 📄 .gitignore                      # กรอง node_modules, dist, .env และไฟล์สำรอง
├── 📄 package.json                    # Root package config สำหรับ Frontend Vite
├── 📄 vite.config.ts                  # Vite config (Conditional Base Path)
├── ⚙️ build-for-iis.bat               # สคริปต์คอมไพล์ Frontend อัตโนมัติสำหรับ IIS
└── 📖 README.md                       # คู่มือการติดตั้งและบริหารระบบ
```

---

## 🔒 การปรับปรุงด้านความปลอดภัย (Application Security)

1. **ไม่ส่งออกรหัสผ่านใน API Response เด็ดขาด:**
   - `POST /login`: ส่งคืนเฉพาะ Profile (`id`, `name`, `role`, `departmentId`, `status`) และ Token
   - `GET /users`: ใช้คำสั่ง `SELECT id, username, name, email, role, department_id, status FROM users` ไม่ดึงคอลัมน์ `password` ออกมา
   - `GET /data`: รายชื่อผู้ใช้งานใน payload ตัดคอลัมน์รหัสผ่านออก 100%
2. **การป้องกัน Privilege Escalation และ SQL Injection:**
   - `PATCH /users/:id` ใช้ **Strict Field Allowlist** (`name`, `email`, `status`, `department_id`, `role`)
   - เฉพาะผู้ใช้ที่มีสิทธิ์ `ADMIN` เท่านั้นที่สามารถเปลี่ยนบทบาท (`role`) หรือแก้ไขข้อมูลผู้ใช้อื่นได้
   - คำสั่ง SQL ทุกคำสั่งใช้ Parameterized Query (`?`) ทั้งหมด ป้องกัน SQL Injection 100%
3. **Session Token (HMAC-SHA256):**
   - เมื่อล็อกอินสำเร็จ Backend จะออก Token ที่ลงลายมือชื่อดิจิทัลด้วย Secret Key ใน `.env`
   - ฝั่ง Frontend ส่ง Token ผ่าน Header `Authorization: Bearer <token>`
4. **การซ่อน Database Error และ Stack Trace:**
   - ฝั่งไคลเอนต์จะได้รับเฉพาะข้อความภาษาไทยทั่วไปเมื่อเกิดข้อผิดพลาด โดยรายละเอียดข้อผิดพลาดจะถูกบันทึกเฉพาะที่ Server Log ภายใน

---

## 🔑 แผนการเปลี่ยนผ่านรหัสผ่านอย่างปลอดภัย (Progressive Hashing Roadmap)

เพื่อไม่ให้กระทบผู้ใช้งานเดิมในระบบจริงของโรงพยาบาล:
* **ระยะปัจจุบัน (Backward Compatible):**
  - ระบบรองรับทั้งรหัสผ่านแบบเดิม และรหัสผ่านที่ถูก Hash ด้วย bcrypt/argon2
  - การตรวจสอบใช้ Constant-time comparison ป้องกัน Timing Attacks
* **ระยะเปลี่ยนผ่าน (Progressive Upgrade):**
  - เมื่อผู้ใช้ล็อกอินสำเร็จด้วยรหัสผ่านเดิม ระบบสามารถ Hash รหัสผ่านใหม่และอัปเดตลงฐานข้อมูลเบื้องหลังได้ทันที โดยควบคุมผ่าน Environment Variable: `ENABLE_PROGRESSIVE_PASSWORD_HASHING=true`
  - ไม่มีการสั่ง Reset รหัสผ่านของผู้ใช้ทุกคนพร้อมกัน และไม่ต้องสั่ง ALTER ตารางในคราวเดียว

---

## 🚀 การเชื่อมต่อกับ Central API Gateway

Central API Gateway โหลดโมดูล Procurement เข้าไปเป็น Express Router ภายใต้ Prefix `/api/Procurement`:

```javascript
// ในไฟล์ Router Registry ของ Central API Gateway (C:\inetpub\wwwroot\Samchuk-Hospital-Central-API-Gateway\Central-API)
const procurementModule = require('../../Procurement/server');

// Mount Express Router (รองรับทั้ง /api/Procurement และ /api/procurement)
gatewayApp.use(['/api/Procurement', '/api/procurement'], procurementModule);
```

### การตั้งค่า Environment Variables (`.env`):
```env
PROCUREMENT_DB_HOST=10.1.0.201
PROCUREMENT_DB_PORT=3306
PROCUREMENT_DB_USER=sa
PROCUREMENT_DB_PASSWORD=YOUR_PASSWORD
PROCUREMENT_DB_NAME=procurement_db

GATEWAY_MODE=true
AUTO_MIGRATE=false
PROCUREMENT_JWT_SECRET=YOUR_SECURE_RANDOM_SECRET
```

---

## 🧪 การทดสอบระบบ (Automated Tests)

รันชุดทดสอบความเข้ากันได้และความปลอดภัยแบบ In-Process (ไม่แตะต้องฐานข้อมูลจริง และไม่เปิดพอร์ต TCP):

```bash
cd server
npm test
```

ผลการทดสอบผ่านครบ 12/12 หัวข้อ:
- ✅ Module Loading via `require()`
- ✅ Zero Port Leak in Gateway Mode
- ✅ Zero Auto-Migration on Import
- ✅ Dual Prefix Mount Compatibility
- ✅ GET /data Structure Contract
- ✅ Login & Token Issuance Logic
- ✅ Zero Password Leak
- ✅ Token Tamper Resistance
- ✅ Role Authorization Guards
- ✅ CRUD Operations
- ✅ SQL Injection & Allowlist Guard
- ✅ In-Process Safety Guarantee

---

## 📦 ขั้นตอนการ Deploy & Rollback บน Windows Server

### ขั้นตอน Deploy:
1. **สำรองไฟล์เดิม (Backup):**
   ```cmd
   cd C:\inetpub\wwwroot\Procurement\server
   copy index.js index.js.bak
   copy routes\procurement.js routes\procurement.js.bak
   ```
2. **คัดลอกไฟล์ที่อัปเดต:**
   - นำ `server/index.js` และ `server/routes/procurement.js` ไปวางทับ
3. **ตรวจสอบด้วยชุดทดสอบ:**
   ```cmd
   npm test
   ```
4. **Build Frontend สำหรับ IIS:**
   ```cmd
   npm run build
   ```
   นำไฟล์ในโฟลเดอร์ `dist/` ไปวางที่ `C:\inetpub\wwwroot\Procurement\dist\`

### ขั้นตอน Rollback (ย้อนกลับทันทีภายใน 5 วินาที):
หากพบปัญหา สามารถย้อนกลับได้ทันทีโดยไม่ต้องแก้ไขฐานข้อมูล:
```cmd
cd C:\inetpub\wwwroot\Procurement\server
copy /y index.js.bak index.js
copy /y routes\procurement.js.bak routes\procurement.js
```
