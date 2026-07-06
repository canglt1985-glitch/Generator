import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';

/**
 * Hàm tải và xuất file Word sử dụng docxtemplater
 * @param {string} templatePath - Đường dẫn tới file template (ví dụ: '/templates/HOP_DONG_MOI_CSHT.docx')
 * @param {object} data - Dữ liệu data object để điền vào Word
 * @param {string} outputFileName - Tên file sẽ được download về máy
 */
export const generateWordBlob = async (templatePath, data) => {
    try {
        const cacheBusterUrl = `${templatePath}?t=${new Date().getTime()}`;
        const response = await fetch(cacheBusterUrl);
        if (!response.ok) {
            throw new Error(`Không thể tải template từ ${templatePath}`);
        }
        
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
        
        doc.render(data);
        
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

export const generateWordDocument = async (templatePath, data, outputFileName) => {
    const result = await generateWordBlob(templatePath, data);
    if (result.success) {
        saveAs(result.blob, outputFileName);
        return { success: true };
    }
    return result;
};
