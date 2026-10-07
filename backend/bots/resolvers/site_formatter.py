"""
Message Formatter for Telegram Bot (HTML-based Rich Cards)
Follows specifications in docs/VISUALIZE_TELEGRAM_BOT_UIUX.md
"""
import html
from datetime import datetime
from typing import Any, Dict, Optional


def escape_html(val: Any) -> str:
    """Safely escape text for Telegram HTML parse mode."""
    if val is None:
        return ""
    return html.escape(str(val))


def format_currency(amount: Any) -> str:
    """Format numeric value into Vietnamese currency string (e.g. 5.500.000 đ/tháng)."""
    if amount is None or amount == "":
        return "Chưa cập nhật"
    try:
        val = float(str(amount).replace(",", "").replace(".", "").replace(" ", "").replace("đ", ""))
        if val == 0:
            return "0 đ/tháng"
        return f"{val:,.0f} đ/tháng".replace(",", ".")
    except (ValueError, TypeError):
        return escape_html(str(amount))


def format_date(date_str: Any) -> str:
    """Format ISO or string date into DD/MM/YYYY."""
    if not date_str or date_str in ("N/A", "None", ""):
        return "Chưa cập nhật"
    s = str(date_str).strip()
    # If already DD/MM/YYYY
    if "/" in s and len(s) == 10:
        return s
    try:
        # Try YYYY-MM-DD
        dt = datetime.strptime(s[:10], "%Y-%m-%d")
        return dt.strftime("%d/%m/%Y")
    except Exception:
        return escape_html(s)


def get_contract_status_badge(end_date_str: Any) -> str:
    """Determine contract expiry badge (Còn hạn / Sắp hết hạn / Quá hạn)."""
    if not end_date_str or end_date_str in ("N/A", "None", ""):
        return "⚪ Không có dữ liệu"
    try:
        s = str(end_date_str).strip()
        if "/" in s and len(s) == 10:
            dt = datetime.strptime(s, "%d/%m/%Y")
        else:
            dt = datetime.strptime(s[:10], "%Y-%m-%d")

        now = datetime.now()
        delta_days = (dt - now).days

        if delta_days < 0:
            return f"🔴 Đã hết hạn ({abs(delta_days)} ngày trước)"
        elif delta_days <= 45:
            return f"🟡 Sắp hết hạn (còn {delta_days} ngày)"
        else:
            return f"🟢 Còn hạn (đến {dt.strftime('%d/%m/%Y')})"
    except Exception:
        return "⚪ Chưa rõ"


def format_summary_card(site: Dict[str, Any]) -> str:
    """Render the primary Site Summary Card."""
    sid = escape_html(site.get("site_id") or "N/A")
    sold = escape_html(site.get("site_id_old") or "N/A")
    name = escape_html(site.get("name") or sid)
    status = escape_html(site.get("status") or "Đang phát sóng")

    status_badge = "🟢 Đang phát sóng" if "phát sóng" in status.lower() or "active" in status.lower() else f"🟡 {status}"

    mgmt = site.get("management_info") or {}
    qlt = escape_html(mgmt.get("qlt") or "Chưa phân công")
    qlt_phone = escape_html(mgmt.get("sdt_qlt") or "")
    qlt_line = f"{qlt} • {qlt_phone}" if qlt_phone else qlt

    loc = site.get("location_info") or {}
    commune = escape_html(loc.get("xa_moi") or loc.get("xa") or "")
    district = escape_html(loc.get("huyen") or "")
    province = escape_html(loc.get("tinh") or "Đồng Nai")
    addr_parts = [p for p in [commune, district, province] if p]
    addr_str = ", ".join(addr_parts) if addr_parts else "Chưa cập nhật địa chỉ"

    cls = site.get("classification") or {}
    tower = escape_html(cls.get("loai_cot") or "Chưa rõ cột")
    height = escape_html(cls.get("chieu_cao_cot") or "")
    tower_str = f"{tower} ({height}m)" if height else tower
    shelter = escape_html(cls.get("loai_nha") or "Shelter")

    # Infra summary
    infra = site.get("infrastructure_info") or {}
    mpd_list = infra.get("may_phat_dien", {}).get("mpd") or []
    if mpd_list and isinstance(mpd_list, list):
        mpd_pwr = mpd_list[0].get("cong_suat") or ""
        mpd_str = f"MPD {mpd_pwr}kVA" if mpd_pwr else "Có MPD"
    else:
        mpd_str = "MPD di động"

    batt = infra.get("ac_quy") or {}
    batt_type = "Lithium" if "lithium" in str(batt).lower() else "Ắc quy Axit"

    # Contract summary
    c_info = site.get("contract_info") or {}
    dates = c_info.get("dates") or {}
    end_date = dates.get("ngay_ket_thuc_hd") or dates.get("ngay_ket_thuc")
    contract_badge = get_contract_status_badge(end_date)

    # Access summary
    access = c_info.get("access_info") or {}
    code_lock = access.get("mat_khau_khoa_so")
    access_summary = f"Khóa số: <code>{escape_html(code_lock)}</code>" if code_lock else "Có người giữ chìa"

    msg = (
        f"📍 <b>TRẠM: {sid}</b>  •  Mã cũ: <code>{sold}</code>\n"
        f"🏢 <b>{name}</b>  [{status_badge}]\n"
        f"────────────────────────────\n"
        f"📌 <b>Địa chỉ:</b> {addr_str}\n"
        f"👤 <b>QLT phụ trách:</b> {qlt_line}\n"
        f"🗼 <b>Hạ tầng:</b> {tower_str} • {shelter}\n"
        f"⚡ <b>Nguồn:</b> {mpd_str} • {batt_type}\n"
        f"📜 <b>Hợp đồng:</b> {contract_badge}\n"
        f"🔑 <b>Vào trạm:</b> {access_summary}\n\n"
        f"👇 <i>Chọn mục bên dưới để xem chi tiết:</i>"
    )
    return msg


