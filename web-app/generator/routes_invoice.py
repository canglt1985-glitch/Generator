import imaplib
import email
from email.header import decode_header
import zipfile
import io
import re
import os
import xml.etree.ElementTree as ET
from flask import request, redirect, url_for, flash, session, jsonify, render_template
from extensions import db
from models import SystemConfig, ParsedInvoice, FuelLedger, OtherExpense
from auth import login_required, admin_required, cost_access_required
from generator import generator_bp
from datetime import datetime

# Helper to parse XML electronic invoice content (TCT schema & fallbacks)
def parse_e_invoice_xml(xml_content, source_name="Tải lên thủ công"):
    try:
        if isinstance(xml_content, str):
            xml_str = xml_content
        else:
            xml_str = xml_content.decode('utf-8', errors='ignore')
            
        # Clean XML declaration & namespaces for easier ElementTree parsing
        xml_str = re.sub(r'<\?xml.*?\?>', '', xml_str)
        xml_str = re.sub(r'\sxmlns(:\w+)?="[^"]*"', '', xml_str)
        root = ET.fromstring(xml_str)
    except Exception as e:
        return {"error": f"Không thể phân tích XML: {str(e)}"}

    invoice_data = {
        "so_hd": "",
        "ngay_lap": "",
        "seller_name": "",
        "seller_mst": "",
        "buyer_name": "",
        "buyer_mst": "",
        "tong_tien": 0.0,
        "loai_chi_phi": "Chi phí khác",
        "items": [],
        "source": source_name,
        "fuel_qty": None,
        "fuel_price": None,
        "fuel_item_name": None,
        "kh_hd": "",
        "ma_tra_cuu": "",
        "sub_total": 0.0,
        "vat_amount": 0.0
    }

    def find_val(elem, tag_name):
        if elem is None:
            return ""
        for child in elem.iter():
            local_name = child.tag.split('}')[-1] if '}' in child.tag else child.tag
            if local_name.lower() == tag_name.lower():
                return child.text.strip() if child.text else ""
        return ""

    # TTChung / General Info
    tt_chung = root.find(".//TTChung")
    if tt_chung is not None:
        invoice_data["so_hd"] = find_val(tt_chung, "SHDon")
        ngay_raw = find_val(tt_chung, "NLap")
        if ngay_raw:
            invoice_data["ngay_lap"] = ngay_raw.split('T')[0]
        # Ký hiệu mẫu số và ký hiệu hóa đơn
        khms = find_val(tt_chung, "KHMSHDon")
        kh = find_val(tt_chung, "KHHDon")
        invoice_data["kh_hd"] = f"{khms}{kh}" if khms and kh else (kh or khms)
    else:
        invoice_data["so_hd"] = find_val(root, "SHDon") or find_val(root, "InvoiceNo")
        ngay_raw = find_val(root, "NLap") or find_val(root, "InvoiceDate")
        if ngay_raw:
            invoice_data["ngay_lap"] = ngay_raw.split('T')[0]
        invoice_data["kh_hd"] = find_val(root, "KHHDon") or find_val(root, "InvoicePattern") or find_val(root, "Series") or ""

    # Mã tra cứu
    ma_tra_cuu = ""
    for tag in ["MTCau", "MaTraCuu", "LookupCode", "SearchCode", "MaTC", "MTCode", "SecretCode", "MaTCu"]:
        val = find_val(root, tag)
        if val:
            ma_tra_cuu = val
            break
    invoice_data["ma_tra_cuu"] = ma_tra_cuu

    # NBan / Seller
    n_ban = root.find(".//NBan")
    if n_ban is not None:
        invoice_data["seller_name"] = find_val(n_ban, "Ten")
        invoice_data["seller_mst"] = find_val(n_ban, "MST")
    else:
        invoice_data["seller_name"] = find_val(root, "SellerName") or find_val(root, "NBanTen")
        invoice_data["seller_mst"] = find_val(root, "SellerTaxCode") or find_val(root, "NBanMST")

    # NMua / Buyer
    n_mua = root.find(".//NMua")
    if n_mua is not None:
        invoice_data["buyer_name"] = find_val(n_mua, "Ten")
        invoice_data["buyer_mst"] = find_val(n_mua, "MST")
    else:
        invoice_data["buyer_name"] = find_val(root, "BuyerName")
        invoice_data["buyer_mst"] = find_val(root, "BuyerTaxCode")

    # THTToan / Payment Summary
    th_toan = root.find(".//THTToan")
    sub_total = 0.0
    vat_amount = 0.0
    if th_toan is not None:
        val = find_val(th_toan, "TgTTToan")
        if val:
            try:
                invoice_data["tong_tien"] = float(val)
            except ValueError:
                pass
        val_sub = find_val(th_toan, "TgTCThue")
        if val_sub:
            try:
                sub_total = float(val_sub)
            except ValueError:
                pass
        val_vat = find_val(th_toan, "TgTThue")
        if val_vat:
            try:
                vat_amount = float(val_vat)
            except ValueError:
                pass
    else:
        val = find_val(root, "TgTTToan") or find_val(root, "TotalAmount") or find_val(root, "Amount")
        if val:
            try:
                invoice_data["tong_tien"] = float(val)
            except ValueError:
                pass
        val_sub = find_val(root, "TgTCThue") or find_val(root, "SubTotal") or find_val(root, "TotalBeforeTax")
        if val_sub:
            try:
                sub_total = float(val_sub)
            except ValueError:
                pass
        val_vat = find_val(root, "TgTThue") or find_val(root, "VATAmount") or find_val(root, "TaxAmount")
        if val_vat:
            try:
                vat_amount = float(val_vat)
            except ValueError:
                pass

    invoice_data["sub_total"] = sub_total if sub_total > 0 else invoice_data["tong_tien"]
    invoice_data["vat_amount"] = vat_amount

    # Items / Line details
    h_hoa_list = root.findall(".//HHoa")
    if not h_hoa_list:
        h_hoa_list = root.findall(".//Item")
        
    has_fuel = False
    fuel_qty = 0.0
    fuel_price = 0.0
    fuel_item_name = ""

    for h_hoa in h_hoa_list:
        ten = find_val(h_hoa, "Ten") or find_val(h_hoa, "ItemName")
        sl = find_val(h_hoa, "SLuong") or find_val(h_hoa, "Quantity")
        dg = find_val(h_hoa, "DGia") or find_val(h_hoa, "UnitPrice")
        tt = find_val(h_hoa, "ThTien") or find_val(h_hoa, "Amount")

        if ten:
            item_info = {
                "ten": ten,
                "sl": float(sl) if sl else 0.0,
                "dg": float(dg) if dg else 0.0,
                "tt": float(tt) if tt else 0.0
            }
            invoice_data["items"].append(item_info)

            # Check if fuel item
            ten_lc = ten.lower()
            if any(k in ten_lc for k in ["dầu", "xăng", "diesel", " do ", "dầu do"]) or ten_lc.startswith("do"):
                has_fuel = True
                fuel_qty = item_info["sl"]
                fuel_price = item_info["dg"]
                fuel_item_name = ten

    if has_fuel:
        invoice_data["loai_chi_phi"] = "Mua dầu"
        invoice_data["fuel_qty"] = fuel_qty
        invoice_data["fuel_price"] = fuel_price
        invoice_data["fuel_item_name"] = fuel_item_name

    # Check defaults
    if not invoice_data["ngay_lap"]:
        invoice_data["ngay_lap"] = datetime.now().strftime('%Y-%m-%d')
    if not invoice_data["so_hd"]:
        invoice_data["so_hd"] = "KHD-" + datetime.now().strftime('%H%M%S')

    return invoice_data


