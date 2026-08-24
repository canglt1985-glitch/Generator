import os
import re
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

# DDL tạo bảng
DDL_SQL = """
-- Drop tables if exists (dọn dẹp trước)
DROP TABLE IF EXISTS public.wards CASCADE;
DROP TABLE IF EXISTS public.provinces CASCADE;
DROP TABLE IF EXISTS public.administrative_units CASCADE;
DROP TABLE IF EXISTS public.administrative_regions CASCADE;

-- CREATE administrative_regions TABLE
CREATE TABLE public.administrative_regions (
	id integer NOT NULL,
	name varchar(255) NOT NULL,
	name_en varchar(255) NOT NULL,
	code_name varchar(255) NULL,
	code_name_en varchar(255) NULL,
	CONSTRAINT administrative_regions_pkey PRIMARY KEY (id)
);

-- CREATE administrative_units TABLE
CREATE TABLE public.administrative_units (
	id integer NOT NULL,
	full_name varchar(255) NULL,
	full_name_en varchar(255) NULL,
	short_name varchar(255) NULL,
	short_name_en varchar(255) NULL,
	code_name varchar(255) NULL,
	code_name_en varchar(255) NULL,
	CONSTRAINT administrative_units_pkey PRIMARY KEY (id)
);

-- CREATE provinces TABLE
CREATE TABLE public.provinces (
	code varchar(20) NOT NULL,
	name varchar(255) NOT NULL,
	name_en varchar(255) NULL,
	full_name varchar(255) NOT NULL,
	full_name_en varchar(255) NULL,
	code_name varchar(255) NULL,
	administrative_unit_id integer NULL,
	CONSTRAINT provinces_pkey PRIMARY KEY (code),
	CONSTRAINT provinces_administrative_unit_id_fkey FOREIGN KEY (administrative_unit_id) REFERENCES public.administrative_units(id)
);
CREATE INDEX IF NOT EXISTS idx_provinces_unit ON public.provinces(administrative_unit_id);

-- CREATE wards TABLE
CREATE TABLE public.wards (
	code varchar(20) NOT NULL,
	name varchar(255) NOT NULL,
	name_en varchar(255) NULL,
	full_name varchar(255) NULL,
	full_name_en varchar(255) NULL,
	code_name varchar(255) NULL,
	province_code varchar(20) NULL,
	administrative_unit_id integer NULL,
	CONSTRAINT wards_pkey PRIMARY KEY (code),
	CONSTRAINT wards_administrative_unit_id_fkey FOREIGN KEY (administrative_unit_id) REFERENCES public.administrative_units(id),
	CONSTRAINT wards_province_code_fkey FOREIGN KEY (province_code) REFERENCES public.provinces(code)
);
CREATE INDEX IF NOT EXISTS idx_wards_province ON public.wards(province_code);
CREATE INDEX IF NOT EXISTS idx_wards_unit ON public.wards(administrative_unit_id);
"""

