-- ==========================================
-- KỊCH BẢN KHỞI TẠO CƠ SỞ DỮ LIỆU TVT3 V2
-- ==========================================
-- Tối ưu hóa bằng JSONB, chuẩn Strangler Fig Pattern

-- [Tùy chọn] Bỏ comment các dòng dưới nếu muốn XÓA SẠCH dữ liệu cũ trước khi tạo lại
-- DROP TABLE IF EXISTS generator_logs CASCADE;
-- DROP TABLE IF EXISTS fuel_and_expenses CASCADE;
-- DROP TABLE IF EXISTS operation_defects_logs CASCADE;
-- DROP TABLE IF EXISTS technical_assets CASCADE;
-- DROP TABLE IF EXISTS infrastructure_assets CASCADE;
-- DROP TABLE IF EXISTS contracts CASCADE;
-- DROP TABLE IF EXISTS datasites CASCADE;

-- ==========================================
-- 1. Bảng datasites (Danh sách trạm chính)
-- ==========================================
CREATE TABLE datasites (
    site_id TEXT PRIMARY KEY,
    site_id_old TEXT,
    ptm_id TEXT,
    name TEXT,
    status TEXT DEFAULT 'ACTIVE',
    location_info JSONB DEFAULT '{}'::jsonb,
    management_info JSONB DEFAULT '{}'::jsonb,
    classification JSONB DEFAULT '{}'::jsonb,
    legal_info JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. Bảng contracts (Hợp đồng nhà trạm)
-- ==========================================
CREATE TABLE contracts (
    contract_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id TEXT REFERENCES datasites(site_id) ON DELETE CASCADE,
    contract_number TEXT,
    contractor_info JSONB DEFAULT '{}'::jsonb,
    dates JSONB DEFAULT '{}'::jsonb,
    erp_info JSONB DEFAULT '{}'::jsonb,
    financials JSONB DEFAULT '{}'::jsonb,
    bank_info JSONB DEFAULT '{}'::jsonb,
    cost_details JSONB DEFAULT '{}'::jsonb,
    appendix_info JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. Bảng infrastructure_assets (Hạ tầng, Nguồn, Máy lạnh)
-- ==========================================
CREATE TABLE infrastructure_assets (
    infra_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id TEXT REFERENCES datasites(site_id) ON DELETE CASCADE,
    structures JSONB DEFAULT '{}'::jsonb,
    power_systems JSONB DEFAULT '{}'::jsonb,
    cooling_alarms JSONB DEFAULT '{}'::jsonb,
    station_mgmt JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 4. Bảng technical_assets (Thiết bị viễn thông, vô tuyến)
-- ==========================================
CREATE TABLE technical_assets (
    tech_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id TEXT REFERENCES datasites(site_id) ON DELETE CASCADE,
    ran_info JSONB DEFAULT '{}'::jsonb,
    transmission_info JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 5. Bảng operation_defects_logs (Nhật ký Tồn tại mạng lưới)
-- ==========================================
CREATE TABLE operation_defects_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id TEXT REFERENCES datasites(site_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    existing_issues JSONB DEFAULT '{}'::jsonb,
    proposed_solutions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 6. Bảng fuel_and_expenses (Nhật ký xăng dầu và chi phí)
-- ==========================================
CREATE TABLE fuel_and_expenses (
    record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id TEXT REFERENCES datasites(site_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    fuel_tracking JSONB DEFAULT '{}'::jsonb,
    other_expenses JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 7. Bảng generator_logs (Nhật ký chạy máy phát điện)
-- ==========================================
CREATE TABLE generator_logs (
    gen_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id TEXT REFERENCES datasites(site_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    run_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Thêm các Index cơ bản để truy vấn JSONB nhanh hơn
CREATE INDEX IF NOT EXISTS idx_datasites_location ON datasites USING GIN (location_info);
CREATE INDEX IF NOT EXISTS idx_datasites_management ON datasites USING GIN (management_info);
CREATE INDEX IF NOT EXISTS idx_contracts_financials ON contracts USING GIN (financials);