def parse_invoice_from_html(html_content, source_name="Gmail"):
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html_content, 'html.parser')
        text = soup.get_text("\n")
        
        so_hd_match = re.search(r'(?<!m\u1eabu\s)(?<!m\u1eabu\s\n)\b(?:S\u1ed1 h\u00f3a \u0111\u01a1n|S\u1ed1 H\u0110)\s*:\s*(\d+)', text, re.IGNORECASE)
        so_hd = so_hd_match.group(1).strip() if so_hd_match else ""
        
        ngay_lap_match = re.search(r'(?:Ng\u00e0y h\u00f3a \u0111\u01a1n|Ng\u00e0y l\u1eadp):\s*([\d/:-]+)', text, re.IGNORECASE)
        ngay_lap_raw = ngay_lap_match.group(1).strip() if ngay_lap_match else ""
        
        ngay_lap = ""
        if ngay_lap_raw:
            for fmt in ('%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y'):
                try:
                    ngay_lap = datetime.strptime(ngay_lap_raw, fmt).strftime('%Y-%m-%d')
                    break
                except ValueError:
                    pass
        if not ngay_lap:
            ngay_lap = datetime.now().strftime('%Y-%m-%d')

        seller_match = re.search(r'([^\n,]+),\s*M\u00e3 s\u1ed1 thu\u1ebf\s*(\d{10,13})', text)
        if seller_match:
            seller_name = seller_match.group(1).strip()
            seller_mst = seller_match.group(2).strip()
        else:
            seller_mst_match = re.search(r'M\u00e3 s\u1ed1 thu\u1ebf\s*(\d{10,13})', text)
            seller_mst = seller_mst_match.group(1).strip() if seller_mst_match else ""
            seller_name = "Đơn vị bán lẻ xăng dầu"

        buyer_match = re.search(r'\u0111\u1ebfn Qu\u00fd kh\u00e1ch\s+([^\n,]+),\s*M\u00e3 s\u1ed1 thu\u1ebf\s*([\d\-]+)', text, re.IGNORECASE)
        if buyer_match:
            buyer_name = buyer_match.group(1).strip()
            buyer_mst = buyer_match.group(2).strip()
        else:
            buyer_name = "CHI NHÁNH MOBIFONE"
            buyer_mst = ""

        tong_tien_match = re.search(r'T\u1ed5ng ti\u1ec1n thanh to\u00e1n:\s*([\d.,]+)', text, re.IGNORECASE)
        tong_tien = 0.0
        if tong_tien_match:
            val_str = tong_tien_match.group(1).strip()
            val_clean = re.sub(r'[.,]', '', val_str)
            try:
                tong_tien = float(val_clean)
            except:
                pass

        invoice_url = ""
        for a in soup.find_all('a'):
            href = a.get('href', '')
            if 'ViewFromEmail' in href or 'DownloadInvPdf' in href or 'easyinvoice' in href:
                invoice_url = href
                break

        # Parse lookup code and symbol
        ma_tra_cuu = ""
        kh_hd = ""

        # Parse from easyinvoice URL token first (very reliable!)
        if invoice_url and 'token=' in invoice_url:
            try:
                import base64
                token = invoice_url.split('token=')[1].split('&')[0]
                token += '=' * (-len(token) % 4)
                decoded = base64.b64decode(token).decode('utf-8', errors='ignore')
                parts = decoded.split('__')
                if len(parts) >= 2:
                    kh_hd = parts[0].strip()
                    subparts = parts[1].split('|')
                    if len(subparts) >= 2:
                        if not so_hd:
                            so_hd = subparts[0].strip()
                        ma_tra_cuu = subparts[1].strip()
            except Exception as e:
                print(f"Error decoding easyinvoice token: {e}")

        # Check database for duplicate before doing slow HTTP requests
        if so_hd and seller_mst:
            try:
                existing = ParsedInvoice.query.filter_by(so_hd=so_hd, seller_mst=seller_mst).first()
                if existing:
                    return {
                        "so_hd": so_hd,
                        "ngay_lap": ngay_lap,
                        "seller_name": seller_name,
                        "seller_mst": seller_mst,
                        "buyer_name": buyer_name,
                        "buyer_mst": buyer_mst,
                        "tong_tien": tong_tien,
                        "loai_chi_phi": "Chi phí khác",
                        "items": [{"ten": f"Hóa đơn xăng dầu số {so_hd}", "sl": 1, "dg": tong_tien, "tt": tong_tien}],
                        "invoice_url": invoice_url,
                        "source": source_name,
                        "fuel_qty": None,
                        "fuel_price": None,
                        "fuel_item_name": None,
                        "kh_hd": kh_hd,
                        "ma_tra_cuu": ma_tra_cuu,
                        "sub_total": tong_tien,
                        "vat_amount": 0.0,
                        "is_duplicate": True
                    }
            except Exception as db_err:
                print(f"Database duplicate check error in parser: {db_err}")

        # Fallback to robust regexes on email text if still empty
        if not ma_tra_cuu:
            ma_tra_cuu_match = re.search(r'(?:m\u00e3 tra c\u1ee9u|m\u00e3 nh\u1eadn h\u00f3a \u0111\u01a1n|m\u00e3 b\u1ea3o m\u1eadt|m\u00e3 nh\u1eadn h\u0111|ma tra cuu|lookup code|code)\s*:\s*([A-Z0-9]+)', text, re.IGNORECASE)
            if ma_tra_cuu_match:
                ma_tra_cuu = ma_tra_cuu_match.group(1).strip()
            else:
                ma_tra_cuu_match = re.search(r'(?:m\u00e3 tra c\u1ee9u|m\u00e3 nh\u1eadn|m\u00e3 b\u1ea3o m\u1eadt)\s*[^A-Z0-9]*\s*([A-Z0-9]{6,12})', text, re.IGNORECASE)
                if ma_tra_cuu_match:
                    ma_tra_cuu = ma_tra_cuu_match.group(1).strip()

        if not kh_hd:
            kh_hd_match = re.search(r'(?:k\u00fd hi\u1ec7u m\u1eabu s\u1ed1 h\u00f3a \u0111\u01a1n|k\u00fd hi\u1ec7u m\u1eabu s\u1ed1|k\u00fd hi\u1ec7u h\u00f3a \u0111\u01a1n|k\u00fd hi\u1ec7u|ky hieu|serial|pattern)\s*:\s*([A-Z0-9/\-]+)', text, re.IGNORECASE)
            if kh_hd_match:
                kh_hd = kh_hd_match.group(1).strip()
            else:
                kh_hd_match = re.search(r'\b([1-2]?[C|K][0-9]{2}[A-Z]{3})\b', text, re.IGNORECASE)
                if kh_hd_match:
                    kh_hd = kh_hd_match.group(1).strip()

        # Deep parsing details from url
        items = []
        fuel_qty = None
        fuel_price = None
        fuel_item_name = None
        sub_total = tong_tien
        vat_amount = 0.0
        
        if invoice_url:
            try:
                import requests
                import json
                r = requests.get(invoice_url, headers={"User-Agent": "Mozilla/5.0"}, verify=False, timeout=10)
                if r.status_code == 200:
                    detail_soup = BeautifulSoup(r.text, 'html.parser')
                    inv_data_elem = detail_soup.find(id="InvData")
                    if inv_data_elem:
                        val = inv_data_elem.get('value', '')
                        data_dict = json.loads(val)
                        embedded_html = data_dict.get('str', '')
                        
                        sub_soup = BeautifulSoup(embedded_html, 'html.parser')
                        for row in sub_soup.find_all('tr'):
                            cells = [c.get_text(strip=True) for c in row.find_all(['td', 'th'])]
                            row_text = " | ".join(cells).lower()
                            if len(cells) == 6:
                                stt = cells[0]
                                if stt.isdigit():
                                    name = cells[1]
                                    unit = cells[2]
                                    qty_str = cells[3].replace(".", "").replace(",", ".").strip()
                                    price_str = cells[4].replace(".", "").replace(",", ".").strip()
                                    total_str = cells[5].replace(".", "").replace(",", ".").strip()
                                    try:
                                        qty = float(qty_str)
                                        price = float(price_str)
                                        total = float(total_str)
                                        items.append({
                                            "ten": name,
                                            "sl": qty,
                                            "dg": price,
                                            "tt": total,
                                            "dvt": unit
                                        })
                                    except:
                                        pass
                            elif "cộng tiền hàng" in row_text or "sub total" in row_text:
                                if len(cells) >= 2:
                                    try:
                                        val_clean = re.sub(r'[.,]', '', cells[-1])
                                        sub_total = float(val_clean)
                                    except:
                                        pass
                            elif "tiền thuế gtgt" in row_text or "vat amount" in row_text:
                                if len(cells) >= 2:
                                    try:
                                        val_clean = re.sub(r'[.,]', '', cells[-1])
                                        vat_amount = float(val_clean)
                                    except:
                                        pass
            except Exception as e:
                print(f"Error doing deep parse from url: {e}")

        # If we failed to parse items, use fallback single item
        if not items:
            items = [{"ten": f"Hóa đơn xăng dầu số {so_hd}", "sl": 1, "dg": tong_tien, "tt": tong_tien}]

        # Check for fuel item details
        for it in items:
            ten_lc = it["ten"].lower()
            if any(k in ten_lc for k in ["dầu", "xăng", "diesel", " do ", "dầu do"]) or ten_lc.startswith("do"):
                fuel_qty = it["sl"]
                fuel_price = it["dg"]
                fuel_item_name = it["ten"]
                break
                
        loai_chi_phi = "Mua dầu" if any(k in seller_name.lower() or k in text.lower() for k in ["xăng", "dầu", "diesel", "fuel", "do", "dầu do"]) else "Chi phí khác"

        return {
            "so_hd": so_hd,
            "ngay_lap": ngay_lap,
            "seller_name": seller_name,
            "seller_mst": seller_mst,
            "buyer_name": buyer_name,
            "buyer_mst": buyer_mst,
            "tong_tien": tong_tien,
            "loai_chi_phi": loai_chi_phi,
            "items": items,
            "invoice_url": invoice_url,
            "source": source_name,
            "fuel_qty": fuel_qty,
            "fuel_price": fuel_price,
            "fuel_item_name": fuel_item_name,
            "kh_hd": kh_hd,
            "ma_tra_cuu": ma_tra_cuu,
            "sub_total": sub_total,
            "vat_amount": vat_amount
        }
    except Exception as e:
        print(f"Error parsing HTML email body: {e}")
        return None


