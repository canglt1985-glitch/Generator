import imaplib
import email
from email.header import decode_header
import zipfile
import io
import re
import os
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
import uuid
import logging
import requests
from dotenv import load_dotenv
from supabase import create_client, Client
import sys

logger = logging.getLogger("invoice_worker")

# Configure stdout encoding
sys.stdout.reconfigure(encoding="utf-8")

# 1. Environment & Supabase V2 Client Configuration
current_dir = os.path.dirname(os.path.abspath(__file__))
# Load env
load_dotenv(os.path.join(current_dir, '.env'))
if not os.getenv("VITE_SUPABASE_URL"):
    parent_dir = os.path.dirname(current_dir)
    load_dotenv(os.path.join(parent_dir, 'tvt3_v2', '.env'))

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("❌ ERROR: Missing Supabase credentials in environment variables.")
    supabase = None
else:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 2. Local Configuration Helper
CONFIG_FILE = os.path.join(current_dir, 'data', 'system_config.json')

def load_system_config() -> dict:
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to read system config: {e}")
    return {}

def get_config_value(key, default=None):
    cfg = load_system_config()
    return cfg.get(key, default)

# 3. Helper to parse XML electronic invoice content (TCT schema & fallbacks)
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

    if has_fuel:
        invoice_data["loai_chi_phi"] = "Mua dầu"

    # Check defaults
    if not invoice_data["ngay_lap"]:
        invoice_data["ngay_lap"] = datetime.now().strftime('%Y-%m-%d')
    if not invoice_data["so_hd"]:
        invoice_data["so_hd"] = "KHD-" + datetime.now().strftime('%H%M%S')

    return invoice_data


# 4. Helper to parse invoice from HTML email bodies
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
                logger.error(f"Error decoding easyinvoice token: {e}")

        # Check database for duplicate before doing slow HTTP requests
        if so_hd and seller_mst and supabase:
            try:
                invoice_id = str(uuid.uuid5(uuid.NAMESPACE_OID, f"invoice_{so_hd}_{seller_mst}"))
                res_exist = supabase.table("parsed_invoices").select("id").eq("id", invoice_id).execute()
                if res_exist.data:
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
                        "kh_hd": kh_hd,
                        "ma_tra_cuu": ma_tra_cuu,
                        "sub_total": tong_tien,
                        "vat_amount": 0.0,
                        "is_duplicate": True
                    }
            except Exception as db_err:
                logger.error(f"Database duplicate check error in parser: {db_err}")

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
                logger.error(f"Error doing deep parse from url: {e}")

        # If we failed to parse items, use fallback single item
        if not items:
            items = [{"ten": f"Hóa đơn xăng dầu số {so_hd}", "sl": 1, "dg": tong_tien, "tt": tong_tien}]
                
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
            "kh_hd": kh_hd,
            "ma_tra_cuu": ma_tra_cuu,
            "sub_total": sub_total,
            "vat_amount": vat_amount,
            "is_duplicate": False
        }
    except Exception as e:
        logger.error(f"Error parsing HTML email body: {e}")
        return None


# 5. Fetch emails from Gmail
def fetch_gmail_emails(gmail_user, gmail_app_pass, subject_filter="Hóa đơn", days_back=3, limit=30):
    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(gmail_user, gmail_app_pass)
        mail.select("inbox")

        # Set up date filter
        since_date = datetime.now() - timedelta(days=days_back)
        since_str = since_date.strftime("%d-%b-%Y") # e.g. 14-Jun-2026
        
        status, data = mail.uid('search', None, f'SINCE {since_str}')
        if status != 'OK' or not data[0]:
            mail.logout()
            return []

        email_ids = data[0].split()
        recent_uids = email_ids
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
            
            # Check Date range
            email_date = msg.get("Date") or ""
            is_within_range = False
            if email_date:
                try:
                    from email.utils import parsedate_to_datetime
                    email_dt = parsedate_to_datetime(email_date)
                    if email_dt.astimezone().date() >= since_date.date():
                        is_within_range = True
                except Exception as ex:
                    logger.warning(f"Error parsing email date {email_date}: {ex}")
            
            if not is_within_range:
                continue

            # Subject check
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
        logger.error(f"Gmail connection/search error: {e}")
        return {"error": str(e)}


