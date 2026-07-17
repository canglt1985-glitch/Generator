import * as XLSX from 'xlsx';

export const exportContractsToExcel = (contracts) => {
  if (!contracts || contracts.length === 0) {
    alert("Không có dữ liệu để xuất Excel.");
    return;
  }

  // Chuyển đổi dữ liệu JSONB phức tạp thành mảng phẳng (flat array) cho Excel
  const dataForExcel = contracts.map((c, index) => ({
    'STT': index + 1,
    'Site ID': c.site_id || '',
    'Site ID Cũ': c.datasites?.site_id_old || '',
    'Tên Trạm': c.datasites?.name || '',
    'Địa Chỉ Đặt Trạm': c.datasites?.location_info?.dia_chi_cu || '',
    'Vĩ Độ': c.datasites?.location_info?.vi_do || '',
    'Kinh Độ': c.datasites?.location_info?.kinh_do || '',
    'Số Hợp Đồng': c.contract_number || '',
    'Chủ Thể Hợp Đồng': c.contractor_info?.chu_the_hop_dong || '',
    'Địa Chỉ Liên Hệ': c.contractor_info?.dia_chi_lien_he || '',
    'Số Điện Thoại': c.contractor_info?.sdt_chu_nha || '',
    'Giá Thuê (+VAT)': c.financials?.gia_thue_co_vat || 0,
    'Ngày Ký HĐ': c.dates?.ngay_ky_hd || '',
    'Ngày Hết Hạn': c.dates?.ngay_ket_thuc_hd || '',
    'Mã Trạm ERP': c.erp_info?.ma_tram_erp || '',
    'Chủ Tài Khoản': c.bank_info?.chu_tai_khoan || '',
    'Số Tài Khoản': c.bank_info?.so_tai_khoan || '',
    'Ngân Hàng': c.bank_info?.ngan_hang || '',
    'Đạt mục tiêu 1245 (trước đàm phán)': c.chua_het_khau_hao || c._raw_contract_info?.chua_het_khau_hao ? 'Chưa hết khấu hao' : 'Khác',
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
  
  // Tự động điều chỉnh độ rộng cột
  const wscols = [
    { wch: 5 },  // STT
    { wch: 15 }, // Site ID
    { wch: 15 }, // Site ID Cũ
    { wch: 30 }, // Tên Trạm
    { wch: 40 }, // Địa Chỉ Đặt Trạm
    { wch: 15 }, // Vĩ Độ
    { wch: 15 }, // Kinh Độ
    { wch: 20 }, // Số HĐ
    { wch: 25 }, // Chủ thể
    { wch: 40 }, // Địa chỉ liên hệ
    { wch: 15 }, // SĐT
    { wch: 15 }, // Giá thuê
    { wch: 15 }, // Ngày ký
    { wch: 15 }, // Ngày hết hạn
    { wch: 15 }, // ERP
    { wch: 25 }, // Chủ TK
    { wch: 20 }, // Số TK
    { wch: 25 }, // Ngân hàng
    { wch: 30 }, // Khấu hao
  ];
  worksheet['!cols'] = wscols;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách Hợp đồng');

  // Lấy ngày giờ hiện tại để đặt tên file
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  XLSX.writeFile(workbook, `Danh_Sach_Hop_Dong_TVT3_${dateStr}.xlsx`);
};

export const importContractsFromExcel = (file, onDataRead) => {
  const reader = new FileReader();
  
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      
      // Tìm sheet "Thông tin chung" hoặc "Thong tin chung", nếu không có thì lấy sheet đầu tiên
      const targetSheetName = workbook.SheetNames.find(n => 
        n.toLowerCase().includes('thông tin chung') || n.toLowerCase().includes('thong tin chung')
      ) || workbook.SheetNames[0];
      
      const worksheet = workbook.Sheets[targetSheetName];
      
      // header: 1 đọc dòng đầu tiên làm mảng, các dòng sau là dữ liệu. Dùng raw: false để format ngày
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'dd/mm/yyyy' });
      
      // Tự động Mapping dữ liệu từ Excel sang cấu trúc JSONB của bảng contracts
      const mappedData = jsonData.map(row => {
        // Tìm kiếm các biến thể của tên cột
        const getVal = (keys) => {
          for (let key of keys) {
            const foundKey = Object.keys(row).find(k => k.toLowerCase().includes(key.toLowerCase()));
            if (foundKey) return row[foundKey];
          }
          return '';
        };

        const target1245 = String(getVal(['mục tiêu 1245', '1245', 'khấu hao'])).toLowerCase();
        const isChuaHetKhauHao = target1245.includes('chưa hết khấu hao') || target1245.includes('chua het khau hao');

        return {
          original_row: row,
          site_id: getVal(['site id', 'mã trạm', 'mã trạm mới']),
          contract_number: getVal(['số hợp đồng', 'số hđ']),
          chua_het_khau_hao: isChuaHetKhauHao,
          contractor_info: {
            chu_the_hop_dong: getVal(['chủ thể', 'chủ nhà', 'tên chủ nhà']),
            dia_chi_lien_he: getVal(['địa chỉ']),
            sdt_chu_nha: getVal(['sđt', 'số điện thoại', 'điện thoại'])
          },
          financials: {
            gia_thue_co_vat: parseFloat(String(getVal(['giá thuê', 'giá'])).replace(/[^\d.-]/g, '')) || 0,
          },
          dates: {
            ngay_ky_hd: getVal(['ngày ký']),
            ngay_ket_thuc_hd: getVal(['ngày hết hạn', 'ngày kết thúc']),
            ngay_da_thanh_toan_den: getVal(['thanh toán đến', 'đã thanh toán đến']),
            chu_ky_thanh_toan: getVal(['chu kỳ thanh toán', 'chu kỳ']) || '6 tháng'
          },
          bank_info: {
            chu_tai_khoan: getVal(['chủ tài khoản', 'chủ tk']),
            so_tai_khoan: getVal(['số tài khoản', 'số tk']),
            ngan_hang: getVal(['ngân hàng'])
          }
        };
      });
      
      if (onDataRead) {
        onDataRead(mappedData);
      }
    } catch (error) {
      console.error("Lỗi khi đọc file Excel:", error);
      alert("Đã có lỗi xảy ra khi đọc file Excel. Vui lòng kiểm tra lại định dạng file.");
    }
  };
  
  reader.readAsArrayBuffer(file);
};