def fetch_gmail_emails(gmail_user, gmail_app_pass, subject_filter="Hóa đơn", limit=10):
    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(gmail_user, gmail_app_pass)
        mail.select("inbox")

        status, data = mail.uid('search', None, "ALL")
        if status != 'OK' or not data[0]:
            return []

        email_ids = data[0].split()
        recent_uids = email_ids[-50:] # scan last 50 emails
        recent_uids.reverse()

        scanned_emails = []
        keywords = [k.strip().lower() for k in subject_filter.split(';') if k.strip()]
        if not keywords:
            keywords = ["hóa đơn", "hoadon", "invoice", "e-invoice", "hddt"]

        for uid in recent_uids:
            if len(scanned_emails) >= limit:
                break
                
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
                        subject += part
            
            subj_lower = subject.lower()
            if not any(k in subj_lower for k in keywords):
                continue
                
            # From
            sender = ""
            raw_from = msg.get("From")
            if raw_from:
                decoded = decode_header(raw_from)
                for part, encoding in decoded:
                    if isinstance(part, bytes):
                        sender += part.decode(encoding or "utf-8", errors="ignore")
                    else:
                        sender += part

            # Date
            email_date = msg.get("Date") or ""

            # Fetch full message
            status, full_msg_data = mail.uid('fetch', uid, '(BODY.PEEK[])')
            if status != 'OK' or not full_msg_data[0]:
                continue
                
            full_msg = email.message_from_bytes(full_msg_data[0][1])
            attachments = []
            body_html = ""
            for part in full_msg.walk():
                c_type = part.get_content_type()
                if c_type == 'text/html':
                    body_html = part.get_payload(decode=True).decode('utf-8', errors='ignore')
                
                filename = part.get_filename()
                if filename:
                    decoded_fn = decode_header(filename)
                    fn_str = ""
                    for part_fn, enc_fn in decoded_fn:
                        if isinstance(part_fn, bytes):
                            fn_str += part_fn.decode(enc_fn or "utf-8", errors="ignore")
                        else:
                            fn_str += part_fn
                            
                    fn_lower = fn_str.lower()
                    if fn_lower.endswith('.xml') or fn_lower.endswith('.zip'):
                        attachments.append({
                            "filename": fn_str,
                            "data": part.get_payload(decode=True),
                            "uid": uid.decode()
                        })
            
            scanned_emails.append({
                "uid": uid.decode(),
                "subject": subject,
                "sender": sender,
                "date": email_date,
                "attachments": attachments,
                "body_html": body_html
            })

        mail.logout()
        return scanned_emails
    except Exception as e:
        return {"error": str(e)}


