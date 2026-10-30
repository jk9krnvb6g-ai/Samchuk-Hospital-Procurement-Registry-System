-- =====================================================================
-- Samchuk Hospital Procurement Database Migration Script
-- Version: 1.1.0
-- Database: procurement_db
-- 
-- Instructions for DBA:
-- Run this script in MySQL Workbench or via mysql CLI on 10.1.0.201.
-- This script is idempotent (safe to run multiple times).
-- =====================================================================

USE procurement_db;

-- 1. Ensure procurement_id exists on receivings
SET @col_exists := (SELECT count(*) FROM information_schema.columns 
                    WHERE table_schema = 'procurement_db' 
                      AND table_name = 'receivings' 
                      AND column_name = 'procurement_id');
SET @query := IF(@col_exists = 0, 
                 'ALTER TABLE receivings ADD COLUMN procurement_id VARCHAR(50)', 
                 'SELECT "Column procurement_id already exists in receivings"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Ensure procurement_id exists on considerations
SET @col_exists := (SELECT count(*) FROM information_schema.columns 
                    WHERE table_schema = 'procurement_db' 
                      AND table_name = 'considerations' 
                      AND column_name = 'procurement_id');
SET @query := IF(@col_exists = 0, 
                 'ALTER TABLE considerations ADD COLUMN procurement_id VARCHAR(50)', 
                 'SELECT "Column procurement_id already exists in considerations"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Ensure soft-delete and lock columns exist on procurements
SET @col_exists := (SELECT count(*) FROM information_schema.columns 
                    WHERE table_schema = 'procurement_db' 
                      AND table_name = 'procurements' 
                      AND column_name = 'is_deleted');
SET @query := IF(@col_exists = 0, 
                 'ALTER TABLE procurements ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE, ADD COLUMN deleted_at BIGINT, ADD COLUMN deleted_by VARCHAR(100), ADD COLUMN is_locked BOOLEAN DEFAULT FALSE, ADD COLUMN locked_at BIGINT, ADD COLUMN locked_by VARCHAR(100)', 
                 'SELECT "Soft-delete and lock columns already exist in procurements"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Ensure audit_logs table exists
CREATE TABLE IF NOT EXISTS audit_logs (
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

-- Verification Query:
SELECT 'Migration check complete' AS status;
