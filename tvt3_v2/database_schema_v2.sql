-- ==========================================
-- KỊCH BẢN KHỞI TẠO CƠ SỞ DỮ LIỆU TVT3 V2
-- ==========================================
-- Thiết kế Hybrid: JSONB + SQL Views
-- Cập nhật: 2026-06-12 (Đã gộp contracts, infrastructure, technical vào datasites)

-- ==========================================
-- 1. Bảng datasites (Hồ sơ trạm tích hợp - Master Table)
-- ==========================================
-- Chứa TOÀN BỘ thông tin tĩnh của trạm: thông tin chung, hợp đồng, hạ tầng, kỹ thuật.
-- Mỗi trạm chỉ có DUY NHẤT 1 dòng trong bảng này.
CREATE TABLE datasites (
    site_id TEXT PRIMARY KEY,
    site_id_old TEXT,
    ptm_id TEXT,
    name TEXT,
    status TEXT DEFAULT 'ACTIVE',
    -- Thông tin tĩnh (đã có từ đầu)
    location_info JSONB DEFAULT '{}'::jsonb,
    management_info JSONB DEFAULT '{}'::jsonb,
    classification JSONB DEFAULT '{}'::jsonb,
    legal_info JSONB DEFAULT '{}'::jsonb,
    -- Thông tin hợp đồng (gộp từ bảng contracts cũ)
    contract_number TEXT,
    contract_info JSONB DEFAULT '{}'::jsonb,
    -- Thông tin hạ tầng phụ trợ (cột anten, máy lạnh, máy phát, tủ nguồn, accu...)
    infrastructure_info JSONB DEFAULT '{}'::jsonb,
    -- Thông tin kỹ thuật viễn thông (RAN, cell, truyền dẫn...)
    technical_info JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. Bảng daily_work (Nhật ký công việc hàng ngày)
-- ==========================================
CREATE TABLE daily_work (
    id SERIAL PRIMARY KEY,
    site_id TEXT REFERENCES datasites(site_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    work_type TEXT,
    description TEXT,
    worker TEXT,
    status TEXT DEFAULT 'pending',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. Bảng power_schedule (Lịch cúp điện)
-- ==========================================
CREATE TABLE power_schedule (
    id SERIAL PRIMARY KEY,
    site_id TEXT REFERENCES datasites(site_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TEXT,
    end_time TEXT,
    reason TEXT,
    source TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 4. Bảng generator_logs (Nhật ký chạy máy phát điện)
-- ==========================================
CREATE TABLE generator_logs (
    gen_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id TEXT REFERENCES datasites(site_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    run_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 5. Bảng fuel_and_expenses (Nhiên liệu & Chi phí)
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
-- 6. Bảng operation_defects_logs (Tồn tại & Sự cố mạng lưới)
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
-- Index tối ưu hóa truy vấn
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_datasites_location ON datasites USING GIN (location_info);
CREATE INDEX IF NOT EXISTS idx_datasites_management ON datasites USING GIN (management_info);
CREATE INDEX IF NOT EXISTS idx_datasites_contract ON datasites USING GIN (contract_info);
CREATE INDEX IF NOT EXISTS idx_datasites_infra ON datasites USING GIN (infrastructure_info);
CREATE INDEX IF NOT EXISTS idx_datasites_tech ON datasites USING GIN (technical_info);
CREATE INDEX IF NOT EXISTS idx_datasites_contract_num ON datasites (contract_number);

-- ==========================================
-- View phẳng hóa v_datasites
-- ==========================================
CREATE OR REPLACE VIEW v_datasites AS
SELECT 
    site_id,
    site_id_old,
    ptm_id,
    name,
    status,
    -- Phân loại
    (classification ->> 'chu_csht') AS chu_csht,
    (classification ->> 'loai_tram') AS loai_tram,
    (classification ->> 'phan_lop_csht') AS phan_lop_csht,
    (classification ->> 'phan_loai_tram') AS phan_loai_tram,
    (classification ->> 'doi_tuong_ky_hd') AS doi_tuong_ky_hd,
    (classification ->> 'hinh_thuc_dau_tu') AS hinh_thuc_dau_tu,
    -- Quản lý
    (management_info ->> 'qlt') AS qlt,
    (management_info ->> 'to_ql') AS to_ql,
    (management_info ->> 'vung_phu') AS vung_phu,
    (management_info ->> 'tram_main') AS tram_main,
    (management_info ->> 'ngay_phat_song') AS ngay_phat_song,
    (management_info ->> 'ma_pe') AS ma_pe,
    (management_info ->> 'ma_csht') AS ma_csht,
    (management_info ->> 'pha_ptm') AS pha_ptm,
    (management_info ->> 'chung_cot_anten') AS chung_cot_anten,
    -- Vị trí
    (location_info ->> 'thanh_pho') AS thanh_pho,
    (location_info ->> 'huyen_cu') AS huyen,
    (location_info ->> 'xa_cu') AS xa,
    (location_info ->> 'xa_moi') AS xa_moi,
    (location_info ->> 'dia_chi_cu') AS dia_chi,
    (location_info ->> 'vi_do') AS vi_do,
    (location_info ->> 'kinh_do') AS kinh_do,
    -- Hợp đồng phẳng hóa
    contract_number,
    (contract_info -> 'dates' ->> 'ngay_ky_hd') AS ngay_ky_hd,
    (contract_info -> 'dates' ->> 'ngay_ket_thuc_hd') AS ngay_ket_thuc_hd,
    ((contract_info -> 'financials' ->> 'gia_thue_co_vat')::numeric) AS gia_thue_co_vat,
    (contract_info -> 'bank_info' ->> 'chu_tai_khoan') AS chu_tai_khoan,
    (contract_info -> 'bank_info' ->> 'so_tai_khoan') AS so_tai_khoan,
    (contract_info -> 'bank_info' ->> 'ngan_hang') AS ngan_hang,
    (contract_info -> 'contractor_info' ->> 'chu_the_hop_dong') AS chu_the_hop_dong,
    (contract_info ->> 'status') AS contract_status,
    created_at,
    updated_at
FROM datasites;