def send_telegram_invoice_notification(invoice):
    """Gửi thông báo có hóa đơn mới lên Telegram của Admin."""
    try:
        import requests
        token = os.getenv("TELEGRAM_TOKEN")
        if not token:
            return
            
        # Lấy chat_id từ DB (cấu hình của Admin)
        chat_cfg = SystemConfig.query.filter_by(key='telegram_report_chat_id').first()
        chat_id = chat_cfg.value if chat_cfg else os.getenv("TELEGRAM_CHAT_ID")
        if not chat_id:
            return
            
        # Tạo chuỗi chi tiết mặt hàng
        items_str = ""
        for it in (invoice.items_json or []):
            items_str += f"- {it.get('ten', '')} ({it.get('sl', 0):,.1f} x {it.get('dg', 0):,.0f} đ)\n"
            
        url_line = ""
        if invoice.invoice_url:
            url_line = f"\n🔗 **Link xem hóa đơn gốc:** {invoice.invoice_url}\n"
            
        message = (
            f"🧾 **PHÁT HIỆN HÓA ĐƠN MỚI**\n"
            f"• **Số HĐ:** `{invoice.so_hd}`\n"
            f"• **Ngày lập:** `{invoice.ngay_lap}`\n"
            f"• **Đơn vị bán:** *{invoice.seller_name}*\n"
            f"• **Tổng thanh toán:** `{invoice.tong_tien:,.0f} đ`\n"
            f"• **Mặt hàng:**\n{items_str.strip()}\n"
            f"{url_line}"
            f"👉 Xem trong Bảng kê Nhiên liệu trên Web."
        )
        
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": message,
            "parse_mode": "Markdown"
        }
        
        requests.post(url, json=payload, timeout=5)
    except Exception as e:
        print(f"Error sending telegram invoice notification: {e}")