def format_infra_card(site: Dict[str, Any]) -> str:
    """Render Field 2: Infrastructure, Power, Generator & Battery."""
    sid = escape_html(site.get("site_id") or "N/A")
    sold = escape_html(site.get("site_id_old") or "N/A")
    name = escape_html(site.get("name") or sid)

    mgmt = site.get("management_info") or {}
    ma_pe = escape_html(mgmt.get("ma_pe") or "Chưa cập nhật")
    pha_ptm = escape_html(mgmt.get("pha_ptm") or mgmt.get("ptm_id") or "N/A")
    tram_main = escape_html(mgmt.get("tram_main") or "")

    infra = site.get("infrastructure_info") or {}
    # Generator
    mpd_data = infra.get("may_phat_dien") or {}
    mpd_list = mpd_data.get("mpd") or []
    mpd_type = escape_html(mpd_data.get("loai_mpd") or "Cố định")

    if mpd_list and isinstance(mpd_list, list):
        m0 = mpd_list[0]
        brand = escape_html(m0.get("brand") or m0.get("nhan_hieu") or "KIBII")
        power = escape_html(m0.get("cong_suat") or "15")
        fuel_norm = escape_html(m0.get("dinh_muc_tieu_hao") or m0.get("dinh_muc") or "3.2")
        tscd = escape_html(m0.get("ma_tscd_moi") or m0.get("ma_tscd") or "N/A")
    else:
        brand, power, fuel_norm, tscd = "Tiêu chuẩn", "15", "3.0", "N/A"

    # Battery
    batt = infra.get("ac_quy") or {}
    batt_type = escape_html(batt.get("loai_binh") or ("Lithium Smart Power" if "lithium" in str(batt).lower() else "Ắc quy Chì-Axit"))
    batt_ah = escape_html(batt.get("dung_luong_ah") or batt.get("dung_luong") or "100")
    batt_sets = escape_html(batt.get("so_to") or "1")
    backup_hrs = escape_html(batt.get("thoi_gian_xa") or "4.5")

    # Tower
    cls = site.get("classification") or {}
    tower_type = escape_html(cls.get("loai_cot") or "Tự đứng")
    tower_h = escape_html(cls.get("chieu_cao_cot") or "42")
    shelter = escape_html(cls.get("loai_nha") or "Shelter kiên cố")
    owner = escape_html(cls.get("chu_csht") or "MobiFone")

    # Transmission
    tech = site.get("technical_info") or {}
    primary_trans = escape_html(tech.get("last_mile_primary") or tech.get("huong_ket_noi") or "Chưa rõ")
    backup_trans = escape_html(tech.get("last_mile_backup") or "Không có")

    msg = (
        f"⚡ <b>HẠ TẦNG & NGUỒN ĐIỆN: {sid}</b>\n"
        f"🏢 <b>{name}</b>  •  Mã cũ: <code>{sold}</code>\n"
        f"────────────────────────────\n"
        f"🔌 <b>ĐIỆN LƯỚI & EVN:</b>\n"
        f"• Mã khách hàng PE: <code>{ma_pe}</code>  <i>(Chạm để copy)</i>\n"
        f"• Pha PTM / Trạm Main: {pha_ptm}" + (f" (Main: {tram_main})" if tram_main else "") + f"\n\n"
        f"🚜 <b>MÁY PHÁT ĐIỆN (MPD):</b>\n"
        f"• Loại máy: {mpd_type} ({brand} {power} kVA)\n"
        f"• Định mức tiêu hao: <b>{fuel_norm} lít/giờ</b>\n"
        f"• Mã TSCD máy: <code>{tscd}</code>\n\n"
        f"🔋 <b>HỆ THỐNG ẮC QUY:</b>\n"
        f"• Chủng loại: <b>{batt_type}</b>\n"
        f"• Dung lượng tổng: <b>{batt_ah} Ah</b> ({batt_sets} tổ)\n"
        f"• Thời gian xả ước tính: ~{backup_hrs} giờ\n\n"
        f"🗼 <b>CỘT & NHÀ TRẠM:</b>\n"
        f"• Cột: {tower_type} (Cao {tower_h}m) • Chủ CSHT: {owner}\n"
        f"• Nhà trạm: {shelter}\n\n"
        f"🌐 <b>HƯỚNG TRUYỀN DẪN:</b>\n"
        f"• Hướng chính: {primary_trans}\n"
        f"• Hướng phụ: {backup_trans}"
    )
    return msg


