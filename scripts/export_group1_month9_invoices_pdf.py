import os
import json
import asyncio
import requests
import pypdf
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

async def main():
    print("🚀 BẮT ĐẦU XUẤT FILE PDF TỔNG HỢP 15 HÓA ĐƠN THÁNG 09/2026 (NHÓM 1 - ĐỒNG NAI)")
    
    # 1. Đọc cấu hình Supabase
    env = {}
    with open('tvt3_v2/.env') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                env[k.strip()] = v.strip().strip('"').strip("'")

    url = env.get('VITE_SUPABASE_URL')
    key = env.get('VITE_SUPABASE_ANON_KEY')
    headers = {'apikey': key, 'Authorization': f'Bearer {key}'}

    # Danh sách 15 hóa đơn chuẩn L1..L15
    inv_order = [
        '665105', '666711', '667931', '671634', '676989',
        '682090', '687125', '690332', '692839', '694889',
        '701215', '703454', '705060', '704928', '656300'
    ]

    res = requests.get(f"{url}/rest/v1/parsed_invoices?select=*&invoice_number=in.({','.join(inv_order)})", headers=headers)
    inv_map = {d['invoice_number']: d for d in res.json()}
    print(f"📦 Đã lấy thông tin {len(inv_map)}/15 hóa đơn từ Supabase.")

    scratch_dir = "scratch/invoices_t9_pdf"
    os.makedirs(scratch_dir, exist_ok=True)

    pdf_files = []

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={"width": 1050, "height": 1485})
        page = await context.new_page()

        for idx, inv_num in enumerate(inv_order):
            label = f"L{idx+1}"
            inv = inv_map.get(inv_num)
            if not inv:
                print(f"❌ Không tìm thấy HĐ {inv_num}")
                continue

            inv_url = inv.get('invoice_url')
            html_content = ""
            if inv_url:
                try:
                    r = requests.get(inv_url, headers={'User-Agent': 'Mozilla/5.0'}, verify=False, timeout=15)
                    soup = BeautifulSoup(r.text, 'html.parser')
                    elem = soup.find(id='InvData')
                    if elem:
                        val = elem.get('value', '')
                        d_dict = json.loads(val)
                        html_content = d_dict.get('str', '')
                except Exception as ex:
                    print(f"⚠️ Lỗi tải HTML cho HĐ {inv_num}: {ex}")

            if not html_content:
                print(f"⚠️ HĐ {inv_num} không có InvData, tạo HTML fallback...")
                items_str = ""
                items = inv.get('items') or []
                for it_idx, it in enumerate(items):
                    items_str += f"""
                    <tr>
                        <td style="text-align:center;border:1px solid #333;padding:6px;">{it_idx+1}</td>
                        <td style="border:1px solid #333;padding:6px;">{it.get('ten', 'Dầu Diesel')}</td>
                        <td style="text-align:center;border:1px solid #333;padding:6px;">{it.get('dvt', 'Lít')}</td>
                        <td style="text-align:right;border:1px solid #333;padding:6px;">{it.get('sl', 0):,.2f}</td>
                        <td style="text-align:right;border:1px solid #333;padding:6px;">{it.get('dg', 0):,.0f}</td>
                        <td style="text-align:right;border:1px solid #333;padding:6px;">{it.get('tt', 0):,.0f}</td>
                    </tr>
                    """
                html_content = f"""
                <html>
                <head><meta charset="utf-8"/><style>body{{font-family:'Times New Roman',serif;padding:30px;line-height:1.4;}} table{{width:100%;border-collapse:collapse;margin:15px 0;}}</style></head>
                <body>
                    <div style="text-align:center;">
                        <h2>HÓA ĐƠN GIÁ TRỊ GIA TĂNG (TIỀN NHIÊN LIỆU)</h2>
                        <p>Ký hiệu: <b>{inv.get('kh_hd', '')}</b> - Số: <b style="color:red;font-size:18px;">{inv.get('invoice_number', '')}</b> - Ngày: {inv.get('invoice_date', '')}</p>
                    </div>
                    <hr/>
                    <p><b>Đơn vị bán hàng:</b> {inv.get('seller_name', '')} (MST: {inv.get('seller_mst', '')})</p>
                    <p><b>Đơn vị mua hàng:</b> {inv.get('buyer_name', '')} (MST: {inv.get('buyer_mst', '')})</p>
                    <table>
                        <thead>
                            <tr style="background:#eee;">
                                <th style="border:1px solid #333;padding:6px;">STT</th>
                                <th style="border:1px solid #333;padding:6px;">Tên hàng hóa</th>
                                <th style="border:1px solid #333;padding:6px;">ĐVT</th>
                                <th style="border:1px solid #333;padding:6px;">Số lượng</th>
                                <th style="border:1px solid #333;padding:6px;">Đơn giá</th>
                                <th style="border:1px solid #333;padding:6px;">Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody>{items_str}</tbody>
                    </table>
                    <p style="text-align:right;font-size:16px;"><b>Tổng tiền thanh toán: {inv.get('total_amount', 0):,.0f} VNĐ</b></p>
                </body>
                </html>
                """

            # Chèn CSS tối ưu in ấn trang A4 không bị tràn dòng
            custom_style = """
            <style>
                @page { size: A4 portrait; margin: 10mm 10mm 10mm 10mm; }
                body { margin: 0 !important; padding: 0 !important; zoom: 0.92; }
                table { page-break-inside: avoid !important; }
            </style>
            """
            if "</head>" in html_content:
                html_content = html_content.replace("</head>", f"{custom_style}</head>")
            else:
                html_content = custom_style + html_content

            await page.set_content(html_content, wait_until="networkidle")
            
            # Xuất từng trang PDF
            single_pdf_path = os.path.join(scratch_dir, f"{label}_{inv_num}.pdf")
            await page.pdf(
                path=single_pdf_path,
                format="A4",
                print_background=True,
                margin={"top": "8mm", "bottom": "8mm", "left": "8mm", "right": "8mm"}
            )
            print(f"  ✅ Đã render {label}: HĐ #{inv_num} ({inv.get('invoice_date')}) -> {single_pdf_path}")
            pdf_files.append(single_pdf_path)

        await browser.close()

    # 3. Ghép nối (Merge) 15 trang PDF thành 1 file duy nhất
    print(f"\n📑 Đang gộp {len(pdf_files)} trang hóa đơn vào 1 file PDF...")
    merger = pypdf.PdfWriter()
    for p_path in pdf_files:
        merger.append(p_path)

    merged_filename = "2_TONG_HOP_HOA_DON_DIEN_TU_DONG_NAI_67TRAM_T09_2026.pdf"
    
    # Lưu vào các vị trí:
    targets = [
        f"tvt3_v2/public/reports/{merged_filename}",
        f"tvt3_v2/dist/reports/{merged_filename}",
        os.path.expanduser(f"~/Downloads/{merged_filename}"),
        os.path.expanduser(f"~/Desktop/{merged_filename}")
    ]

    for t in targets:
        os.makedirs(os.path.dirname(t), exist_ok=True)
        merger.write(t)
        print(f"  🎯 Đã lưu file: {t} ({os.path.getsize(t):,} bytes)")

    print(f"\n🎉 HOÀN THÀNH XUẤT FILE HÓA ĐƠN THÁNG 9 CHO NHÓM 1!")

if __name__ == '__main__':
    asyncio.run(main())
