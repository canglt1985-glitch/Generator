const fs = require('fs');
const PizZip = require('pizzip');

const docPath = 'public/templates/BBLV.docx';
if (!fs.existsSync(docPath)) {
    console.error(`File not found: ${docPath}`);
    process.exit(1);
}

// Read the original file that was copied from the Desktop
const content = fs.readFileSync(docPath, 'binary');
const zip = new PizZip(content);
let xml = zip.file('word/document.xml').asText();

// A safe helper function using short regex with limited wildcard length to avoid backtracking
function replaceInXml(target, replacement) {
    const patternStr = target.split('').map((char, index) => {
        if (char === ' ') {
            if (index === target.length - 1) {
                return '\\s*';
            }
            return '\\s*(?:<[^>]+>){0,10}\\s*';
        }
        const escapedChar = char.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        if (index === target.length - 1) {
            return escapedChar;
        }
        return escapedChar + '(?:<[^>]+>){0,10}';
    }).join('');
    
    const regex = new RegExp(patternStr, 'g');
    if (regex.test(xml)) {
        xml = xml.replace(regex, replacement);
        console.log(`Replaced: "${target}"`);
    } else {
        console.warn(`WARNING: Could not find target text in XML: "${target}"`);
    }
}

console.log("=== STARTING TEMPLATE UPGRADE ===");

// Restore original from Desktop backup first so we don't do double replacements
try {
    const backupContent = fs.readFileSync('/Users/cang_it/Desktop/BBGN.docx', 'binary');
    const backupZip = new PizZip(backupContent);
    xml = backupZip.file('word/document.xml').asText();
    console.log("Restored fresh copy from Desktop for clean replacement");
} catch(e) {
    console.log("No backup restored, running on current public/templates/BBLV.docx");
}

// 1. General Info
replaceInXml("Tên trạm / ID trạm:", "Tên trạm / ID trạm: {{SITE_ID}} / {{SITE_ID_OLD}}");
replaceInXml("Loại trạm:", "Loại trạm: {{CLASSIFICATION_TYPE}}");
replaceInXml("Ngày khảo sát:", "Ngày khảo sát: {{SURVEY_DATE}}");
replaceInXml("Địa chỉ:", "Địa chỉ: {{ADDRESS}}");
replaceInXml("Tọa độ TK", "Tọa độ TK: {{LATITUDE_PLAN}}, {{LONGITUDE_PLAN}}");
replaceInXml("Tọa độ KS", "Tọa độ KS: {{LATITUDE_SURVEY}}, {{LONGITUDE_SURVEY}}");
replaceInXml("Sai số (so với TK):", "Sai số (so với TK): {{OFFSET_DISTANCE}}");

// 2. Representatives
replaceInXml("- N gười khảo sát :", "- Người khảo sát: {{SURVEYOR}}");
replaceInXml("- Người kiểm tra :", "- Người kiểm tra: {{CHECKER}}");
replaceInXml("Tên cơ quan (gia đình)", "Tên cơ quan (gia đình): {{COMPANY_NAME}}");
replaceInXml("Họ tên người đại diện :", "Họ tên người đại diện: {{LANDLORD_NAME}}");
replaceInXml("SĐT:", "SĐT: {{LANDLORD_PHONE}}");
replaceInXml("CCCD/CMND:", "CCCD/CMND: {{LANDLORD_CCCD}}");

// 3. Checkboxes
replaceInXml("☐ Mặt đất", "{{#IS_MAT_DAT}}☑{{/IS_MAT_DAT}}{{^IS_MAT_DAT}}☐{{/IS_MAT_DAT}} Mặt đất");
replaceInXml("☐ Mái nhà", "{{#IS_MAI_NHA}}☑{{/IS_MAI_NHA}}{{^IS_MAI_NHA}}☐{{/IS_MAI_NHA}} Mái nhà: {{ROOF_SHEETS}} tấm, cao {{ROOF_HEIGHT}} mét");
replaceInXml("Ghi chú đặc điểm đất, nhà:", "Ghi chú đặc điểm đất, nhà: {{SURVEY_NOTES}}");
replaceInXml("Kích thước DxR khu đất /mái nhà :", "Kích thước DxR khu đất/mái nhà: {{LAND_DIMENSIONS}} m");
replaceInXml("Kích thước dự kiến thuê sử dụng xây dựng trạm (DxR) :", "Kích thước dự kiến thuê sử dụng xây dựng trạm (DxR): {{LEASED_DIMENSIONS}} m (Diện tích: {{LEASED_AREA}} m²)");

