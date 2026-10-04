#!/usr/bin/env python3
"""
scripts/test_egov_sandwich.py
Kiểm thử kỹ thuật Sandwich Compositing với template tracuuhoadon.jpg
"""

import os
import sys
from pathlib import Path
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = Path(__file__).resolve().parent.parent

def test_sandwich():
    template_candidates = [
        BASE_DIR / "tracuuhoadon.jpg",
        BASE_DIR / "tracuuhoadon.png",
        BASE_DIR / "perfect_template.png"
    ]
    template_path = None
    for cand in template_candidates:
        if cand.exists():
            template_path = cand
            break

    if not template_path:
        print("[FAIL] Khong tim thay template tracuuhoadon.jpg")
        return False

    print(f"[OK] Tim thay template: {template_path.name}")
    img_template = Image.open(template_path)
    screen_w, screen_h = img_template.size
    print(f"  Kich thuoc template: {screen_w} x {screen_h}")

    offset_y = 81
    taskbar_h = 48
    web_w = screen_w
    web_h = screen_h - offset_y - taskbar_h

    # 1. Tao dummy web screenshot mo phong trang tra cuu GDT
    dummy_web = Image.new("RGB", (web_w, web_h), color=(240, 242, 245))
    draw_web = ImageDraw.Draw(dummy_web)
    
    # Ve khung gia lap web GDT
    draw_web.rectangle([(50, 40), (web_w - 50, web_h - 40)], fill=(255, 255, 255), outline=(217, 217, 217), width=1)
    draw_web.rectangle([(50, 40), (web_w - 50, 90)], fill=(24, 144, 255))
    
    # 2. Trich xuat Header va Taskbar tu template
    clean_header = img_template.crop((0, 0, screen_w, offset_y))
    clean_taskbar = img_template.crop((0, screen_h - taskbar_h, screen_w, screen_h)).copy()

    # 3. Va dong ho taskbar
    patch_w, patch_h = 82, 40
    empty_patch = clean_taskbar.crop((screen_w - 350, 4, screen_w - 350 + patch_w, 4 + patch_h))
    clean_taskbar.paste(empty_patch, (screen_w - 118, 4))

    # 4. Ve dong ho va ngay gio
    font_candidates = [
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "arial.ttf"
    ]
    font = None
    for fc in font_candidates:
        if os.path.exists(fc):
            try:
                font = ImageFont.truetype(fc, 11)
                break
            except Exception:
                pass
    if font is None:
        font = ImageFont.load_default()

    now = datetime.now()
    time_str = now.strftime("%I:%M %p").lstrip("0")
    date_str = now.strftime("%d/%m/%Y")

    bbox_time = font.getbbox(time_str)
    tw_time = bbox_time[2] - bbox_time[0]
    bbox_date = font.getbbox(date_str)
    tw_date = bbox_date[2] - bbox_date[0]

    center_x = screen_w - 77
    x_time = int(center_x - tw_time / 2)
    x_date = int(center_x - tw_date / 2)

    draw_tb = ImageDraw.Draw(clean_taskbar)
    draw_tb.text((x_time, 7), time_str, fill=(0, 0, 0), font=font)
    draw_tb.text((x_date, 23), date_str, fill=(0, 0, 0), font=font)

    # 5. Sandwich Compositing
    final_img = Image.new("RGB", (screen_w, screen_h))
    final_img.paste(dummy_web, (0, offset_y))
    final_img.paste(clean_header, (0, 0))
    final_img.paste(clean_taskbar, (0, screen_h - taskbar_h))

    out_dir = BASE_DIR / "scratch"
    out_dir.mkdir(exist_ok=True)
    out_path = out_dir / "test_sandwich_full_preview.jpg"
    final_img.save(out_path, "JPEG", quality=95, optimize=True)

    size_kb = os.path.getsize(out_path) / 1024
    print(f"[SUCCESS] Da xuat test Sandwich: {out_path} ({size_kb:.1f} KB, {final_img.size})")
    assert final_img.size == (screen_w, screen_h)
    return True

if __name__ == "__main__":
    test_sandwich()
