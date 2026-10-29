# 📋 คู่มือการอัปเกรดระบบและบันทึกการปรับปรุง (Upgrade Guide & Changelog)
**ระบบจัดซื้อจัดจ้าง โรงพยาบาลสามชุก (v2.5)**

เอกสารฉบับนี้จัดทำขึ้นสำหรับผู้ดูแลระบบ (IT Administrator / Database Admin) ของโรงพยาบาลสามชุก เพื่อใช้ในการอัปเกรดระบบจากเวอร์ชันเดิมขึ้นสู่เวอร์ชันใหม่ล่าสุด **โดยรับประกันว่าข้อมูลเดิมที่บันทึกไว้จะไม่สูญหายและไม่ได้รับผลกระทบใดๆ 100%**

---

## 📌 สรุปรายการปรับปรุงในเวอร์ชันนี้ (Changelog)

### 1. 🌟 ยกระดับ Executive Dashboard (แดชบอร์ดผู้บริหาร)
* **ตัวกรองไตรมาส (Quarterly View):** เพิ่มปุ่มสลับดูภาพรวมทั้งปี หรือเจาะดูเฉพาะไตรมาส **Q1 (ต.ค.-ธ.ค.), Q2 (ม.ค.-มี.ค.), Q3 (เม.ย.-มิ.ย.), Q4 (ก.ค.-ก.ย.)** สะดวกต่อการรายงานความก้าวหน้าต่อ สสจ. และกระทรวง
* **4 การ์ดตัวเลขสรุป (Executive Hero KPIs):**
  1. ยอดงบประมาณรวม พร้อมสัดส่วน **PO จัดซื้อ** vs **HO จัดจ้าง**
  2. ยอดที่ตรวจรับเสร็จสิ้นแล้ว พร้อม % ความสำเร็จของแผนงบประมาณ (Execution Rate)
  3. ภาระผูกพัน / ยอดรอตรวจรับ เพื่อเร่งรัดการเบิกจ่ายก่อนสิ้นปีงบ
  4. รายการสัญญาขนาดใหญ่ $\ge$ 500,000 บาท
* **สัดส่วนวิธีจัดหาตามระเบียบ พ.ร.บ. จัดซื้อจัดจ้างฯ 2560:**
  * ไม่เกิน 5,000 บาท (ซื้อตรง)
  * 5,001 - 500,000 บาท (ใบสั่ง PO/HO)
  * เกิน 500,000 บาท (e-Bidding / ประกวดราคา)
* **การแสดงผลเชิงวิเคราะห์:**
  * กราฟแนวโน้มงบประมาณ 12 เดือน (Monthly Spending Trend)
  * 5 หมวดพัสดุที่ใช้จ่ายสูงสุด (Top Spending Categories)
  * 5 บริษัทคู่สัญญาที่โรงพยาบาลสั่งซื้อสูงสุด (Top Vendors)
* **ปุ่มพิมพ์สรุปผู้บริหาร (One-Page Executive Print):** จัดหน้ากระดาษ A4 สะอาด เรียบร้อย พร้อมเสนอผู้บริหารหรือที่ประชุม กวป. ทันที

### 2. 🛡️ ระบบความปลอดภัยและการกู้คืนข้อมูล (Enterprise Security)
* **ระบบถังขยะและกู้คืนข้อมูล (Soft Delete & Recycle Bin):** การลบรายการจะถูกย้ายไปเก็บที่ถังขยะก่อน สามารถตรวจสอบผู้ลบและกู้คืนกลับมาได้ ป้องกันการเผลอลบข้อมูลผิดพลาด
* **ระบบล็อกรายการ (Record Lock):** รายการที่ตรวจรับหรือปิดงวดแล้ว สามารถล็อกเพื่อป้องกันการแก้ไขย้อนหลังได้
* **ระบบประวัติการทำงาน (Audit Trail / Logs):** บันทึกการเพิ่ม, แก้ไข, ลบ พร้อมบันทึกค่าเดิมและค่าใหม่ที่เปลี่ยนแปลง

### 3. 📂 การจัดระเบียบโครงสร้างโฟลเดอร์ (Clean Folder Separation)
* ลบไฟล์และโฟลเดอร์ซ้ำซ้อนใน Root ออกทั้งหมด
* จัดแบ่งชัดเจน:
  * `src/` : ส่วนของ Frontend (React + TypeScript + Tailwind)
  * `server/` : ส่วนของ Backend API Gateway (Node.js Express + MySQL)
  * สคริปต์ Database และสคริปต์รันระบบแยกไว้เป็นระเบียบ

---

## 🛠️ ขั้นตอนการอัปเกรดระบบที่ติดตั้งใช้งานอยู่แล้ว

### ขั้นตอนที่ 1: อัปเกรดฐานข้อมูล MySQL (Zero Data Loss)
> ⚠️ **คำเตือน:** **ห้าม** นำไฟล์ `database.sql` ไปรันเด็ดขาด เพราะมีคำสั่ง `DROP DATABASE` จะทำให้ข้อมูลเดิมหาย!

