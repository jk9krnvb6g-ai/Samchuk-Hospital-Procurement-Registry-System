# 🌐 FRONTEND (ระบบฝั่งหน้าบ้าน React)

โฟลเดอร์นี้รวบรวมโค้ดและส่วนประกอบหน้าบ้านทั้งหมด:
- `src/`: โฟลเดอร์ซอร์สโค้ดหน้าบ้าน
  - `pages/`: หน้าจอทั้ง 11 โมดูล (ExecutiveDashboard, ProcurementTable, ConsiderationPage, ReceivingPage, RecycleBinPage, AuditLogPage, SettingsPage, UserManagementPage ฯลฯ)
  - `components/`: ชิ้นส่วน UI (Sidebar, AutoLockModal, RecordHistoryModal)
  - `services/store.tsx`: จัดการ State และเชื่อมต่อ API
  - `utils/`: ฟังก์ชันช่วยเหลือและจัดรูปแบบข้อมูล
  - `App.tsx`: คอมโพเนนต์หลักของระบบ
  - `index.tsx`: จุดเริ่มต้นของ React
  - `index.css`: สไตล์หลัก Tailwind CSS