# --- Blueprints Routes ---

@generator_bp.route('/invoice/settings', methods=['POST'])
@login_required
@cost_access_required
def save_invoice_settings():
    gmail_user = request.form.get('gmail_user', '').strip()
    gmail_app_password = request.form.get('gmail_app_password', '').strip()
    subject_filter = request.form.get('gmail_subject_filter', 'Hóa đơn;hoadon;invoice;hddt').strip()

    # Save to SystemConfig table
    def set_cfg(key, val, desc):
        cfg = SystemConfig.query.filter_by(key=key).first()
        if not cfg:
            cfg = SystemConfig(key=key, value=val, description=desc)
            db.session.add(cfg)
        else:
            cfg.value = val
            cfg.updated_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        cfg.updated_by = session.get('username')

    set_cfg('gmail_user', gmail_user, 'Địa chỉ Gmail để quét hóa đơn')
    if gmail_app_password:  # Only update if user enters a new one
        set_cfg('gmail_app_password', gmail_app_password, 'Mật khẩu ứng dụng Gmail (16 kí tự)')
    set_cfg('gmail_subject_filter', subject_filter, 'Từ khóa lọc tiêu đề email (phân cách bằng dấu chấm phẩy)')
    
    db.session.commit()
    flash('Đã lưu cấu hình cài đặt Gmail thành công!', 'success')
    return redirect(request.referrer or url_for('generator.generator', tab='invoice'))


@generator_bp.route('/invoice/test-connection')
@login_required
@cost_access_required
def test_invoice_connection():
    user_cfg = SystemConfig.query.filter_by(key='gmail_user').first()
    pass_cfg = SystemConfig.query.filter_by(key='gmail_app_password').first()
    
    if not user_cfg or not pass_cfg or not user_cfg.value or not pass_cfg.value:
        return jsonify({"success": False, "error": "Chưa cấu hình tài khoản Gmail và Mật khẩu ứng dụng."})

    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(user_cfg.value, pass_cfg.value)
        mail.select("inbox")
        # Get count of messages
        status, data = mail.select("INBOX")
        mail.logout()
        return jsonify({"success": True, "message": f"Kết nối Gmail thành công! Hộp thư Inbox hiện tại có {data[0].decode()} thư."})
    except Exception as e:
        return jsonify({"success": False, "error": f"Lỗi kết nối: {str(e)}"})


