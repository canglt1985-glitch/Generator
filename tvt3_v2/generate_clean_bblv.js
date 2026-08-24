const fs = require('fs');
const PizZip = require('pizzip');

const docPath = 'public/templates/BBLV.docx';
if (!fs.existsSync(docPath)) {
    console.error(`File not found: ${docPath}`);
    process.exit(1);
}

const content = fs.readFileSync(docPath, 'binary');
const zip = new PizZip(content);

// Custom document.xml content with national title, standard layout, and all placeholders
const cleanXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:b/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:b/>
          <w:sz w:val="28"/>
        </w:rPr>
        <w:t>Độc lập - Tự do - Hạnh phúc</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:b/>
        </w:rPr>
        <w:t>-----------------o0o-----------------</w:t>
      </w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:b/>
          <w:sz w:val="32"/>
        </w:rPr>
        <w:t>BIÊN BẢN GHI NHỚ KHẢO SÁT MẶT BẰNG DỰNG TRẠM BTS</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:b/>
          <w:sz w:val="24"/>
        </w:rPr>
        <w:t>(Mã quy hoạch trạm: {{SITE_ID}})</w:t>
      </w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>Hôm nay, ngày ...... tháng ...... năm 202..., tại địa điểm khảo sát: {{ADDRESS}}, chúng tôi gồm:</w:t>
      </w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:b/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>BÊN A: CHỦ MẶT BẰNG / ĐẤT CHO THUÊ</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>- Họ và tên: {{OWNER_NAME}}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>- Số điện thoại liên hệ: {{PHONE}}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>- Số thửa đất: {{PLOT_NO}}  —  Tờ bản đồ: {{MAP_SHEET}}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>- Diện tích dự kiến thuê: {{AREA}} m²</w:t>
      </w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:b/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>BÊN B: ĐƠN VỊ KHẢO SÁT (TỔ VIỄN THÔNG 3 - MOBIFONE ĐỒNG NAI)</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>- Ông/Bà đại diện khảo sát kỹ thuật Tổ Viễn thông 3.</w:t>
      </w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:b/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>NỘI DUNG THỐNG NHẤT KHẢO SÁT &amp; THƯƠNG LƯỢNG SƠ BỘ:</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>1. Mã trạm thiết kế (Quy hoạch mới): {{SITE_ID}} (Mã quy hoạch cũ: {{SITE_ID_OLD}})</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>2. Địa bàn hành chính mới: Xã {{SITE_NAME}}, Huyện {{ADDRESS_NEW}}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>3. Tọa độ quy hoạch thiết kế: {{LATITUDE_PLAN}} / {{LONGITUDE_PLAN}}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>4. Tọa độ khảo sát thực tế ngoài hiện trường: {{LATITUDE_SURVEY}} / {{LONGITUDE_SURVEY}}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>5. Hình thức triển khai dựng trạm dự kiến: {{RENT_FEE_CO_VAT}} (Thuê mặt bằng tự đầu tư hoặc Thuê dùng chung CSHT)</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>6. Loại cột anten và độ cao dự kiến: {{NEW_PRICE_TEXT}}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>7. Mức giá thuê đề xuất thương lượng với chủ nhà: {{RENT_FEE}} VNĐ/tháng</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>   (Bằng chữ: {{RENT_FEE_TEXT}})</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>8. Chu kỳ thanh toán dự kiến: {{PAYMENT_CYCLE}} và thời hạn thuê cam kết: {{TERM}} năm.</w:t>
      </w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>Hai bên thống nhất vị trí khảo sát đạt tiêu chuẩn kỹ thuật phát sóng và sẽ tiến hành hoàn thiện các thủ tục pháp lý tiếp theo để trình duyệt phương án ký kết Hợp đồng chính thức.</w:t>
      </w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>Biên bản được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản.</w:t>
      </w:r>
    </w:p>
    <w:p/>
    <w:p/>
    <w:p>
      <w:pPr>
        <w:ind w:left="400" w:right="400"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:b/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>        ĐẠI DIỆN BÊN A                                         ĐẠI DIỆN BÊN B</w:t>
      </w:r>
    </w:p>
    <w:p/>
    <w:p/>
    <w:p/>
  </w:body>
</w:document>`;

zip.file('word/document.xml', cleanXml);

const buf = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
fs.writeFileSync(docPath, buf);
console.log("Successfully updated BBLV.docx template to be a professional Biên bản ghi nhớ!");