ให้ใช้ไฟล์ **`upgrade_database.sql`** แทน หรือคัดลอกคำสั่งด้านล่างนี้ไปรันใน **Navicat / phpMyAdmin / DBeaver**:

```sql
USE procurement_db;

-- ตั้งค่าภาษาไทย UTF8MB4
SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci';

-- สร้างฟังก์ชันตรวจสอบก่อนเพิ่ม เพื่อไม่ให้เกิด Error หากมีคอลัมน์แล้ว
DELIMITER $$
DROP PROCEDURE IF EXISTS AddColumnSafely$$
CREATE PROCEDURE AddColumnSafely(
    IN tableName VARCHAR(64),
    IN columnName VARCHAR(64),
    IN columnDefinition TEXT
)
BEGIN
    DECLARE colExists INT DEFAULT 0;
    SELECT COUNT(*) INTO colExists
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tableName AND COLUMN_NAME = columnName;
      
    IF colExists = 0 THEN
        SET @sqlStatement = CONCAT('ALTER TABLE `', tableName, '` ADD COLUMN `', columnName, '` ', columnDefinition, ';');
        PREPARE stmt FROM @sqlStatement;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$
DELIMITER ;

-- 1. เพิ่มคอลัมน์ในตาราง procurements (ระบบถังขยะ & ระบบล็อก)
CALL AddColumnSafely('procurements', 'is_deleted', 'BOOLEAN DEFAULT FALSE');
CALL AddColumnSafely('procurements', 'deleted_at', 'BIGINT NULL');
CALL AddColumnSafely('procurements', 'deleted_by', 'VARCHAR(100) NULL');
CALL AddColumnSafely('procurements', 'is_locked', 'BOOLEAN DEFAULT FALSE');
CALL AddColumnSafely('procurements', 'locked_at', 'BIGINT NULL');
CALL AddColumnSafely('procurements', 'locked_by', 'VARCHAR(100) NULL');

-- 2. เพิ่มคอลัมน์ในตาราง receivings และ considerations
CALL AddColumnSafely('receivings', 'procurement_id', 'VARCHAR(50) NULL');
CALL AddColumnSafely('considerations', 'procurement_id', 'VARCHAR(50) NULL');

-- 3. เพิ่มคอลัมน์ในตารางกลุ่มงานและฝ่าย
CALL AddColumnSafely('work_groups', 'prefix', 'VARCHAR(20) NULL');
CALL AddColumnSafely('departments', 'request_prefix', 'VARCHAR(100) NULL');
CALL AddColumnSafely('departments', 'work_group_id', 'VARCHAR(50) NULL');

DROP PROCEDURE IF EXISTS AddColumnSafely;

-- 4. สร้างตาราง audit_logs บันทึกประวัติ
CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id` VARCHAR(50) PRIMARY KEY,
    `timestamp` BIGINT NOT NULL,
    `user_id` VARCHAR(50),
    `user_name` VARCHAR(100),
    `action` VARCHAR(50),
    `record_id` VARCHAR(50),
    `request_id` VARCHAR(50),
    `details` TEXT,
    `changes` JSON
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. ปรับปรุง Charset ให้รองรับภาษาไทยทุกตาราง
ALTER TABLE procurements CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE receivings CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE considerations CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE departments CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE work_groups CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

### ขั้นตอนที่ 2: วางไฟล์โค้ดชุดใหม่บนเซิร์ฟเวอร์
1. คัดลอกโฟลเดอร์ **`Frontend/`** (หน้าบ้าน), **`Backend/`** (หลังบ้าน), และไฟล์ **`package.json`**, **`index.html`** ไปวางทับไฟล์เดิมที่เซิร์ฟเวอร์ (เช่น `C:\inetpub\wwwroot\Procurement` หรือโฟลเดอร์ของระบบ)

---

### ขั้นตอนที่ 3: คอมไพล์และอัปเดตระบบด้วย `build-for-iis.bat`
1. ที่เครื่อง Server คลิกขวาที่ไฟล์ **`build-for-iis.bat`**
2. เลือก **"Run as administrator"**
3. ระบบจะหยุด IIS ชั่วคราว ทำการ `npm install` และ `npm run build` จากนั้นรีสตาร์ท IIS ให้โดยอัตโนมัติ

---

### ขั้นตอนที่ 4: รีสตาร์ท Backend API
1. ปิดหน้าต่าง Command Prompt ของ Backend ตัวเดิม
2. ดับเบิลคลิกไฟล์ **`start-iis-server.bat`** เพื่อเริ่มการทำงาน Backend API ใหม่
3. ทดสอบเปิดระบบผ่านเว็บเบราว์เซอร์ และกด `Ctrl + F5` เพื่อเคลียร์แคช จะพบว่าระบบพร้อมใช้งานทันทีครับ!