def scan_and_save_invoice_emails_core():
    """Core logic to scan Gmail for invoices and save them to the DB.
    Returns a dict with statistics or error string.
    """
    user_cfg = SystemConfig.query.filter_by(key='gmail_user').first()
    pass_cfg = SystemConfig.query.filter_by(key='gmail_app_password').first()
    filter_cfg = SystemConfig.query.filter_by(key='gmail_subject_filter').first()
    
    if not user_cfg or not pass_cfg or not user_cfg.value or not pass_cfg.value:
        return {"error": "Chưa cấu hình Gmail và Mật khẩu ứng dụng!"}

    subj_filter = filter_cfg.value if filter_cfg else "Hóa đơn;hoadon;invoice;hddt"
    
    # Fetch emails
    res = fetch_gmail_emails(user_cfg.value, pass_cfg.value, subj_filter, limit=40)
    if isinstance(res, dict) and "error" in res:
        return {"error": f"Lỗi khi quét email: {res['error']}"}

    new_invoices_count = 0
    scanned_count = 0

    for mail_info in res:
        sender = mail_info["sender"]
        has_xml_att = False
        
        for att in mail_info.get("attachments", []):
            filename = att["filename"]
            data = att["data"]
            
            xml_files = []
            if filename.lower().endswith('.xml'):
                xml_files.append((filename, data))
            elif filename.lower().endswith('.zip'):
                try:
                    with zipfile.ZipFile(io.BytesIO(data)) as z:
                        for zname in z.namelist():
                            if zname.lower().endswith('.xml'):
                                xml_files.append((zname, z.read(zname)))
                except Exception:
                    pass
                    
            for xml_name, xml_data in xml_files:
                scanned_count += 1
                has_xml_att = True
                parsed = parse_e_invoice_xml(xml_data, source_name=f"Gmail từ {sender}")
                if "error" in parsed:
                    continue
                    
                # Check for duplicates based on Invoice number and Seller Tax Code
                existing = ParsedInvoice.query.filter_by(
                    so_hd=parsed["so_hd"], 
                    seller_mst=parsed["seller_mst"]
                ).first()
                
                if not existing:
                    new_inv = ParsedInvoice(
                        ngay_lap=parsed["ngay_lap"],
                        so_hd=parsed["so_hd"],
                        seller_name=parsed["seller_name"],
                        seller_mst=parsed["seller_mst"],
                        buyer_name=parsed["buyer_name"],
                        buyer_mst=parsed["buyer_mst"],
                        tong_tien=parsed["tong_tien"],
                        loai_chi_phi=parsed["loai_chi_phi"],
                        items_json=parsed["items"],
                        source=parsed["source"],
                        status="Pending",
                        fuel_qty=parsed.get("fuel_qty"),
                        fuel_price=parsed.get("fuel_price"),
                        fuel_item_name=parsed.get("fuel_item_name"),
                        kh_hd=parsed.get("kh_hd"),
                        ma_tra_cuu=parsed.get("ma_tra_cuu"),
                        sub_total=parsed.get("sub_total", parsed["tong_tien"]),
                        vat_amount=parsed.get("vat_amount", 0.0),
                        invoice_url=parsed.get("invoice_url")
                    )
                    db.session.add(new_inv)
                    db.session.flush() # Flush to assign database ID
                    send_telegram_invoice_notification(new_inv)
                    new_invoices_count += 1
        
        # If no XML attachment was found/parsed, fallback to HTML parsing
        if not has_xml_att and mail_info.get("body_html"):
            parsed = parse_invoice_from_html(mail_info["body_html"], source_name=f"Gmail từ {sender}")
            if parsed and parsed.get("so_hd") and parsed.get("seller_mst"):
                scanned_count += 1
                # Check for duplicates
                existing = ParsedInvoice.query.filter_by(
                    so_hd=parsed["so_hd"], 
                    seller_mst=parsed["seller_mst"]
                ).first()
                
                if not existing:
                    new_inv = ParsedInvoice(
                        ngay_lap=parsed["ngay_lap"],
                        so_hd=parsed["so_hd"],
                        seller_name=parsed["seller_name"],
                        seller_mst=parsed["seller_mst"],
                        buyer_name=parsed["buyer_name"],
                        buyer_mst=parsed["buyer_mst"],
                        tong_tien=parsed["tong_tien"],
                        loai_chi_phi=parsed["loai_chi_phi"],
                        items_json=parsed["items"],
                        source=parsed["source"],
                        status="Pending",
                        fuel_qty=parsed.get("fuel_qty"),
                        fuel_price=parsed.get("fuel_price"),
                        fuel_item_name=parsed.get("fuel_item_name"),
                        invoice_url=parsed.get("invoice_url"),
                        kh_hd=parsed.get("kh_hd"),
                        ma_tra_cuu=parsed.get("ma_tra_cuu"),
                        sub_total=parsed.get("sub_total", parsed["tong_tien"]),
                        vat_amount=parsed.get("vat_amount", 0.0)
                    )
                    db.session.add(new_inv)
                    db.session.flush()
                    send_telegram_invoice_notification(new_inv)
                    new_invoices_count += 1

    db.session.commit()
    return {
        "scanned_count": scanned_count,
        "new_invoices_count": new_invoices_count
    }


@generator_bp.route('/invoice/scan', methods=['POST'])
@login_required
@cost_access_required
def scan_invoice_emails():
    res = scan_and_save_invoice_emails_core()
    if isinstance(res, dict) and "error" in res:
        flash(res["error"], "danger")
    else:
        scanned_count = res.get("scanned_count", 0)
        new_invoices_count = res.get("new_invoices_count", 0)
        flash(f"Quét hoàn tất! Đã kiểm tra các thư phù hợp, phát hiện {scanned_count} file hóa đơn XML, nhập mới {new_invoices_count} hóa đơn chờ duyệt.", "success")
    return redirect(request.referrer or url_for('generator.generator', tab='invoice'))