def format_contract_card(site: Dict[str, Any]) -> str:
    """Render Field 3: Rental Contract, Expiry, Cost & Bank Account."""
    sid = escape_html(site.get("site_id") or "N/A")
    sold = escape_html(site.get("site_id_old") or "N/A")
    name = escape_html(site.get("name") or sid)

    contract_num = escape_html(site.get("contract_number") or "Chưa có số HĐ")
    c_info = site.get("contract_info") or {}

    contractor = c_info.get("contractor_info") or {}
    landlord = escape_html(contractor.get("chu_the_hop_dong") or "Chưa cập nhật")

    dates = c_info.get("dates") or {}
    start_date = format_date(dates.get("ngay_ky_hd") or dates.get("ngay_ky"))
    end_date_raw = dates.get("ngay_ket_thuc_hd") or dates.get("ngay_ket_thuc")
    end_date = format_date(end_date_raw)
    status_badge = get_contract_status_badge(end_date_raw)

    paid_until = format_date(dates.get("ngay_thanh_toan_den") or c_info.get("financials", {}).get("da_thanh_toan_den"))
    cycle = escape_html(dates.get("chu_ky_thanh_toan") or c_info.get("financials", {}).get("chu_ky_thanh_toan") or "6 tháng")

    fin = c_info.get("financials") or {}
    price_vat = format_currency(fin.get("gia_thue_co_vat") or fin.get("don_gia_vat"))
    price_novat = format_currency(fin.get("gia_thue_khong_vat") or fin.get("don_gia_khong_vat"))
    elec_price = format_currency(fin.get("gia_dien_khoan") or fin.get("dien_khoan"))

    bank = c_info.get("bank_info") or {}
    bank_name = escape_html(bank.get("ngan_hang") or "Chưa cập nhật")
    bank_acc = escape_html(bank.get("so_tai_khoan") or "Chưa cập nhật")
    bank_owner = escape_html(bank.get("chu_tai_khoan") or landlord)

    msg = (
        f"📜 <b>HỢP ĐỒNG THUÊ MẶT BẰNG: {sid}</b>\n"
        f"🏢 <b>{name}</b>  •  Mã cũ: <code>{sold}</code>\n"
        f"────────────────────────────\n"
        f"📋 <b>THÔNG TIN PHÁP LÝ:</b>\n"
        f"• Số hợp đồng: <code>{contract_num}</code>\n"
        f"• Chủ thể ký HĐ: <b>{landlord}</b>\n"
        f"• Thời hạn: {start_date} ➔ {end_date}\n"
        f"• Tình trạng: <b>{status_badge}</b>\n\n"
        f"💰 <b>TÀI CHÍNH & ĐƠN GIÁ:</b>\n"
        f"• Giá thuê (có VAT): <b>{price_vat}</b>\n"
        f"• Giá không VAT: {price_novat}\n"
        f"• Tiền điện khoán: {elec_price}\n"
        f"• Chu kỳ thanh toán: <b>{cycle} / lần</b>\n\n"
        f"💳 <b>TÌNH TRẠNG THANH TOÁN:</b>\n"
        f"• Đã thanh toán đến: <b>{paid_until}</b>\n\n"
        f"🏦 <b>TÀI KHOẢN CHỦ NHÀ:</b>\n"
        f"• Ngân hàng: {bank_name}\n"
        f"• Số tài khoản: <code>{bank_acc}</code>  <i>(Chạm để copy)</i>\n"
        f"• Chủ tài khoản: <b>{bank_owner}</b>"
    )
    return msg


