# 🌐 โฟลเดอร์ FRONTEND (ส่วนหน้าบ้าน React)

โฟลเดอร์นี้คือ **Frontend ทั้งหมดของระบบจัดซื้อจัดจ้าง** ที่ผู้ใช้งานมองเห็นบนหน้าเว็บ (พัฒนาด้วย React 18 + TypeScript + Tailwind CSS)

### 📁 ไฟล์และโฟลเดอร์ภายใน:
1. **`pages/`** : หน้าจอการทำงานหลักทั้ง 11 โมดูล
   - `ExecutiveDashboard.tsx` : แดชบอร์ดผู้บริหาร (กรองไตรมาส Q1-Q4, สรุปงบ, พิมพ์ A4)
   - `Dashboard.tsx` : แดชบอร์ดเจ้าหน้าที่
   - `ProcurementTable.tsx` : ทะเบียนคุมการจัดซื้อจัดจ้าง (กำหนดขอบเขตงาน / ขอซื้อขอจ้าง)
   - `ConsiderationPage.tsx` : ทะเบียนคุมรายงานผลการพิจารณา
   - `ReceivingPage.tsx` : ทะเบียนคุมการตรวจรับพัสดุ
   - `RecycleBinPage.tsx` : ถังขยะและระบบกู้คืนข้อมูล (Soft Delete Recovery)
   - `AuditLogPage.tsx` : บันทึกประวัติความปลอดภัยและการแก้ไขข้อมูล (Audit Trail)
   - `SettingsPage.tsx` : ตั้งค่ากลุ่มงาน, ฝ่าย, หมวดพัสดุ, และสำรองข้อมูล
   - `UserManagementPage.tsx` : จัดการผู้ใช้งานและสิทธิ์
   - `PendingUsersPage.tsx` : อนุมัติผู้ใช้ลงทะเบียนใหม่
   - `LoginPage.tsx` : หน้าเข้าสู่ระบบ
2. **`components/`** : ชิ้นส่วน UI
   - `Sidebar.tsx` : แถบเมนูด้านซ้าย
   - `AutoLockModal.tsx` : ล็อกหน้าจออัตโนมัติเมื่อไม่มีการใช้งาน 15 นาที
   - `RecordHistoryModal.tsx` : ประวัติการแก้ไขข้อมูลรายโครงการ
3. **`services/store.tsx`** : ตัวกลางจัดการข้อมูล (State Management) และเชื่อมต่อ API
4. **`App.tsx`** : ส่วนประกอบหลักของแอปพลิเคชัน
5. **`index.tsx`** : จุดเริ่มต้นของ React App
6. **`index.css`** : สไตล์หลักของระบบ (Tailwind CSS)