# 6. Send Telegram notification for new invoice
def send_telegram_invoice_notification(invoice_payload):
    try:
        token = get_config_value("telegram_bot_token") or os.getenv("TELEGRAM_TOKEN")
        if not token:
            return
            
        chat_id = get_config_value('telegram_report_chat_id') or os.getenv("TELEGRAM_CHAT_ID")
        if not chat_id:
            logger.warning("Invoice Worker: Telegram chat ID not configured.")
            return
            
        items_str = ""
        for it in (invoice_payload.get("items") or []):
            items_str += f"- {it.get('ten', '')} ({it.get('sl', 0):,.1f} x {it.get('dg', 0):,.0f} đ)\n"
            
        url_line = ""
        if invoice_payload.get("invoice_url"):
            url_line = f"\n🔗 **Link xem hóa đơn gốc:** {invoice_payload['invoice_url']}\n"
            
        message = (
            f"🧾 **PHÁT HIỆN HÓA ĐƠN MỚI (V2)**\n"
            f"• **Số HĐ:** `{invoice_payload['invoice_number']}`\n"
            f"• **Ngày lập:** `{invoice_payload['invoice_date']}`\n"
            f"• **Đơn vị bán:** *{invoice_payload['seller_name']}*\n"
            f"• **Tổng thanh toán:** `{invoice_payload['total_amount']:,.0f} đ`\n"
            f"• **Mặt hàng:**\n{items_str.strip()}\n"
            f"{url_line}"
            f"\n👉 Xem trong Bảng kê Nhiên liệu trên Web."
        )
        
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": message,
            "parse_mode": "Markdown"
        }
        
        r = requests.post(url, json=payload, timeout=5)
        logger.info(f"Telegram notification status: {r.status_code}")
    except Exception as e:
        logger.error(f"Error sending telegram invoice notification: {e}")


