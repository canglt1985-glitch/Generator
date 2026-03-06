
import os
import logging
from app import app
from models import db
from datasite_utils import (
    import_thong_tin_chung, import_nha_dan, import_cot_anten,
    import_phong_may, import_phong_mpd, import_may_lanh,
    import_may_phat, import_tu_nguon, import_accu,
    import_bts_3g, import_bts_4g, import_thiet_bi_vt
)

logging.basicConfig(level=logging.INFO)

mapping = {
    'thong tin chung.xlsx': import_thong_tin_chung,
    'DATA Trạm Nhà Dân + Pháp Nhân + VNPT + VNPOST (12).xlsx': import_nha_dan,
    'cot anten.xlsx': import_cot_anten,
    'phong may.xlsx': import_phong_may,
    'phong mpd.xlsx': import_phong_mpd,
    'may lanh.xlsx': import_may_lanh,
    'may phat dien.xlsx': import_may_phat,
    'tu nguon.xlsx': import_tu_nguon,
    'to accu.xlsx': import_accu,
    'BTS 3G.xlsx': import_bts_3g,
    'BTS 4G.xlsx': import_bts_4g,
    'Thiet bi vien thong.xlsx': import_thiet_bi_vt
}

def main():
    folder = r"D:\Chuyen doi so\datasite"
    with app.app_context():
        results = {}
        for filename, handler in mapping.items():
            path = os.path.join(folder, filename)
            if os.path.exists(path):
                print(f"Importing {filename}...")
                try:
                    count = handler(path)
                    results[filename] = count
                    print(f"✅ {filename}: {count} records")
                except Exception as e:
                    results[filename] = str(e)
                    print(f"❌ {filename}: {e}")
            else:
                print(f"File not found: {filename}")
        
        print("\n--- FINAL SUMMARY ---")
        for k, v in results.items():
            print(f"{k}: {v}")

if __name__ == "__main__":
    main()
