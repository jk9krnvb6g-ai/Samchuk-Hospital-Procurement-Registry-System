-- =====================================================================
-- 🏥 โรงพยาบาลสามชุก - สคริปต์อัปเกรดฐานข้อมูล (UPGRADE DATABASE SCRIPT)
-- =====================================================================
-- วัตถุประสงค์: เพิ่มคอลัมน์ใหม่และปรับปรุงตาราง โดย "ไม่ลบ" และ "ไม่กระทบ" ข้อมูลเดิม 100%
-- รองรับ: MySQL 5.7, MySQL 8.0+, MariaDB ทุกเวอร์ชัน
-- คำแนะนำ: สามารถก๊อปปี้คำสั่งทั้งหมดนี้ไปวางใน Navicat / phpMyAdmin แล้วกด Run ได้ทันที
-- =====================================================================

USE procurement_db;

-- ตั้งค่าภาษาไทย UTF8MB4 เพื่อความปลอดภัยของข้อมูล
SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci';

-- =====================================================================
-- 1. สร้าง Stored Procedure สำหรับเพิ่มคอลัมน์อย่างปลอดภัย (ไม่ Error หากมีคอลัมน์อยู่แล้ว)
-- =====================================================================
DELIMITER $$

DROP PROCEDURE IF EXISTS AddColumnSafely$$
CREATE PROCEDURE AddColumnSafely(
    IN tableName VARCHAR(64),
    IN columnName VARCHAR(64),
    IN columnDefinition TEXT
)
BEGIN
    DECLARE colExists INT DEFAULT 0;
    
    -- ตรวจสอบว่าคอลัมน์มีอยู่แล้วหรือไม่ในฐานข้อมูลปัจจุบัน
    SELECT COUNT(*) INTO colExists
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tableName
      AND COLUMN_NAME = columnName;
      
    -- หากยังไม่มีคอลัมน์ ให้เพิ่มเข้าไป
    IF colExists = 0 THEN
        SET @sqlStatement = CONCAT('ALTER TABLE `', tableName, '` ADD COLUMN `', columnName, '` ', columnDefinition, ';');
        PREPARE stmt FROM @sqlStatement;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        SELECT CONCAT('✅ เพิ่มคอลัมน์ ', tableName, '.', columnName, ' สำเร็จ') AS Status;
    ELSE
        SELECT CONCAT('ℹ️ คอลัมน์ ', tableName, '.', columnName, ' มีอยู่แล้ว (ข้ามการเพิ่ม)') AS Status;
    END IF;
END$$

DELIMITER ;

-- =====================================================================
-- 2. เพิ่มคอลัมน์ใหม่ในตาราง procurements (ระบบจัดซื้อ/จัดจ้าง)
-- =====================================================================
-- รองรับฟีเจอร์ ถังขยะกู้คืน (Soft Delete) และ การล็อกแก้ไข (Lock Record)
CALL AddColumnSafely('procurements', 'is_deleted', 'BOOLEAN DEFAULT FALSE');
CALL AddColumnSafely('procurements', 'deleted_at', 'BIGINT NULL');
CALL AddColumnSafely('procurements', 'deleted_by', 'VARCHAR(100) NULL');
CALL AddColumnSafely('procurements', 'is_locked', 'BOOLEAN DEFAULT FALSE');
CALL AddColumnSafely('procurements', 'locked_at', 'BIGINT NULL');
CALL AddColumnSafely('procurements', 'locked_by', 'VARCHAR(100) NULL');

-- =====================================================================
-- 3. เพิ่มคอลัมน์ในตาราง receivings (ระบบตรวจรับพัสดุ)
-- =====================================================================
-- รองรับการเชื่อมโยงกับรายการจัดซื้อจัดจ้างโดยตรง
CALL AddColumnSafely('receivings', 'procurement_id', 'VARCHAR(50) NULL');

-- =====================================================================
-- 4. เพิ่มคอลัมน์ในตาราง considerations (รายงานผลการพิจารณา)
-- =====================================================================
-- รองรับการเชื่อมโยงกับรายการจัดซื้อจัดจ้างโดยตรง
CALL AddColumnSafely('considerations', 'procurement_id', 'VARCHAR(50) NULL');

-- =====================================================================
-- 5. เพิ่มคอลัมน์ในตาราง work_groups (กลุ่มงาน)
-- =====================================================================
-- รองรับตัวย่อกลุ่มงานสำหรับออกเลข PO/HO
CALL AddColumnSafely('work_groups', 'prefix', 'VARCHAR(20) NULL');

-- =====================================================================
-- 6. เพิ่มคอลัมน์ในตาราง departments (ฝ่าย/กลุ่มงานย่อย)
-- =====================================================================
-- รองรับคำนำหน้าเลขที่ขอ สพ. และการผูกกลุ่มงาน
CALL AddColumnSafely('departments', 'request_prefix', 'VARCHAR(100) NULL');
CALL AddColumnSafely('departments', 'work_group_id', 'VARCHAR(50) NULL');

-- ลบ Stored Procedure ชั่วคราวเมื่อทำงานเสร็จ
DROP PROCEDURE IF EXISTS AddColumnSafely;

-- =====================================================================
-- 7. สร้างตารางใหม่ audit_logs (หากยังไม่มีในระบบเดิม)
-- =====================================================================
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

-- =====================================================================
-- 8. ปรับปรุง Charset ตารางทั้งหมดให้เป็น UTF8MB4 (ภาษาไทยสมบูรณ์)
-- =====================================================================
ALTER TABLE procurements CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE receivings CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE considerations CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE departments CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE work_groups CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =====================================================================
-- 🎉 เสร็จสิ้นการอัปเกรดฐานข้อมูล ข้อมูลเดิมของโรงพยาบาลยังอยู่ครบ 100%
-- =====================================================================
