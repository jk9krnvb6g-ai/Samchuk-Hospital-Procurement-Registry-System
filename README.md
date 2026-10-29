# 🏥 ระบบบริหารงานทะเบียนจัดซื้อจัดจ้าง โรงพยาบาลสามชุก
**Samchuk Hospital Procurement & Budget Management System (v2.5)**

ระบบสารสนเทศเพื่อการบริหารและติดตามงานพัสดุ การจัดซื้อจัดจ้าง การออกเลขที่เอกสาร และงบประมาณ สำหรับโรงพยาบาลสามชุก จังหวัดสุพรรณบุรี

---

## 📁 โครงสร้างโปรเจกต์ (Clean Architecture Structure)

ระบบได้รับการจัดระเบียบโครงสร้างแยก **Frontend** และ **Backend** ออกจากกันอย่างชัดเจน เป็นระเบียบและดูแลรักษาง่าย:

```text
├── 📂 Frontend/                      # 🌐 โฟลเดอร์หน้าบ้าน (FRONTEND)
│   ├── 📄 README.md                  # คำอธิบายส่วนประกอบหน้าบ้าน
│   └── 📂 src/                       # ซอร์สโค้ดหน้าบ้านทั้งหมด (React 18 + TS + Tailwind)
│       ├── 📂 components/            # ส่วนประกอบ UI (Sidebar, AutoLockModal, RecordHistoryModal)
│       ├── 📂 pages/                 # หน้าจอแสดงผลทั้ง 11 โมดูล
│       │   ├── ExecutiveDashboard.tsx# แดชบอร์ดผู้บริหาร (Q1-Q4, KPIs, Print Summary)
│       │   ├── Dashboard.tsx         # แดชบอร์ดเจ้าหน้าที่พัสดุและฝ่าย
│       │   ├── ProcurementTable.tsx  # ทะเบียนคุมการจัดซื้อจัดจ้าง (กำหนดขอบเขตงาน/ขอซื้อขอจ้าง)
│       │   ├── ConsiderationPage.tsx # ทะเบียนคุมรายงานผลการพิจารณา
│       │   ├── ReceivingPage.tsx     # ทะเบียนคุมการตรวจรับพัสดุ
│       │   ├── RecycleBinPage.tsx    # ถังขยะและระบบกู้คืนข้อมูล (Soft Delete Recovery)
│       │   ├── AuditLogPage.tsx      # ระบบบันทึกประวัติความปลอดภัย (Audit Logs)
│       │   ├── SettingsPage.tsx      # ตั้งค่ากลุ่มงาน, ฝ่าย, หมวดพัสดุ, สำรอง/กู้คืนข้อมูล
│       │   ├── UserManagementPage.tsx# จัดการผู้ใช้งานและสิทธิ์
│       │   ├── PendingUsersPage.tsx  # อนุมัติผู้ใช้ลงทะเบียนใหม่
│       │   └── LoginPage.tsx         # หน้าเข้าสู่ระบบ
│       ├── 📂 services/              # Business Logic & State Store (store.tsx)
│       ├── 📂 utils/                 # ฟังก์ชันช่วยเหลือและจัดฟอร์แมต
│       ├── App.tsx                   # Root Component & ระบบล็อกหน้าจออัตโนมัติ
│       ├── index.tsx                 # Entry Point ของ React
│       └── index.css                 # Tailwind CSS & Global Styles
│
├── 📂 Backend/                       # ⚙️ โฟลเดอร์หลังบ้าน (BACKEND)
│   ├── 📄 README.md                  # คำอธิบายส่วนประกอบหลังบ้าน
│   └── 📂 server/                    # ซอร์สโค้ดหลังบ้านทั้งหมด (Node.js Express + MySQL)
│       ├── 📂 routes/
│       │   └── procurement.js        # API Gateway, Auto-Migration, Master Running Sequence
│       ├── index.js                  # Express Server Entry Point (Port 3002)
│       ├── package.json              # Dependencies ของ Backend (express, mysql2, cors ฯลฯ)
│       └── seed.js                   # สคริปต์ Seed ข้อมูลตั้งต้น
│
├── 📄 database.sql                   # สำหรับติดตั้งฐานข้อมูลใหม่หมดตั้งแต่ต้น (Fresh Install)
├── 📄 upgrade_database.sql           # สำหรับอัปเกรดฐานข้อมูลเดิม "ไม่ลบและไม่กระทบข้อมูลเดิม 100%"
│
├── ⚙️ start-app.bat                  # ดับเบิลคลิกเดียวเปิดรันทั้งระบบแบบ Standalone
├── ⚙️ build-for-iis.bat              # คอมไพล์และอัปเดตระบบขึ้น IIS ของ รพ. อัตโนมัติ
├── ⚙️ start-iis-server.bat           # รัน Backend API Service สำหรับ IIS
├── ⚙️ seed-data.bat                  # สคริปต์นำเข้าข้อมูลทดสอบ
│
├── 📖 README.md                      # รายละเอียดภาพรวมระบบและวิธีติดตั้ง
└── 📋 UPGRADE_GUIDE.md               # รายละเอียดการปรับปรุงและวิธีอัปเดตเวอร์ชันเดิม
```