# 7. Core Job Execution
def scan_invoices_job():
    logger.info("Invoice Worker: 🔍 Starting Gmail invoice scan job...")
    
    gmail_user = get_config_value("gmail_user") or os.getenv("GMAIL_USER")
    gmail_app_pass = get_config_value("gmail_app_password") or os.getenv("GMAIL_APP_PASSWORD")
    subject_filter = os.getenv("GMAIL_SUBJECT_FILTER") or "Hóa đơn;hoadon;invoice;hddt"
    
    if not gmail_user or not gmail_app_pass:
        logger.warning("Invoice Worker: ⚠️ Gmail credentials missing in environment variables. Skipping scan.")
        return {"error": "Gmail credentials not configured"}
        
    emails = fetch_gmail_emails(gmail_user, gmail_app_pass, subject_filter, days_back=3)
    if isinstance(emails, dict) and "error" in emails:
        logger.error(f"Invoice Worker: Email fetch error: {emails['error']}")
        return emails
        
    logger.info(f"Invoice Worker: Retrieved {len(emails)} emails matching filter.")
    
    new_invoices_count = 0
    scanned_count = 0
    
    for mail_info in emails:
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
                except Exception as ex:
                    logger.warning(f"Failed to unzip {filename}: {ex}")
                    
            for xml_name, xml_data in xml_files:
                scanned_count += 1
                has_xml_att = True
                parsed = parse_e_invoice_xml(xml_data, source_name=f"Gmail từ {sender}")
                if "error" in parsed:
                    logger.warning(f"XML parse error for {xml_name}: {parsed['error']}")
                    continue
                    
                # Deterministic UUID5 for idempotency
                invoice_id = str(uuid.uuid5(uuid.NAMESPACE_OID, f"invoice_{parsed['so_hd']}_{parsed['seller_mst']}"))
                
                try:
                    if supabase:
                        res_exist = supabase.table("parsed_invoices").select("id").eq("id", invoice_id).execute()
                        if res_exist.data:
                            continue
                            
                        payload = {
                            "id": invoice_id,
                            "invoice_date": parsed["ngay_lap"],
                            "invoice_number": parsed["so_hd"],
                            "seller_name": parsed["seller_name"],
                            "seller_mst": parsed["seller_mst"],
                            "buyer_name": parsed["buyer_name"],
                            "buyer_mst": parsed["buyer_mst"],
                            "total_amount": parsed["tong_tien"],
                            "expense_type": parsed["loai_chi_phi"],
                            "items": parsed["items"],
                            "source": parsed["source"],
                            "status": "Approved",
                            "invoice_url": parsed.get("invoice_url"),
                            "kh_hd": parsed.get("kh_hd"),
                            "ma_tra_cuu": parsed.get("ma_tra_cuu"),
                            "sub_total": parsed.get("sub_total"),
                            "vat_amount": parsed.get("vat_amount")
                        }
                        
                        supabase.table("parsed_invoices").insert(payload).execute()
                        logger.info(f"✅ XML success: Inserted invoice {parsed['so_hd']} from {parsed['seller_name']}")
                        send_telegram_invoice_notification(payload)
                        new_invoices_count += 1
                except Exception as db_err:
                    logger.error(f"Failed to process XML invoice: {db_err}")
                    
        # Fallback to HTML body parse
        if not has_xml_att and mail_info.get("body_html"):
            parsed = parse_invoice_from_html(mail_info["body_html"], source_name=f"Gmail từ {sender}")
            if parsed and parsed.get("so_hd") and parsed.get("seller_mst") and not parsed.get("is_duplicate"):
                scanned_count += 1
                invoice_id = str(uuid.uuid5(uuid.NAMESPACE_OID, f"invoice_{parsed['so_hd']}_{parsed['seller_mst']}"))
                
                try:
                    if supabase:
                        res_exist = supabase.table("parsed_invoices").select("id").eq("id", invoice_id).execute()
                        if res_exist.data:
                            continue
                            
                        payload = {
                            "id": invoice_id,
                            "invoice_date": parsed["ngay_lap"],
                            "invoice_number": parsed["so_hd"],
                            "seller_name": parsed["seller_name"],
                            "seller_mst": parsed["seller_mst"],
                            "buyer_name": parsed["buyer_name"],
                            "buyer_mst": parsed["buyer_mst"],
                            "total_amount": parsed["tong_tien"],
                            "expense_type": parsed["loai_chi_phi"],
                            "items": parsed["items"],
                            "source": parsed["source"],
                            "status": "Approved",
                            "invoice_url": parsed.get("invoice_url"),
                            "kh_hd": parsed.get("kh_hd"),
                            "ma_tra_cuu": parsed.get("ma_tra_cuu"),
                            "sub_total": parsed.get("sub_total"),
                            "vat_amount": parsed.get("vat_amount")
                        }
                        
                        supabase.table("parsed_invoices").insert(payload).execute()
                        logger.info(f"✅ HTML success: Inserted invoice {parsed['so_hd']} from {parsed['seller_name']}")
                        send_telegram_invoice_notification(payload)
                        new_invoices_count += 1
                except Exception as db_err:
                    logger.error(f"Failed to process HTML invoice: {db_err}")
                    
    logger.info(f"Invoice Worker: Job finished. Scanned: {scanned_count}, New: {new_invoices_count}")
    return {"scanned_count": scanned_count, "new_invoices_count": new_invoices_count}


if __name__ == '__main__':
    # Configure stdout formatting and debug level
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    logger.info("Starting manual invoice scanner execution...")
    scan_invoices_job()
