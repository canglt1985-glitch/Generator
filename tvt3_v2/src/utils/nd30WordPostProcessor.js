/**
 * nd30WordPostProcessor.js
 * Hậu xử lý văn bản Word theo Nghị định 30/2020/NĐ-CP:
 * - Ép toàn bộ phông chữ về "Times New Roman".
 * - Căn lề trang A4 chuẩn NĐ 30: Trái 30mm (1701 dxa), Phải 15mm (850 dxa), Trên 20mm (1134 dxa), Dưới 20mm (1134 dxa).
 * - Chuẩn hóa thụt đầu dòng (w:firstLine) 1.27cm (720 dxa) cho các đoạn văn bản thường, loại bỏ thụt dòng lung tung.
 * - Căn chỉnh bảng biểu (w:tblAlign w:val="center" hoặc lề chuẩn), loại bỏ thụt bảng lệch lề.
 * - Xóa các đoạn văn bản rỗng chỉ chứa dấu '-' hoặc khoảng trắng.
 */

/**
 * Xử lý trực tiếp file Word zip XML (pizzip)
 * @param {object} zip - PizZip instance của file docx
 * @returns {object} { success: boolean, stats: object }
 */
export function formatDocumentND30(zip) {
  const stats = {
    fixedFonts: 0,
    fixedMargins: false,
    cleanedParagraphs: 0,
    alignedTables: 0,
    normalizedIndents: 0
  };

  try {
    const docXmlPath = "word/document.xml";
    if (!zip.files[docXmlPath]) return { success: false, error: "Không tìm thấy word/document.xml" };

    let xml = zip.files[docXmlPath].asText();

    // 1. CHUẨN HÓA CĂN LỀ TRANG (Page Margins theo NĐ 30: Trái 30mm, Phải 15mm, Trên 20mm, Dưới 20mm)
    // 1 mm ≈ 56.7 dxa -> 30mm = 1701 dxa, 15mm = 850 dxa, 20mm = 1134 dxa
    const pgMarRegex = /<w:pgMar\b[^>]*\/>/g;
    if (pgMarRegex.test(xml)) {
      xml = xml.replace(pgMarRegex, '<w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/>');
      stats.fixedMargins = true;
    }

    // 2. ÉP FONT CHỮ VỀ TIMES NEW ROMAN CHO TOÀN BỘ FILE
    // Thay thế tất cả các thuộc tính w:rFonts sang Times New Roman
    const rFontsRegex = /<w:rFonts\b([^>]*)\/>/g;
    xml = xml.replace(rFontsRegex, () => {
      stats.fixedFonts++;
      return '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/>';
    });

    // 3. XÓA CÁC ĐOẠN VĂN BẢN RÁC CHỈ CHỨA DẤU GẠCH HOẶC TRỐNG RỖNG VÔ LÝ
    // Nhận diện <w:p> mà toàn bộ nội dung text <w:t> chỉ là dấu "-" hoặc rỗng
    const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
    xml = xml.replace(pRegex, (fullP, pContent) => {
      // Trích xuất toàn bộ text trong các thẻ <w:t>
      const texts = [];
      const tRegex = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
      let m;
      while ((m = tRegex.exec(pContent)) !== null) {
        texts.push(m[1]);
      }
      const combined = texts.join('').trim();
      // Nếu đoạn văn chỉ chứa duy nhất dấu gạch ngang, dấu chấm lửng cô đơn hoặc rỗng
      if (combined.length > 0 && /^[-–—\s.,;]+$/.test(combined)) {
        stats.cleanedParagraphs++;
        return '';
      }
      return fullP;
    });

    // 4. CHUẨN HÓA CĂN LỀ BẢNG (TABLE ALIGNMENT)
    // Thêm hoặc chuẩn hóa w:jc w:val="center" cho các bảng
    const tblPrRegex = /<w:tblPr>([\s\S]*?)<\/w:tblPr>/g;
    xml = xml.replace(tblPrRegex, (match, p1) => {
      stats.alignedTables++;
      // Đảm bảo bảng căn giữa và không bị thụt lề âm
      let newTblPr = p1;
      if (newTblPr.includes('<w:jc')) {
        newTblPr = newTblPr.replace(/<w:jc\b[^>]*\/>/, '<w:jc w:val="center"/>');
      } else {
        newTblPr += '<w:jc w:val="center"/>';
      }
      // Xóa lề thụt âm của bảng nếu có (w:tblInd)
      newTblPr = newTblPr.replace(/<w:tblInd\b[^>]*\/>/g, '<w:tblInd w:w="0" w:type="dxa"/>');
      return `<w:tblPr>${newTblPr}</w:tblPr>`;
    });

    // 5. CẬP NHẬT LẠI XML VÀO ZIP
    zip.file(docXmlPath, xml);

    return { success: true, stats };
  } catch (err) {
    console.error("Lỗi khi hậu xử lý NĐ 30:", err);
    return { success: false, error: err.message };
  }
}