---

## 🌟 ฟังก์ชันเด่นของระบบ (Core Features)

1. **Executive Dashboard (แดชบอร์ดผู้บริหารระดับสูง)**
   - สรุปตัวเลข 4 มิติสำคัญ (งบรวม, ตรวจรับแล้ว, ภาระผูกพันคงค้าง, สัญญา $\ge$ 500,000 บ.)
   - กรองดูตามไตรมาสราชการได้ทันที (Q1 ต.ค.-ธ.ค., Q2 ม.ค.-มี.ค., Q3 เม.ย.-มิ.ย., Q4 ก.ค.-ก.ย.)
   - สัดส่วนวิธีจัดหาตามระเบียบ พ.ร.บ. จัดซื้อจัดจ้างฯ 2560
   - กราฟแนวโน้ม 12 เดือน, 5 หมวดพัสดุสูงสุด, 5 บริษัทคู่สัญญาที่สั่งซื้อมากที่สุด
   - ปุ่ม **"พิมพ์สรุป (Print Summary)"** จัดเลย์เอาต์ A4 สำหรับนำเข้าแฟ้มเสนอ ผอ. หรือที่ประชุม กวป.

2. **Master Running Number Engine (ระบบควบคุมเลขที่เอกสาร)**
   - ควบคุมการรันเลขที่ใบขอตามกลุ่มงาน/ฝ่าย (เช่น `สพ ๐๐๓๓.๐๖/๑/๒/...`) ป้องกันเลขซ้ำและเลขข้ามปีงบประมาณ
   - รองรับการออกเลขที่สั่งซื้อ/สั่งจ้าง (PO/HO) แยกตามปีงบประมาณ

3. **Enterprise Security & Audit Trail (ความปลอดภัยระดับ รพ.)**
   - **Auto-Lock Screen:** ล็อกหน้าจออัตโนมัติเมื่อไม่มีการใช้งาน 15 นาที ป้องกันผู้อื่นสวมรอย
   - **Soft Delete & Recycle Bin:** ลบแบบลงถังขยะ สามารถตรวจสอบและกู้คืนได้ ป้องกันข้อมูลสูญหาย
   - **Lock Record:** ล็อกรายการที่ดำเนินการเสร็จสิ้นแล้ว ห้ามแก้ไขย้อนหลัง
   - **Audit Logs:** บันทึกทุกกิจกรรม (ใคร แก้ไขอะไร เมื่อไหร่ ข้อมูลเดิมเป็นอย่างไร)

4. **Offline Resilience & Data Backup**
   - ใช้งานได้แม้อินเทอร์เน็ตหลุด (มีระบบ Local Cache ในตัว)
   - สำรองข้อมูลออกเป็นไฟล์ `.json` หรือสคริปต์ `.sql` ได้ในคลิกเดียว

---

## 🚀 วิธีเริ่มใช้งานระบบ

### การรันในโหมดพัฒนา (Development Mode)
```bash
# 1. ติดตั้ง Dependencies ฝั่ง Frontend
npm install

# 2. ติดตั้ง Dependencies ฝั่ง Backend
cd server && npm install && cd ..

# 3. รันทั้ง Frontend และ Backend
# Frontend รันที่ http://localhost:3000 หรือ 5173
# Backend API รันที่ http://localhost:3002
npm run dev
```
หรือบน Windows Server สามารถดับเบิลคลิกไฟล์ **`start-app.bat`** ได้ทันที

---

## 📖 คู่มือการอัปเกรดระบบเดิม
สำหรับเซิร์ฟเวอร์ที่ติดตั้งระบบนี้ไว้แล้ว โปรดอ่านขั้นตอนการอัปเกรดอย่างละเอียดในไฟล์ **`UPGRADE_GUIDE.md`**