@generator_bp.route('/invoice/upload', methods=['POST'])
@login_required
@cost_access_required
def upload_invoice_xml():
    if 'invoice_files' not in request.files:
        flash('Không tìm thấy file tải lên!', 'danger')
        return redirect(request.referrer or url_for('generator.generator', tab='invoice'))
        
    files = request.files.getlist('invoice_files')
    new_invoices_count = 0
    
    for file in files:
        if not file.filename:
            continue
            
        filename = file.filename
        file_data = file.read()
        
        xml_files = []
        if filename.lower().endswith('.xml'):
            xml_files.append((filename, file_data))
        elif filename.lower().endswith('.zip'):
            try:
                with zipfile.ZipFile(io.BytesIO(file_data)) as z:
                    for zname in z.namelist():
                        if zname.lower().endswith('.xml'):
                            xml_files.append((zname, z.read(zname)))
            except Exception as e:
                flash(f'Lỗi đọc file ZIP {filename}: {str(e)}', 'danger')
                
        for xml_name, xml_data in xml_files:
            parsed = parse_e_invoice_xml(xml_data, source_name="Tải lên thủ công")
            if "error" in parsed:
                flash(f'Lỗi phân tích file XML {xml_name}: {parsed["error"]}', 'danger')
                continue
                
            # Check for duplicates
            existing = ParsedInvoice.query.filter_by(
                so_hd=parsed["so_hd"], 
                seller_mst=parsed["seller_mst"]
            ).first()
            
            if not existing:
                new_inv = ParsedInvoice(
                    ngay_lap=parsed["ngay_lap"],
                    so_hd=parsed["so_hd"],
                    seller_name=parsed["seller_name"],
                    seller_mst=parsed["seller_mst"],
                    buyer_name=parsed["buyer_name"],
                    buyer_mst=parsed["buyer_mst"],
                    tong_tien=parsed["tong_tien"],
                    loai_chi_phi=parsed["loai_chi_phi"],
                    items_json=parsed["items"],
                    source=parsed["source"],
                    status="Pending",
                    fuel_qty=parsed.get("fuel_qty"),
                    fuel_price=parsed.get("fuel_price"),
                    fuel_item_name=parsed.get("fuel_item_name"),
                    kh_hd=parsed.get("kh_hd"),
                    ma_tra_cuu=parsed.get("ma_tra_cuu"),
                    sub_total=parsed.get("sub_total", parsed["tong_tien"]),
                    vat_amount=parsed.get("vat_amount", 0.0),
                    invoice_url=parsed.get("invoice_url")
                )
                db.session.add(new_inv)
                db.session.flush()
                send_telegram_invoice_notification(new_inv)
                new_invoices_count += 1
            else:
                flash(f'Hóa đơn số {parsed["so_hd"]} của đơn vị {parsed["seller_name"]} đã tồn tại trên hệ thống.', 'warning')
                
    db.session.commit()
    if new_invoices_count > 0:
        flash(f'Đã tải lên và phân tích thành công {new_invoices_count} hóa đơn mới!', 'success')
    return redirect(request.referrer or url_for('generator.generator', tab='invoice'))