// Access road
replaceInXml("☐ Ô tô", "{{#ACCESS_CAR}}☑{{/ACCESS_CAR}}{{^ACCESS_CAR}}☐{{/ACCESS_CAR}} Ô tô");
replaceInXml("☐ Xe máy", "{{#ACCESS_BIKE}}☑{{/ACCESS_BIKE}}{{^ACCESS_BIKE}}☐{{/ACCESS_BIKE}} Xe máy");
replaceInXml("☐ Đi bộ", "{{#ACCESS_WALK}}☑{{/ACCESS_WALK}}{{^ACCESS_WALK}}☐{{/ACCESS_WALK}} Đi bộ");

// Power
replaceInXml("☐ điện kế ĐL", "{{#POWER_DIRECT}}☑{{/POWER_DIRECT}}{{^POWER_DIRECT}}☐{{/POWER_DIRECT}} điện kế ĐL");
replaceInXml("☐ không có hạ thế, câu đuôi", "{{#POWER_SHARE}}☑{{/POWER_SHARE}}{{^POWER_SHARE}}☐{{/POWER_SHARE}} không có hạ thế, câu đuôi");
replaceInXml("☐ trang bị MBA riêng", "{{#POWER_SUBSTATION}}☑{{/POWER_SUBSTATION}}{{^POWER_SUBSTATION}}☐{{/POWER_SUBSTATION}} trang bị MBA riêng");
replaceInXml("Khoảng cách đến vị trí đấu điện lưới dự kiến:", "Khoảng cách đến vị trí đấu điện lưới dự kiến: {{POWER_DISTANCE}} m");
replaceInXml("Khả năng kéo cáp quang:", "Khả năng kéo cáp quang: {{FIBER_CAPABILITY}}");

// Legal
replaceInXml("☐ Giấy chứng nhận QSD nhà/ đất", "{{#LEGAL_RED_BOOK}}☑{{/LEGAL_RED_BOOK}}{{^LEGAL_RED_BOOK}}☐{{/LEGAL_RED_BOOK}} Giấy chứng nhận QSD nhà/ đất");
replaceInXml("☐ Khác:", "{{#LEGAL_OTHER}}☑{{/LEGAL_OTHER}}{{^LEGAL_OTHER}}☐{{/LEGAL_OTHER}} Khác: {{LEGAL_OTHER_DESC}}");

// Antenna
replaceInXml("☐ Dây co mặt đất", "{{#ANTENNA_GUYED}}☑{{/ANTENNA_GUYED}}{{^ANTENNA_GUYED}}☐{{/ANTENNA_GUYED}} Dây co mặt đất");
replaceInXml("☐ Cột monopole mặt đấ t", "{{#ANTENNA_MONOPOLE}}☑{{/ANTENNA_MONOPOLE}}{{^ANTENNA_MONOPOLE}}☐{{/ANTENNA_MONOPOLE}} Cột monopole mặt đất");
replaceInXml("☐ 30m", "{{#HEIGHT_30}}☑{{/HEIGHT_30}}{{^HEIGHT_30}}☐{{/HEIGHT_30}} 30m");
replaceInXml("☐ 36m", "{{#HEIGHT_36}}☑{{/HEIGHT_36}}{{^HEIGHT_36}}☐{{/HEIGHT_36}} 36m");
replaceInXml("☐ 42m", "{{#HEIGHT_42}}☑{{/HEIGHT_42}}{{^HEIGHT_42}}☐{{/HEIGHT_42}} 42m");
replaceInXml("☐ K hác", "{{#HEIGHT_OTHER}}☑{{/HEIGHT_OTHER}}{{^HEIGHT_OTHER}}☐{{/HEIGHT_OTHER}} Khác: {{HEIGHT_OTHER_DESC}}");
replaceInXml("☐ 3 co", "{{#FOUNDATION_3}}☑{{/FOUNDATION_3}}{{^FOUNDATION_3}}☐{{/FOUNDATION_3}} 3 co");
replaceInXml("☐ 4 co", "{{#FOUNDATION_4}}☑{{/FOUNDATION_4}}{{^FOUNDATION_4}}☐{{/FOUNDATION_4}} 4 co");

// Conflict
replaceInXml("Các công trình, vật dụng, cây cối có khả năng xung đột", "Các công trình, vật dụng, cây cối có khả năng xung đột: {{CONFLICT_NOTES}}");

// 4. Rent details
replaceInXml("Thời gian thuê:", "Thời gian thuê: {{LEASE_TERM}} năm.");
replaceInXml("Giá thuê:", "Giá thuê: {{RENT_FEE}} đồng/tháng.");
replaceInXml("Bằng chữ:", "Bằng chữ: {{RENT_FEE_TEXT}}");

console.log("=== WRITING UPGRADED TEMPLATE BACK ===");
zip.file('word/document.xml', xml);
const buf = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
fs.writeFileSync(docPath, buf);
console.log("Finished template rewrite!");
