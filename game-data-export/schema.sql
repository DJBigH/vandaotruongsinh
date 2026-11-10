-- ============================================================
-- VẠN ĐẠO TRƯỜNG SINH - DATABASE SCHEMA EXPORT (SQL DDL)
-- Tương thích: PostgreSQL, SQLite (thay UUID bằng TEXT), MySQL
-- ============================================================

-- 1. Bảng Tài Khoản Người Chơi (Accounts)
CREATE TABLE IF NOT EXISTS accounts (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(128) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) DEFAULT 'PLAYER', -- PLAYER, CONTENT_EDITOR, GAME_MASTER, OWNER
    is_banned BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Nhân Vật / Đạo Thân (Characters - Tối đa 3 slot mỗi tài khoản)
CREATE TABLE IF NOT EXISTS characters (
    id VARCHAR(36) PRIMARY KEY,
    account_id VARCHAR(36) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    slot INT DEFAULT 0, -- 0, 1, 2 (3 Đạo Thân độc lập)
    is_active BOOLEAN DEFAULT TRUE,
    name VARCHAR(64) UNIQUE NOT NULL,
    cultivation_path VARCHAR(32) NOT NULL, -- SWORD (Kiếm Tu), SPELL (Pháp Tu), BODY (Thể Tu)
    realm_index INT DEFAULT 0, -- 0: Luyện Khí -> 8: Độ Kiếp
    realm_tier INT DEFAULT 0, -- 0: Sơ Kỳ, 1: Trung Kỳ, 2: Hậu Kỳ, 3: Viên Mãn
    cultivation_exp BIGINT DEFAULT 0,
    exp BIGINT DEFAULT 0,
    level INT DEFAULT 1,
    stats JSON, -- { maxHp, curHp, maxMp, curMp, atk, def, spd, critRate, critDmg, resist }
    current_map_id VARCHAR(64) DEFAULT 'map_thanh_khe',
    position_x REAL DEFAULT 960,
    position_y REAL DEFAULT 720,
    gold INT DEFAULT 50, -- Linh Thạch
    appearance INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng Túi Đồ & Trang Bị Nhân Vật (Inventory Items)
CREATE TABLE IF NOT EXISTS inventory_items (
    id VARCHAR(36) PRIMARY KEY,
    character_id VARCHAR(36) NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    template_id VARCHAR(64) NOT NULL,
    quantity INT DEFAULT 1,
    is_equipped BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    slot_type VARCHAR(32), -- WEAPON, ARMOR, SHOES, ACCESSORY, ARTIFACT
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bảng Kỹ Năng Nhân Vật Học Được (Character Skills)
CREATE TABLE IF NOT EXISTS character_skills (
    id VARCHAR(36) PRIMARY KEY,
    character_id VARCHAR(36) NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    skill_id VARCHAR(64) NOT NULL,
    level INT DEFAULT 1,
    is_equipped BOOLEAN DEFAULT FALSE,
    equipped_slot INT, -- 1, 2, 3, 4
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Bảng Tiến Trình Nhiệm Vụ (Character Quests)
CREATE TABLE IF NOT EXISTS character_quests (
    id VARCHAR(36) PRIMARY KEY,
    character_id VARCHAR(36) NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    quest_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) DEFAULT 'AVAILABLE', -- AVAILABLE, IN_PROGRESS, COMPLETED, FAILED
    progress JSON, -- { objectives: [{ current, required, isCompleted }] }
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- 6. Bảng Cờ Sự Kiện / Lựa Chọn Cốt Truyện (Story Flags)
CREATE TABLE IF NOT EXISTS story_flags (
    id VARCHAR(36) PRIMARY KEY,
    character_id VARCHAR(36) NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    flag_key VARCHAR(128) NOT NULL,
    flag_value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(character_id, flag_key)
);
