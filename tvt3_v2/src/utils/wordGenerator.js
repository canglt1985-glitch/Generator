import { saveAs } from 'file-saver';

/**
 * Hàm tải và xuất file Word sử dụng docxtemplater
 * @param {string} templatePath - Đường dẫn tới file template (ví dụ: '/templates/HOP_DONG_MOI_CSHT.docx')
 * @param {object} data - Dữ liệu data object để điền vào Word
 * @param {string} outputFileName - Tên file sẽ được download về máy
 */
import { sanitizeContractData } from './smartContractSanitizer';
import { formatDocumentND30 } from './nd30WordPostProcessor';

/**
 * Hàm tải và xuất file Word sử dụng docxtemplater kết hợp chuẩn hóa NĐ 30/2020/NĐ-CP
 * @param {string} templatePath - Đường dẫn tới file template (ví dụ: '/templates/HOP_DONG_MOI_CSHT.docx')
 * @param {object} data - Dữ liệu data object để điền vào Word
 * @param {boolean} applyND30 - Có áp dụng chuẩn hóa Nghị định 30 (font, lề, bảng, dọn dấu '-') hay không
 */
export const generateWordBlob = async (templatePath, data, applyND30 = true) => {
    try {
        const [{ default: Docxtemplater }, { default: PizZip }] = await Promise.all([
            import('docxtemplater'),
            import('pizzip')
        ]);
        const cacheBusterUrl = `${templatePath}?t=${new Date().getTime()}`;
        const response = await fetch(cacheBusterUrl);
        if (!response.ok) {
            throw new Error(`Không thể tải template từ ${templatePath}`);
        }
        
        // 1. Làm sạch dữ liệu trước khi đưa vào template (loại bỏ '-', '--', số 0 vô duyên)
        const cleanData = applyND30 ? sanitizeContractData(data) : data;

        const arrayBuffer = await response.arrayBuffer();
        const zip = new PizZip(arrayBuffer);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '{{', end: '}}' },
            parser: function(tag) {
                return {
                    get: function(scope) {
                        const key = tag.trim();
                        return scope[key] !== undefined ? scope[key] : '';
                    }
                };
            }
        });
        
        // 2. Render dữ liệu vào Word
        doc.render(cleanData);
        
        // 3. Hậu xử lý chuẩn hóa thể thức Nghị định 30 (lề trang 30-15-20-20, ép font Times New Roman, canh bảng giữa, xóa rác)
        if (applyND30) {
            formatDocumentND30(doc.getZip());
        }

        const out = doc.getZip().generate({
            type: "blob",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });
        
        return { success: true, blob: out };
    } catch (error) {
        console.error("Lỗi khi tạo file Word:", error);
        
        let errorMessage = error.message;
        if (error.properties && error.properties.errors instanceof Array) {
            const errorDetails = error.properties.errors.map(e => e.properties?.explanation || e.message).join('\n- ');
            errorMessage = `Lỗi cú pháp trong file template Word:\n- ${errorDetails}\n\nCách sửa: Mở file Word ra và xóa bớt các dấu ngoặc nhọn bị thừa (ví dụ thay vì gõ {{ {{TAG}} }} thì chỉ gõ {{TAG}}).`;
        }
        
        return { success: false, error: errorMessage };
    }
};

export const generateWordDocument = async (templatePath, data, outputFileName, applyND30 = true) => {
    const result = await generateWordBlob(templatePath, data, applyND30);
    if (result.success) {
        saveAs(result.blob, outputFileName);
        return { success: true };
    }
    return result;
};