def parse_and_filter_sql(file_path):
    """
    Đọc file SQL và trả về danh sách các câu lệnh INSERT đã được lọc.
    Chỉ giữ lại dữ liệu của tỉnh Đồng Nai (mã '75').
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Tách các câu lệnh dựa trên dấu chấm phẩy và xuống dòng
    # Lưu ý: các câu lệnh INSERT provinces/wards có thể chứa nhiều dòng giá trị
    statements = []
    
    # regex để tìm các câu lệnh INSERT
    # Tìm từ "INSERT" cho tới dấu ";" kết thúc
    matches = re.finditer(r'INSERT INTO\s+\w+.*?;\s*', content, re.DOTALL | re.IGNORECASE)
    
    for match in matches:
        stmt = match.group(0).strip()
        if not stmt:
            continue
            
        if "administrative_regions" in stmt or "administrative_units" in stmt:
            # Giữ nguyên toàn bộ
            statements.append(stmt)
            
        elif "provinces" in stmt:
            # Lọc chỉ lấy dòng tỉnh Đồng Nai ('75')
            # Cấu trúc: INSERT INTO provinces(...) VALUES \n ('01',...), \n ('75',...), ... ;
            # Tách phần header và phần values
            parts = re.split(r'VALUES\s*', stmt, flags=re.IGNORECASE)
            if len(parts) == 2:
                header = parts[0] + "VALUES "
                values_part = parts[1].rstrip(';')
                
                # Tách các dòng giá trị (ở đây các dòng ngăn cách bằng dấu phẩy và xuống dòng)
                # Mỗi dòng có dạng ('code', 'name', ...)
                value_rows = re.findall(r'\([^)]+\)', values_part)
                filtered_rows = []
                for row in value_rows:
                    # Dòng của Đồng Nai bắt đầu bằng ('75', hoặc ( '75',
                    if re.search(r"\(\s*'75'\s*,", row):
                        filtered_rows.append(row)
                        
                if filtered_rows:
                    statements.append(header + ", ".join(filtered_rows) + ";")
                    
        elif "wards" in stmt:
            # Lọc chỉ lấy các xã của tỉnh Đồng Nai (province_code = '75')
            # Cấu trúc: INSERT INTO wards(...) VALUES \n ('00004',...,'01',...), \n ('26425',...,'75',...), ... ;
            parts = re.split(r'VALUES\s*', stmt, flags=re.IGNORECASE)
            if len(parts) == 2:
                header = parts[0] + "VALUES "
                values_part = parts[1].rstrip(';')
                
                value_rows = re.findall(r'\([^)]+\)', values_part)
                filtered_rows = []
                for row in value_rows:
                    # Dòng của xã thuộc Đồng Nai có province_code là '75'
                    # Cấu trúc: ('code', 'name', 'name_en', 'full_name', 'full_name_en', 'code_name', 'province_code', unit_id)
                    # Ta split các phần tử bằng dấu phẩy
                    tokens = [t.strip().strip("'") for t in re.split(r",\s*", row.strip("()"))]
                    # Token thứ 7 (chỉ số 6) là province_code
                    if len(tokens) >= 7 and tokens[6] == '75':
                        filtered_rows.append(row)
                        
                if filtered_rows:
                    # Để an toàn và tránh câu lệnh quá dài, chia nhỏ các dòng wards ra thực thi (ví dụ 50 dòng một lần)
                    chunk_size = 50
                    for i in range(0, len(filtered_rows), chunk_size):
                        chunk = filtered_rows[i:i+chunk_size]
                        statements.append(header + ", ".join(chunk) + ";")
                        
    return statements

def main():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(current_dir)
    env_path = os.path.join(project_dir, 'tvt3_v2', '.env')
    
    load_dotenv(env_path)
    SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
    SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Không tìm thấy VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY trong file .env")
        return
        
    print("🔌 Đang kết nối tới Supabase...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # 1. Thực thi DDL tạo cấu trúc bảng
    print("🛠️ 1. Khởi tạo cấu trúc các bảng trên Supabase...")
    # Vì Supabase client không có hàm execute_sql trực tiếp trong thư mục client gốc (chỉ qua API / RPC),
    # nhưng Supabase MCP cung cấp công cụ execute_sql rất mạnh.
    # Trong script này, chúng ta có thể thực thi SQL bằng cách dùng HTTP Post gửi tới Supabase API SQL endpoint
    # hoặc dùng thư viện postgres nếu có kết nối trực tiếp.
    # Tuy nhiên, cách an toàn và dễ nhất là chạy các lệnh SQL này bằng cách gọi trực tiếp API REST của Supabase SQL endpoint
    # hoặc thông qua Supabase RPC / REST.
    # Đợi đã! Supabase REST API không cho phép chạy SQL thô trực tiếp trừ khi có postgres connection.
    # Nhưng dự án của chúng ta kết nối qua Supabase Client dùng API Key, không có cổng 5432 postgres mở ra ngoài.
    # Có một giải pháp thay thế: Chúng ta có thể dùng MCP tool `supabase/execute_sql` để chạy DDL và DML!
    # Đúng thế! Supabase MCP tool có quyền thực thi SQL trực tiếp trên database qua `project_id`.
    # Vậy ta có thể viết script python để sinh ra file SQL chứa toàn bộ lệnh tạo bảng và import dữ liệu lọc,
    # sau đó dùng python để in ra, hoặc chạy script sinh SQL, rồi chúng ta dùng MCP tool `supabase/execute_sql` để thực thi file SQL đó!
    # Điều này cực kỳ an toàn, nhanh chóng và tận dụng đúng sức mạnh của MCP tool.
    
    # Hãy cập nhật script này để chỉ làm nhiệm vụ: Parse dữ liệu từ file sql thô, lọc ra dữ liệu Đồng Nai,
    # rồi ghi ra một file SQL tổng hợp tên là `scratch/setup_dong_nai_db.sql`.
    # Sau đó chúng ta (agent) sẽ dùng MCP tool `supabase/execute_sql` chạy nội dung file SQL đó.
    # Cách làm này vô cùng đơn giản, không cần cấu hình python connection phức tạp!
    
    sql_file_path = os.path.join(project_dir, 'scratch', 'postgres_ImportData_vn_units.sql')
    out_sql_path = os.path.join(project_dir, 'scratch', 'setup_dong_nai_db.sql')
    
    print(f"📖 Đang đọc và lọc dữ liệu từ: {sql_file_path}")
    if not os.path.exists(sql_file_path):
        print("❌ Không tìm thấy file SQL import gốc. Vui lòng kiểm tra!")
        return
        
    try:
        statements = parse_and_filter_sql(sql_file_path)
        print(f"  [+] Lọc thành công {len(statements)} câu lệnh INSERT dữ liệu Đồng Nai.")
        
        with open(out_sql_path, 'w', encoding='utf-8') as f:
            f.write("-- DDL KHỞI TẠO BẢNG --\n")
            f.write(DDL_SQL)
            f.write("\n\n-- DATA INSERT LỌC ĐỒNG NAI --\n")
            for stmt in statements:
                f.write(stmt + "\n\n")
                
        print(f"🎉 Đã ghi file SQL tổng hợp ra: {out_sql_path}")
        print("👉 Bây giờ bạn có thể thực thi file SQL này trên Supabase.")
        
    except Exception as e:
        print(f"❌ Lỗi xử lý: {e}")

if __name__ == "__main__":
    main()
