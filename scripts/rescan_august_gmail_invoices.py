#!/usr/bin/env python3
"""
Rescan August 2026 Gmail Invoices
Thực hiện quét lại toàn bộ email trong tháng 8/2026, giải nén XML/ZIP/PDF,
trích xuất hóa đơn và nạp đầy đủ vào Supabase parsed_invoices.
"""

import os
import sys
import json
import email
from email.header import decode_header
import imaplib
import zipfile
import io
import uuid
from datetime import datetime
from supabase import create_client

sys.path.insert(0, '/Users/cang_it/Antigravity/TVT3')

from backend.invoice_worker import (
    load_system_config,
    parse_e_invoice_xml,
    parse_invoice_from_pdf,
    parse_invoice_from_html
)

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://lnmoczxjweuifacqujcu.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxubW9jenhqd2V1aWZhY3F1amN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MzcxOTYsImV4cCI6MjA5NDIxMzE5Nn0.C0Si7ChY4T_mxLylSkDNJOUcj9D0uuGW_L4t7p9yONI")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def rescan_august_invoices():
    cfg = load_system_config()
    gmail_user = cfg.get("gmail_user") or os.getenv("GMAIL_USER") or "cang.mobifonelkh@gmail.com"
    gmail_app_pass = cfg.get("gmail_app_password") or os.getenv("GMAIL_APP_PASSWORD")

    if not gmail_user or not gmail_app_pass:
        print("❌ Thiếu thông tin đăng nhập Gmail!")
        return

    print(f"🔍 Đang kết nối Gmail: {gmail_user}...")
    mail = imaplib.IMAP4_SSL("imap.gmail.com", timeout=30)
    mail.login(gmail_user, gmail_app_pass)
    mail.select("inbox")

    # Search SINCE 01-Aug-2026
    print("📧 Tìm kiếm tất cả email từ 01-Aug-2026 đến nay...")
    status, data = mail.uid('search', None, 'SINCE 01-Aug-2026')
    if status != 'OK' or not data[0]:
        print("Không tìm thấy email nào.")
        mail.logout()
        return

    uids = data[0].split()
    print(f"📬 Tìm thấy {len(uids)} email trong hộp thư đến.")

    keywords = ["hóa đơn", "hoadon", "invoice", "e-invoice", "hddt", "xăng", "dầu", "nam trung phong", "tín nghĩa", "petro"]
    
    parsed_invoices_list = []
    scanned_count = 0
    match_email_count = 0

    for uid in reversed(uids):
        scanned_count += 1
        # Fetch headers
        status, msg_data = mail.uid('fetch', uid, '(BODY.PEEK[HEADER.FIELDS (SUBJECT FROM DATE)])')
        if status != 'OK' or not msg_data[0]:
            continue
            
        raw_email = msg_data[0][1]
        msg = email.message_from_bytes(raw_email)
        
        # Subject
        subject = ""
        raw_subject = msg.get("Subject")
        if raw_subject:
            decoded = decode_header(raw_subject)
            for part, encoding in decoded:
                if isinstance(part, bytes):
                    subject += part.decode(encoding or "utf-8", errors="ignore")
                else:
                    subject += str(part)
        
        # From
        sender = ""
        raw_from = msg.get("From")
        if raw_from:
            decoded = decode_header(raw_from)
            for part, encoding in decoded:
                if isinstance(part, bytes):
                    sender += part.decode(encoding or "utf-8", errors="ignore")
                else:
                    sender += str(part)

        subj_lower = subject.lower()
        sender_lower = sender.lower()
        
        is_relevant = any(k in subj_lower for k in keywords) or any(k in sender_lower for k in keywords)
        if not is_relevant:
            continue

        match_email_count += 1
        print(f"[{match_email_count}] Đang đọc: {subject[:55]}... ({sender[:30]})")

        # Fetch full message
        status, full_msg_data = mail.uid('fetch', uid, '(BODY.PEEK[])')
        if status != 'OK' or not full_msg_data[0]:
            continue
            
        full_msg = email.message_from_bytes(full_msg_data[0][1])
        
        xml_files = []
        pdf_files = []
        html_body = ""

        for part in full_msg.walk():
            c_type = part.get_content_type()
            if c_type == 'text/html':
                try:
                    html_body = part.get_payload(decode=True).decode('utf-8', errors='ignore')
                except Exception:
                    pass

            filename = part.get_filename()
            if not filename:
                continue
                
            decoded_fn = decode_header(filename)
            fn_str = ""
            for part_fn, enc_fn in decoded_fn:
                if isinstance(part_fn, bytes):
                    fn_str += part_fn.decode(enc_fn or "utf-8", errors="ignore")
                else:
                    fn_str += str(part_fn)
                    
            fn_lower = fn_str.lower()
            data_bytes = part.get_payload(decode=True)
            if not data_bytes:
                continue

            if fn_lower.endswith('.xml'):
                xml_files.append((fn_str, data_bytes))
            elif fn_lower.endswith('.zip'):
                try:
                    with zipfile.ZipFile(io.BytesIO(data_bytes)) as z:
                        for zname in z.namelist():
                            if zname.lower().endswith('.xml'):
                                xml_files.append((zname, z.read(zname)))
                except Exception as ex:
                    print(f"    ⚠️ Lỗi zip {fn_str}: {ex}")
            elif fn_lower.endswith('.pdf'):
                pdf_files.append((fn_str, data_bytes))

        # Parse XMLs
        for xname, xcontent in xml_files:
            parsed = parse_e_invoice_xml(xcontent, source_name=f"Gmail XML ({xname})")
            if parsed and not parsed.get("error") and parsed.get("so_hd"):
                parsed_invoices_list.append(parsed)
                print(f"    ✅ XML: HĐ #{parsed['so_hd']} ngày {parsed['ngay_lap']} | {parsed.get('tong_tien', 0):,.0f} đ | {parsed.get('seller_name', '')[:25]}")

        # Parse PDFs
        if not xml_files:
            for pname, pcontent in pdf_files:
                parsed = parse_invoice_from_pdf(pcontent, source_name=f"Gmail PDF ({pname})")
                if parsed and not parsed.get("error") and parsed.get("so_hd"):
                    parsed_invoices_list.append(parsed)
                    print(f"    📄 PDF: HĐ #{parsed['so_hd']} ngày {parsed['ngay_lap']} | {parsed.get('tong_tien', 0):,.0f} đ | {parsed.get('seller_name', '')[:25]}")

        # Parse HTML if neither XML nor PDF found
        if not xml_files and not pdf_files and html_body:
            parsed = parse_invoice_from_html(html_body, source_name="Gmail HTML")
            if parsed and not parsed.get("error") and parsed.get("so_hd"):
                parsed_invoices_list.append(parsed)
                print(f"    🌐 HTML: HĐ #{parsed['so_hd']} ngày {parsed['ngay_lap']} | {parsed.get('tong_tien', 0):,.0f} đ | {parsed.get('seller_name', '')[:25]}")

    mail.logout()
    print(f"\n🎉 QUÉT GMAIL HOÀN TẤT! Đã trích xuất {len(parsed_invoices_list)} lượt hóa đơn từ các email.")

    # Upsert to Supabase
    saved_count = 0
    for inv in parsed_invoices_list:
        so_hd = str(inv.get("so_hd", "")).strip()
        seller_mst = str(inv.get("seller_mst", "")).strip()
        ngay_lap = inv.get("ngay_lap", "")
        if not so_hd:
            continue

        invoice_id = str(uuid.uuid5(uuid.NAMESPACE_OID, f"invoice_{so_hd}_{seller_mst}_{ngay_lap}"))
        
        payload = {
            "id": invoice_id,
            "invoice_date": ngay_lap,
            "invoice_number": so_hd,
            "seller_name": inv.get("seller_name"),
            "seller_mst": seller_mst,
            "buyer_name": inv.get("buyer_name"),
            "buyer_mst": inv.get("buyer_mst"),
            "total_amount": inv.get("tong_tien"),
            "expense_type": inv.get("loai_chi_phi") or "Nhiên liệu",
            "items": inv.get("items"),
            "source": inv.get("source"),
            "status": "Approved",
            "invoice_url": inv.get("invoice_url"),
            "kh_hd": inv.get("kh_hd"),
            "ma_tra_cuu": inv.get("ma_tra_cuu"),
            "sub_total": inv.get("sub_total"),
            "vat_amount": inv.get("vat_amount")
        }
        
        try:
            supabase.from_("parsed_invoices").upsert(payload).execute()
            saved_count += 1
        except Exception as ex:
            print(f"  ❌ Lỗi lưu HĐ #{so_hd}: {ex}")

    print(f"💾 Đã nạp và cập nhật thành công {saved_count} hóa đơn vào Supabase!")

    # Load all August invoices from Supabase
    aug_invs = supabase.from_("parsed_invoices").select("*").gte("invoice_date", "2026-08-01").lte("invoice_date", "2026-08-31").execute().data or []
    print(f"\n==================================================")
    print(f"📊 TỔNG SỐ HÓA ĐƠN THÁNG 08/2026 TRONG CSDL: {len(aug_invs)} HÓA ĐƠN")
    print(f"==================================================")

    # Daily breakdown per seller
    daily_seller_map = {}
    for i in aug_invs:
        d = i.get('invoice_date', '')
        seller = i.get('seller_name', '') or i.get('seller_mst', '')
        key = (d, seller)
        if key not in daily_seller_map:
            daily_seller_map[key] = {'total': 0.0, 'count': 0, 'invoices': []}
        amt = float(i.get('total_amount_with_vat') or i.get('total_amount') or 0)
        daily_seller_map[key]['total'] += amt
        daily_seller_map[key]['count'] += 1
        daily_seller_map[key]['invoices'].append(f"#{i.get('invoice_number')} ({amt:,.0f} đ)")

    print("\n📅 BẢNG THEO DÕI HẠN MỨC THEO NGÀY & ĐƠN VỊ BÁN:")
    exceed_days = []
    for (d, seller), info in sorted(daily_seller_map.items()):
        is_exceed = info['total'] > 5000000
        tag = "🔴 VƯỢT 5TR" if is_exceed else "🟢 <= 5tr"
        if is_exceed:
            exceed_days.append((d, seller, info['total'], info['invoices']))
        print(f"  - {d} | {seller[:30]:<30} | {info['count']:2d} HĐ | {info['total']:11,.0f} đ | {tag}")

    if exceed_days:
        print(f"\n⚠️ DANH SÁCH CÁC NGÀY VƯỢT 5.000.000 Đ TRONG TOÀN BỘ KHO DỮ LIỆU:")
        for d, seller, tot, inv_list in exceed_days:
            print(f"  * Ngày {d} - {seller}: Tổng {tot:,.0f} đ ({', '.join(inv_list)})")
    else:
        print("\n✅ TẤT CẢ CÁC NGÀY ĐỀU ĐẠT HẠN MỨC <= 5.000.000 Đ/NGÀY!")

if __name__ == '__main__':
    rescan_august_invoices()
