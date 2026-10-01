#!/usr/bin/env python3
"""
Scan Gmail Invoices for Yesterday and Today (2026-09-29 and 2026-09-30).
Fetches emails from inbox, processes XML/ZIP/PDF/HTML, and syncs into Supabase `parsed_invoices`.
"""

import os
import sys
import email
from email.header import decode_header
from email.utils import parsedate_to_datetime
import imaplib
import zipfile
import io
import uuid
import json
from datetime import datetime, timezone, timedelta
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

def clean_header_str(raw_header):
    if not raw_header:
        return ""
    decoded = decode_header(raw_header)
    res = ""
    for part, enc in decoded:
        if isinstance(part, bytes):
            res += part.decode(enc or 'utf-8', errors='ignore')
        else:
            res += str(part)
    return res.strip()

def run_scan():
    cfg = load_system_config()
    gmail_user = cfg.get("gmail_user") or os.getenv("GMAIL_USER") or "cang.mobifonelkh@gmail.com"
    gmail_app_pass = cfg.get("gmail_app_password") or os.getenv("GMAIL_APP_PASSWORD")

    if not gmail_user or not gmail_app_pass:
        print("❌ Thiếu thông tin đăng nhập Gmail trong system_config.json!")
        return

    print(f"🔌 Kết nối Gmail: {gmail_user}...")
    mail = imaplib.IMAP4_SSL("imap.gmail.com", timeout=30)
    mail.login(gmail_user, gmail_app_pass)
    mail.select("inbox")

    # Target date: from 2026-09-29 00:00:00 local time
    # Using IMAP search SINCE 28-Sep-2026 to ensure UTC/Local buffer
    print("🔎 Tìm kiếm email từ 28-Sep-2026 đến nay (29/09 - 30/09)...")
    status, data = mail.uid('search', None, 'SINCE 28-Sep-2026')
    if status != 'OK' or not data[0]:
        print("❌ Không tìm thấy email nào.")
        mail.logout()
        return

    uids = data[0].split()
    print(f"📬 Tìm thấy {len(uids)} email kể từ 28/09. Đang lọc email ngày hôm qua (29/09) và hôm nay (30/09)...")

    keywords = ["hóa đơn", "hoadon", "invoice", "e-invoice", "hddt", "xăng", "dầu", "nam trung phong", "tín nghĩa", "petro", "cây xăng", "ptx", "pvoil", "petrolimex"]

    matched_emails = []
    
    # Process from newest to oldest
    for uid in reversed(uids):
        status, msg_data = mail.uid('fetch', uid, '(BODY.PEEK[HEADER.FIELDS (SUBJECT FROM DATE)])')
        if status != 'OK' or not msg_data[0]:
            continue
        
        raw_headers = msg_data[0][1]
        msg = email.message_from_bytes(raw_headers)
        
        subject = clean_header_str(msg.get("Subject"))
        sender = clean_header_str(msg.get("From"))
        date_str = msg.get("Date") or ""
        
        email_dt = None
        if date_str:
            try:
                email_dt = parsedate_to_datetime(date_str)
            except Exception as e:
                pass

        # Check if email is from 2026-09-29 or later (local date)
        if email_dt:
            local_dt = email_dt.astimezone()
            # We want yesterday (29/09/2026) and today (30/09/2026)
            if local_dt.date() < datetime(2026, 9, 29).date():
                continue
        else:
            continue

        subj_lower = subject.lower()
        sender_lower = sender.lower()
        is_relevant = any(k in subj_lower for k in keywords) or any(k in sender_lower for k in keywords)

        print(f"  👉 Email UID {uid.decode()}: [{local_dt.strftime('%d/%m/%Y %H:%M')}] From: {sender[:35]} | Subj: {subject[:45]} | Match: {is_relevant}")
        
        if is_relevant:
            matched_emails.append({
                "uid": uid,
                "subject": subject,
                "sender": sender,
                "date": local_dt
            })

    print(f"\n🎯 Tìm thấy {len(matched_emails)} email phù hợp với từ khóa hóa đơn trong 2 ngày (29/09 & 30/09).")

    all_invoices_found = []

    for item in matched_emails:
        uid = item["uid"]
        subject = item["subject"]
        sender = item["sender"]
        dt = item["date"]

        print(f"\n-------------------------------------------------------------")
        print(f"📥 Đang tải chi tiết Email UID {uid.decode()} ({dt.strftime('%d/%m/%Y %H:%M')})")
        print(f"   Tiêu đề: {subject}")
        print(f"   Người gửi: {sender}")

        status, full_data = mail.uid('fetch', uid, '(BODY.PEEK[])')
        if status != 'OK' or not full_data[0]:
            print("   ⚠️ Không thể đọc nội dung email.")
            continue

        full_msg = email.message_from_bytes(full_data[0][1])
        attachments = []
        body_html = ""

        for part in full_msg.walk():
            c_type = part.get_content_type()
            if c_type == 'text/html':
                try:
                    body_html = part.get_payload(decode=True).decode('utf-8', errors='ignore')
                except Exception:
                    pass
            filename = part.get_filename()
            if filename:
                fn_str = clean_header_str(filename)
                fn_lower = fn_str.lower()
                if fn_lower.endswith('.xml') or fn_lower.endswith('.zip') or fn_lower.endswith('.pdf'):
                    attachments.append({
                        "filename": fn_str,
                        "data": part.get_payload(decode=True)
                    })

        print(f"   📎 Đính kèm tìm thấy: {[a['filename'] for a in attachments]}")

        has_xml_or_pdf = False

        # Process attachments
        for att in attachments:
            fname = att["filename"]
            data = att["data"]

            xml_files = []
            pdf_files = []

            if fname.lower().endswith('.xml'):
                xml_files.append((fname, data))
            elif fname.lower().endswith('.zip'):
                try:
                    with zipfile.ZipFile(io.BytesIO(data)) as z:
                        for zname in z.namelist():
                            if zname.lower().endswith('.xml'):
                                xml_files.append((zname, z.read(zname)))
                except Exception as ex:
                    print(f"   ⚠️ Lỗi giải nén {fname}: {ex}")
            elif fname.lower().endswith('.pdf'):
                pdf_files.append((fname, data))

            # 1. Process XML
            for zname, zdata in xml_files:
                has_xml_or_pdf = True
                parsed = parse_e_invoice_xml(zdata, source_name=f"Gmail từ {sender}")
                if "error" in parsed:
                    print(f"   ⚠️ Lỗi parse XML {zname}: {parsed['error']}")
                    continue
                parsed["email_subject"] = subject
                parsed["email_date"] = dt.strftime('%Y-%m-%d %H:%M:%S')
                parsed["file_type"] = f"XML ({zname})"
                all_invoices_found.append(parsed)

            # 2. Process PDF
            for pname, pdata in pdf_files:
                has_xml_or_pdf = True
                parsed = parse_invoice_from_pdf(pdata, source_name=f"Gmail PDF từ {sender}")
                if not parsed or "error" in parsed:
                    continue
                parsed["email_subject"] = subject
                parsed["email_date"] = dt.strftime('%Y-%m-%d %H:%M:%S')
                parsed["file_type"] = f"PDF ({pname})"
                all_invoices_found.append(parsed)

        # 3. Fallback HTML body
        if not has_xml_or_pdf and body_html:
            parsed = parse_invoice_from_html(body_html, source_name=f"Gmail từ {sender}")
            if parsed and parsed.get("so_hd") and parsed.get("seller_mst") and not parsed.get("is_duplicate"):
                parsed["email_subject"] = subject
                parsed["email_date"] = dt.strftime('%Y-%m-%d %H:%M:%S')
                parsed["file_type"] = "HTML Body"
                all_invoices_found.append(parsed)

    mail.logout()

    print(f"\n=============================================================")
    print(f"📊 TỔNG HỢP {len(all_invoices_found)} HÓA ĐƠN TRÍCH XUẤT ĐƯỢC:")
    print(f"=============================================================")

    inserted_count = 0
    existed_count = 0

    results_table = []

    for inv in all_invoices_found:
        so_hd = inv.get("so_hd")
        seller_mst = inv.get("seller_mst")
        seller_name = inv.get("seller_name")
        total_amount = float(inv.get("tong_tien") or 0.0)
        ngay_lap = inv.get("ngay_lap")
        loai_chi_phi = inv.get("loai_chi_phi") or "Xăng dầu máy phát điện"

        if not so_hd or not seller_mst:
            print(f"⚠️ Hóa đơn thiếu SHDon hoặc MST: {inv}")
            continue

        invoice_id = str(uuid.uuid5(uuid.NAMESPACE_OID, f"invoice_{so_hd}_{seller_mst}"))

        # Check DB
        res_exist = supabase.table("parsed_invoices").select("id, invoice_number, total_amount, created_at").eq("id", invoice_id).execute()
        
        status_db = ""
        if res_exist.data:
            status_db = "Đã có trong DB"
            existed_count += 1
        else:
            payload = {
                "id": invoice_id,
                "invoice_date": ngay_lap,
                "invoice_number": so_hd,
                "seller_name": seller_name,
                "seller_mst": seller_mst,
                "buyer_name": inv.get("buyer_name"),
                "buyer_mst": inv.get("buyer_mst"),
                "total_amount": total_amount,
                "expense_type": loai_chi_phi,
                "items": inv.get("items") or [],
                "source": inv.get("source"),
                "status": "Approved",
                "invoice_url": inv.get("invoice_url"),
                "kh_hd": inv.get("kh_hd"),
                "ma_tra_cuu": inv.get("ma_tra_cuu"),
                "sub_total": inv.get("sub_total"),
                "vat_amount": inv.get("vat_amount")
            }
            try:
                supabase.table("parsed_invoices").insert(payload).execute()
                status_db = "Mới chèn thành công"
                inserted_count += 1
            except Exception as e:
                status_db = f"Lỗi chèn: {e}"

        results_table.append({
            "so_hd": so_hd,
            "ngay_lap": ngay_lap,
            "seller": seller_name,
            "seller_mst": seller_mst,
            "amount": total_amount,
            "file_type": inv.get("file_type"),
            "email_date": inv.get("email_date"),
            "status": status_db
        })

    for idx, r in enumerate(results_table, 1):
        print(f"[{idx}] HĐ #{r['so_hd']} | Ngày lập: {r['ngay_lap']} | {r['seller']} | {r['amount']:,.0f} đ | {r['status']}")

    print(f"\n🎉 HOÀN TẤT: Đã kiểm tra {len(results_table)} hóa đơn (Mới thêm: {inserted_count}, Đã tồn tại: {existed_count}).")

if __name__ == '__main__':
    run_scan()