@generator_bp.route('/invoice/approve/<int:id>', methods=['POST'])
@login_required
@cost_access_required
def approve_parsed_invoice(id):
    invoice = ParsedInvoice.query.get_or_404(id)
    if invoice.status != 'Pending':
        flash('Hóa đơn này đã được xử lý trước đó.', 'warning')
        return redirect(request.referrer or url_for('generator.generator', tab='invoice'))

    # Read overridden values from form
    ngay_dung = request.form.get('ngay_lap', invoice.ngay_lap)
    loai_cp = request.form.get('loai_chi_phi', invoice.loai_chi_phi)
    so_tien_duyet = float(request.form.get('tong_tien', invoice.tong_tien) or 0)
    ghi_chu = request.form.get('ghi_chu', '')
    
    try:
        if loai_cp == 'Mua dầu':
            id_tram = request.form.get('id_tram', '').strip()
            trans_type = request.form.get('type', 'DIRECT_BUY') # DIRECT_BUY hoặc STOCK_IN
            qty = float(request.form.get('fuel_qty', invoice.fuel_qty or 0) or 0)
            price = float(request.form.get('fuel_price', invoice.fuel_price or 0) or 0)
            
            # Recalculate amount if changed
            amt = so_tien_duyet if so_tien_duyet > 0 else qty * price
            
            new_ledger = FuelLedger(
                type=trans_type,
                is_approved=True,
                ngay=ngay_dung,
                id_tram=id_tram if trans_type != 'STOCK_IN' else '',
                loai_nhien_lieu='Dầu',
                so_luong=qty,
                don_gia=price,
                thanh_tien=amt,
                nha_cung_cap=invoice.seller_name,
                nguoi_thuc_hien=session.get('full_name'),
                ghi_chu=f"Duyệt từ HĐ số {invoice.so_hd}. {ghi_chu}".strip()
            )
            
            # Update station stock if direct buy
            from generator.routes_fuel import _update_station_stock, calc_ton_sau_gd
            if trans_type == 'DIRECT_BUY' and id_tram:
                new_ledger.ton_sau_gd = calc_ton_sau_gd(id_tram, qty, trans_type)
                _update_station_stock(id_tram, qty)
                
            db.session.add(new_ledger)
        else:
            # Other expense
            # Combine item names for details
            item_names = ", ".join([it.get("ten", "") for it in (invoice.items_json or [])])
            if not item_names:
                item_names = f"Hóa đơn mua ngoài số {invoice.so_hd}"
                
            new_oe = OtherExpense(
                ngay_su_dung=ngay_dung,
                noi_dung=f"{invoice.seller_name} - {item_names}"[:500],
                so_tien=so_tien_duyet,
                nguoi_tam_ung=session.get('full_name'),
                ghi_chu=f"Duyệt từ HĐ số {invoice.so_hd}. {ghi_chu}".strip()
            )
            db.session.add(new_oe)
            
        invoice.status = 'Approved'
        db.session.commit()
        flash('Đã duyệt hóa đơn và ghi nhận vào sổ sách thành công!', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Lỗi khi duyệt hóa đơn: {str(e)}', 'danger')
        
    return redirect(request.referrer or url_for('generator.generator', tab='invoice'))


@generator_bp.route('/invoice/discard/<int:id>', methods=['POST'])
@login_required
@cost_access_required
def discard_parsed_invoice(id):
    invoice = ParsedInvoice.query.get_or_404(id)
    invoice.status = 'Discarded'
    db.session.commit()
    flash('Đã bỏ qua hóa đơn này.', 'success')
    return redirect(request.referrer or url_for('generator.generator', tab='invoice'))


@generator_bp.route('/invoice/export')
@login_required
@cost_access_required
def export_invoices():
    now = datetime.now()
    year = request.args.get('year', type=int, default=now.year)
    month_raw = request.args.get('month', '')
    month = int(month_raw) if month_raw.strip() else None
    
    if month:
        start_date = f"{year}-{month:02d}-01"
        end_date = f"{year}-{month+1:02d}-01" if month < 12 else f"{year+1}-01-01"
    else:
        start_date = f"{year}-01-01"
        end_date = f"{year+1}-01-01"
        
    invoices = ParsedInvoice.query.filter(
        ParsedInvoice.ngay_lap >= start_date,
        ParsedInvoice.ngay_lap < end_date,
        ParsedInvoice.status != 'Discarded'
    ).order_by(ParsedInvoice.ngay_lap.asc(), ParsedInvoice.id.asc()).all()
    
    daily_totals = {}
    for inv in invoices:
        daily_totals[inv.ngay_lap] = daily_totals.get(inv.ngay_lap, 0.0) + inv.tong_tien
        
    rows = []
    for idx, inv in enumerate(invoices, 1):
        fd = inv.fuel_details
        is_warn = daily_totals.get(inv.ngay_lap, 0.0) > 5000000
        note = "*Cần chuyển khoản*" if is_warn else ""
        
        rows.append({
            "STT": idx,
            "Cửa hàng xăng dầu": inv.seller_name,
            "Link tra cứu": inv.invoice_url or "",
            "Mã tra cứu": inv.ma_tra_cuu or "",
            "Loại NL": fd.get("loai_nl", ""),
            "Mã số thuế": inv.seller_mst or "",
            "KH hóa đơn": inv.kh_hd or "",
            "Số Hóa đơn": inv.so_hd or "",
            "Ngày tháng": inv.ngay_lap,
            "Số lượng D (lít)": fd.get("qty_d") or "",
            "Đơn giá D": fd.get("price_d") or "",
            "Thành tiền D": fd.get("amount_d") or "",
            "Số lượng X (lít)": fd.get("qty_x") or "",
            "Đơn giá X": fd.get("price_x") or "",
            "Thành tiền X": fd.get("amount_x") or "",
            "Cộng chưa VAT": inv.sub_total or inv.tong_tien or 0,
            "Thuế VAT": inv.vat_amount or 0,
            "Tổng tiền": inv.tong_tien or 0,
            "Người mua hàng": inv.buyer_name or "",
            "MST Người mua": inv.buyer_mst or "",
            "Note": note
        })
        
    import pandas as pd
    from io import BytesIO
    from flask import send_file
    
    df = pd.DataFrame(rows)
    if df.empty:
        df = pd.DataFrame(columns=[
            "STT", "Cửa hàng xăng dầu", "Link tra cứu", "Mã tra cứu", "Loại NL", 
            "Mã số thuế", "KH hóa đơn", "Số Hóa đơn", "Ngày tháng", 
            "Số lượng D (lít)", "Đơn giá D", "Thành tiền D", 
            "Số lượng X (lít)", "Đơn giá X", "Thành tiền X", 
            "Cộng chưa VAT", "Thuế VAT", "Tổng tiền", 
            "Người mua hàng", "MST Người mua", "Note"
        ])
        
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Sheet1')
    output.seek(0)
    
    month_str = f"T{month}" if month else "CaNam"
    filename = f"Bang_ke_hoa_don_nhien_lieu_{month_str}_{year}.xlsx"
    return send_file(output, download_name=filename, as_attachment=True)


@generator_bp.route('/api/invoice/summary')
@login_required
def invoice_summary_api():
    """API trả tổng kê nhiên liệu tháng hiện tại để hiển thị trên dashboard."""
    now = datetime.now()
    year = request.args.get('year', type=int, default=now.year)
    month_raw = request.args.get('month', str(now.month))
    try:
        month = int(month_raw) if month_raw.strip() else now.month
    except (ValueError, TypeError):
        month = now.month

    start_date = f"{year}-{month:02d}-01"
    end_date = f"{year}-{month+1:02d}-01" if month < 12 else f"{year+1}-01-01"

    invoices = ParsedInvoice.query.filter(
        ParsedInvoice.ngay_lap >= start_date,
        ParsedInvoice.ngay_lap < end_date,
        ParsedInvoice.status != 'Discarded'
    ).all()

    total_qty_d = 0.0
    total_qty_x = 0.0
    total_sub = 0.0
    total_vat = 0.0
    total_grand = 0.0
    daily_totals = {}

    for inv in invoices:
        fd = inv.fuel_details
        total_qty_d += fd.get('qty_d', 0.0) or 0.0
        total_qty_x += fd.get('qty_x', 0.0) or 0.0
        total_sub += inv.sub_total or inv.tong_tien or 0.0
        total_vat += inv.vat_amount or 0.0
        total_grand += inv.tong_tien or 0.0
        date_str = inv.ngay_lap or ''
        if date_str:
            daily_totals[date_str] = daily_totals.get(date_str, 0.0) + (inv.tong_tien or 0.0)

    warn_days = [d for d, t in daily_totals.items() if t > 5_000_000]

    return jsonify({
        'month': month,
        'year': year,
        'invoice_count': len(invoices),
        'qty_d': round(total_qty_d, 1),
        'qty_x': round(total_qty_x, 1),
        'sub_total': round(total_sub, 0),
        'vat_amount': round(total_vat, 0),
        'grand_total': round(total_grand, 0),
        'warn_days': sorted(warn_days),
        'warn_count': len(warn_days)
    })