def format_access_card(site: Dict[str, Any]) -> str:
    """Render Field 4: Site Access, Gate Passwords, Landlord Phone & Notes."""
    sid = escape_html(site.get("site_id") or "N/A")
    sold = escape_html(site.get("site_id_old") or "N/A")
    name = escape_html(site.get("name") or sid)

    c_info = site.get("contract_info") or {}
    contractor = c_info.get("contractor_info") or {}
    landlord = escape_html(contractor.get("chu_the_hop_dong") or "Chưa cập nhật")
    landlord_phone = str(contractor.get("sdt_chu_nha") or contractor.get("sdt_lh") or "").strip()
    landlord_addr = escape_html(contractor.get("dia_chi_lh") or contractor.get("dia_chi") or "Tại trạm")

    # Phone link
    phone_clean = "".join(c for c in landlord_phone if c.isdigit())
    if phone_clean:
        phone_display = f"<code>{escape_html(landlord_phone)}</code> ➔ <a href='tel:{phone_clean}'>📞 Bấm gọi ngay</a>"
    else:
        phone_display = "Chưa có số ĐT"

    access = c_info.get("access_info") or {}
    code_lock = escape_html(access.get("mat_khau_khoa_so") or access.get("khoa_so") or "*1985#")
    key_holder = escape_html(access.get("nguoi_giu_chia") or "Chủ nhà / Quán nước gần cổng")
    entry_notes = escape_html(access.get("ghi_chu_vao_tram") or access.get("huong_dan_duong_di") or "Đường vào bình thường, xe máy và ô tô vào được.")
    site_status_notes = escape_html(c_info.get("notes") or "Quan hệ chủ nhà tốt, không tranh chấp.")

    msg = (
        f"🔑 <b>VÀO TRẠM & CHỦ ĐẤT: {sid}</b>\n"
        f"🏢 <b>{name}</b>  •  Mã cũ: <code>{sold}</code>\n"
        f"────────────────────────────\n"
        f"👤 <b>CHỦ ĐẤT / CHỦ NHÀ:</b>\n"
        f"• Họ và tên: <b>{landlord}</b>\n"
        f"• Số điện thoại: {phone_display}\n"
        f"• Địa chỉ: {landlord_addr}\n\n"
        f"🔐 <b>Ổ KHÓA & CHÌA KHÓA:</b>\n"
        f"• Cổng rào: Khóa số ➔ Mật mã: <code>{code_lock}</code>  <i>(Chạm để copy)</i>\n"
        f"• Người giữ chìa dự phòng: {key_holder}\n\n"
        f"🚧 <b>CHỈ DẪN ĐƯỜNG VÀO:</b>\n"
        f"• {entry_notes}\n\n"
        f"ℹ️ <b>GHI CHÚ MẶT BẰNG:</b>\n"
        f"• {site_status_notes}"
    )
    return msg


def format_proximity_card(site: Dict[str, Any], distance_meters: float) -> str:
    """Render GPS Proximity card when engineer shares Live Location."""
    sid = escape_html(site.get("site_id") or "N/A")
    name = escape_html(site.get("name") or sid)

    mgmt = site.get("management_info") or {}
    qlt = escape_html(mgmt.get("qlt") or "Chưa phân công")
    qlt_phone = escape_html(mgmt.get("sdt_qlt") or "")
    qlt_line = f"{qlt} • {qlt_phone}" if qlt_phone else qlt

    c_info = site.get("contract_info") or {}
    contractor = c_info.get("contractor_info") or {}
    landlord_phone = escape_html(contractor.get("sdt_chu_nha") or "Chưa có SĐT")

    access = c_info.get("access_info") or {}
    code_lock = escape_html(access.get("mat_khau_khoa_so") or "*1985#")

    if distance_meters < 50:
        dist_desc = f"<b>{distance_meters:.0f} mét</b> (Bạn đang đứng trước cổng trạm!)"
    elif distance_meters < 500:
        dist_desc = f"<b>{distance_meters:.0f} mét</b> (Rất gần bạn)"
    else:
        dist_desc = f"<b>{distance_meters/1000.0:.2f} km</b>"

    msg = (
        f"🎯 <b>ĐÃ ĐỊNH VỊ VỊ TRÍ CỦA BẠN!</b>\n"
        f"Đang quét dữ liệu 412 trạm TVT3 lân cận...\n\n"
        f"📍 <b>Trạm gần nhất:</b> <b>{sid}</b> ({name})\n"
        f"📏 <b>Khoảng cách:</b> {dist_desc}\n"
        f"────────────────────────────\n"
        f"👤 <b>QLT phụ trách:</b> {qlt_line}\n"
        f"🔑 <b>Mật khẩu cổng:</b> <code>{code_lock}</code>  <i>(Chạm để copy)</i>\n"
        f"📞 <b>SĐT chủ nhà:</b> <code>{landlord_phone}</code>\n\n"
        f"👇 <i>Bấm chọn nội dung bạn muốn tra cứu:</i>"
    )
    return msg
