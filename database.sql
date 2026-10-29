
-- 1. Reset Database (DROP and CREATE with UTF8MB4 for Thai Support)
DROP DATABASE IF EXISTS procurement_db;
CREATE DATABASE procurement_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE procurement_db;

-- 2. Work Groups (จัดการกลุ่มงาน)
CREATE TABLE work_groups (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    prefix VARCHAR(20), -- NEW: Work Group Prefix for Official Numbers
    is_active BOOLEAN DEFAULT TRUE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Example Data
INSERT INTO work_groups (id, name, prefix) VALUES 
('g1', 'กลุ่มงานบริหารทั่วไป', 'บห.'),
('g2', 'กลุ่มงานยุทธศาสตร์', 'ยศ.');

-- 3. Departments (จัดการฝ่าย/งาน)
CREATE TABLE departments (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    prefix VARCHAR(20), 
    request_prefix VARCHAR(100), -- เลขที่ใบขอ เช่น สพ ๐๐๓๓.๐๖/๑/๒/
    work_group_id VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Example Data
INSERT INTO departments (id, name, prefix, request_prefix, work_group_id) VALUES 
('d1', 'งานการเงิน', 'กง.', 'สพ ๐๐๓๓.๐๖/๑/๑/', 'g1'),
('d2', 'งานพัสดุ', 'พด.', 'สพ ๐๐๓๓.๐๖/๑/๒/', 'g1');

-- 4. Categories (หมวดพัสดุ)
CREATE TABLE procurement_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    department_id VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 5. Users (ผู้ใช้งาน)
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    role ENUM('ADMIN', 'USER', 'EXECUTIVE') DEFAULT 'USER',
    department_id VARCHAR(50),
    status ENUM('PENDING', 'ACTIVE', 'SUSPENDED') DEFAULT 'PENDING',
    created_at BIGINT
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Default Admin (Password: password)
INSERT INTO users (id, username, password, name, role, status, created_at) 
VALUES ('admin', 'admin', 'password', 'System Admin', 'ADMIN', 'ACTIVE', 1700000000000);

-- 6. Procurements
CREATE TABLE procurements (
    id VARCHAR(50) PRIMARY KEY,
    request_id VARCHAR(50) NOT NULL,
    request_date DATE NOT NULL,
    category VARCHAR(255),
    item_count INT DEFAULT 0,
    amount DECIMAL(15, 2) DEFAULT 0.00,
    company VARCHAR(255),
    remarks TEXT,
    official_number VARCHAR(50),
    type ENUM('PURCHASE', 'HIRING', 'OTHER') NOT NULL,
    department_id VARCHAR(50),
    created_by VARCHAR(50),
    created_at BIGINT,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at BIGINT,
    deleted_by VARCHAR(100),
    is_locked BOOLEAN DEFAULT FALSE,
    locked_at BIGINT,
    locked_by VARCHAR(100)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 7. Receivings
CREATE TABLE receivings (
    id VARCHAR(50) PRIMARY KEY,
    request_id VARCHAR(50) NOT NULL,
    delivery_note_no VARCHAR(50),
    receive_date DATE,
    category VARCHAR(255),
    created_at BIGINT,
    procurement_id VARCHAR(50)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 8. Considerations
CREATE TABLE considerations (
    id VARCHAR(50) PRIMARY KEY,
    request_id VARCHAR(50) NOT NULL,
    consideration_number VARCHAR(50),
    consideration_date DATE,
    procurement_id VARCHAR(50)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 9. Audit Logs (ประวัติการแก้ไขและกิจกรรมความปลอดภัย)
CREATE TABLE audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    user_id VARCHAR(50),
    user_name VARCHAR(100),
    action VARCHAR(50),
    record_id VARCHAR(50),
    request_id VARCHAR(50),
    details TEXT,
    changes JSON
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

