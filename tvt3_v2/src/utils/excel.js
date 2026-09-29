
export const exportContractsToExcel = async (contracts) => {
  const XLSX = await import('xlsx');
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
  
  reader.onload = async (e) => {
    try {
      const XLSX = await import('xlsx');
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

export const exportMobileEquipmentToExcel = async ({ mobileEquipments, equipmentTransfers, stations } = {}) => {
  const XLSX = await import('xlsx');
  
  let equips = mobileEquipments;
  let transfers = equipmentTransfers;
  let sites = stations;

  // Tự động tải từ Supabase nếu chưa được truyền vào
  try {
    if (!equips || equips.length === 0 || !transfers || !sites || sites.length === 0) {
      const { supabase } = await import('../supabaseClient');
      const promises = [];
      if (!equips || equips.length === 0) {
        promises.push(supabase.from('mobile_equipment').select('*').order('type', { ascending: true }).order('equipment_code', { ascending: true }));
      } else {
        promises.push(Promise.resolve({ data: equips }));
      }
      if (!transfers || transfers.length === 0) {
        promises.push(supabase.from('equipment_transfers').select('*').order('transfer_date', { ascending: false }).limit(500));
      } else {
        promises.push(Promise.resolve({ data: transfers }));
      }
      if (!sites || sites.length === 0) {
        promises.push(supabase.from('datasites').select('site_id, site_id_old, name, location_info, infrastructure_info').order('site_id', { ascending: true }));
      } else {
        promises.push(Promise.resolve({ data: sites }));
      }

      const [resEq, resTr, resSt] = await Promise.all(promises);
      if (resEq.data) equips = resEq.data;
      if (resTr.data) transfers = resTr.data;
      if (resSt.data) sites = resSt.data;
    }
  } catch (fetchErr) {
    console.warn("Lỗi đồng bộ thêm dữ liệu trạm/điều chuyển:", fetchErr);
  }

  if (!equips || equips.length === 0) {
    alert("Không tìm thấy dữ liệu thiết bị lưu động để xuất Excel.");
    return;
  }

  // Tạo map tra cứu trạm
  const siteMap = {};
  (sites || []).forEach(s => {
    const sid = (s.site_id || '').trim().toUpperCase();
    const sold = (s.site_id_old || '').trim().toUpperCase();
    if (sid) siteMap[sid] = s;
    if (sold) siteMap[sold] = s;
  });

  const getSiteInfo = (code) => {
    if (!code) return { code: '—', oldCode: '—', name: '—', district: '—' };
    const u = String(code).trim().toUpperCase();
    if (u === 'KHO') {
      return { code: 'KHO', oldCode: '—', name: 'Kho Đài TVT3', district: 'Đài TVT3' };
    }
    if (u.includes('NHÀ')) {
      return { code: code, oldCode: '—', name: code, district: 'Cá nhân giữ' };
    }
    const st = siteMap[u];
    if (st) {
      const loc = st.location_info || {};
      return {
        code: st.site_id || code,
        oldCode: st.site_id_old || '—',
        name: st.name || '',
        district: loc.huyen_cu || loc.huyen || ''
      };
    }
    return { code: code, oldCode: '—', name: code, district: '—' };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return String(dateStr);
    }
  };

  // 1. SHEET 1: Vị trí hiện tại của thiết bị lưu động
  const sheet1Data = (equips || []).map((eq, idx) => {
    const locInfo = getSiteInfo(eq.current_location);
    return {
      'STT': idx + 1,
      'Mã Thiết Bị': eq.equipment_code || '',
      'Phân Loại': eq.type || '',
      'Nhãn Hiệu': eq.brand || '',
      'Model Chi Tiết': eq.model || eq.specifications || '',
      'Thông Số Kỹ Thuật': eq.specifications || '',
      'Số Serial': eq.serial_number || '—',
      'Mã OID EAM': eq.eam_oid || '—',
      'Ngày Đưa Vào SD': eq.commissioning_date || '—',
      'Vị Trí Hiện Tại (Mã Trạm)': locInfo.code,
      'Mã Trạm Cũ': locInfo.oldCode,
      'Tên Trạm / Nơi Đặt': locInfo.name,
      'Huyện / Khu Vực': locInfo.district,
      'Tình Trạng': eq.status || 'Tốt',
      'Tồn Nhiên Liệu (Lít)': eq.fuel_balance ?? 0,
      'Ghi Chú Vận Hành': eq.notes || '',
      'Cập Nhật Cuối': formatDate(eq.updated_at || eq.created_at)
    };
  });

  // 2. SHEET 2: Lịch sử điều chuyển & bàn giao
  const eqMap = {};
  (equips || []).forEach(e => { eqMap[e.id] = e; });

  const sheet2Data = (transfers || []).map((tr, idx) => {
    const eq = eqMap[tr.equipment_id];
    const fromInfo = getSiteInfo(tr.from_location);
    const toInfo = getSiteInfo(tr.to_location);
    return {
      'STT': idx + 1,
      'Thời Gian Điều Chuyển': formatDate(tr.transfer_date),
      'Mã Thiết Bị': eq ? eq.equipment_code : 'Khác',
      'Phân Loại': eq ? eq.type : '—',
      'Từ Vị Trí (Nơi Đi)': fromInfo.code,
      'Mã Trạm Cũ (Nơi Đi)': fromInfo.oldCode,
      'Tên Trạm / Điểm Đi': fromInfo.name,
      'Đến Vị Trí (Nơi Đến)': toInfo.code,
      'Mã Trạm Cũ (Nơi Đến)': toInfo.oldCode,
      'Tên Trạm / Điểm Đến': toInfo.name,
      'Người Thực Hiện': tr.operator || '',
      'Ghi Chú / Lý Do Điều Chuyển': tr.notes || ''
    };
  });

  // 3. SHEET 3: Máy phát xăng lưu động theo dữ liệu CSHT (nếu có)
  const sheet3Data = [];
  let s3Idx = 1;
  (sites || []).forEach(s => {
    const infra = s.infrastructure_info || {};
    const loc = s.location_info || {};
    const mpds = (infra.may_phat_dien || {}).mpd || [];
    mpds.forEach(m => {
      const lld = String(m.loai_lap_dat || '').toLowerCase();
      const ten = String(m.ten || '').toLowerCase();
      const nh = String(m.nhan_hieu || '').toLowerCase();
      const nl = String(m.nhien_lieu || '').toLowerCase();
      if (lld.includes('lưu động') || lld.includes('di động') || lld.includes('luu dong') || ten.includes('lưu động') || nh.includes('lưu động') || nl.includes('xăng')) {
        sheet3Data.push({
          'STT': s3Idx++,
          'Mã Trạm Mới': s.site_id || '',
          'Mã Trạm Cũ': s.site_id_old || '',
          'Tên Trạm': s.name || '',
          'Huyện': loc.huyen_cu || loc.huyen || '',
          'Xã / Phường': loc.xa_cu || loc.xa_moi || '',
          'Nhãn Hiệu Máy': m.nhan_hieu || 'MLĐ Xăng',
          'Công Suất': m.cong_suat ? `${m.cong_suat} kVA` : '—',
          'Loại Nhiên Liệu': m.nhien_lieu || 'Xăng',
          'Định Mức (L/h)': Number(m.dinh_muc || m.dinh_muc_quy_chuan || 0),
          'Tình Trạng / Ghi Chú': m.ghi_chu || m.tinh_trang || 'Máy xăng lưu động tại trạm'
        });
      }
    });
  });

  // 4. SHEET 4: Báo cáo tổng hợp phân bổ & thống kê
  const mpdCount = (equips || []).filter(e => (e.type || '').toUpperCase().includes('MPĐ') || (e.equipment_code || '').includes('MPD')).length;
  const pinCount = (equips || []).filter(e => (e.type || '').toUpperCase().includes('PIN') || (e.equipment_code || '').includes('PIN')).length;
  const otherCount = (equips || []).length - mpdCount - pinCount;
  const atSiteCount = (equips || []).filter(e => e.current_location && e.current_location !== 'KHO').length;
  const atKhoCount = (equips || []).filter(e => e.current_location === 'KHO').length;
  const badCount = (equips || []).filter(e => (e.status || '').toLowerCase().includes('hư') || (e.status || '').toLowerCase().includes('hỏng') || (e.status || '').toLowerCase().includes('sửa')).length;

  const sheet4Data = [
    { 'Chỉ Tiêu Thống Kê': 'Tổng số thiết bị lưu động quản lý', 'Số Lượng': equips.length, 'Đơn Vị': 'Thiết bị', 'Ghi Chú': 'Bao gồm MPĐ và Pin lưu động' },
    { 'Chỉ Tiêu Thống Kê': '• Máy phát điện lưu động (MPĐ)', 'Số Lượng': mpdCount, 'Đơn Vị': 'Máy', 'Ghi Chú': 'MPD-01 đến MPD-10...' },
    { 'Chỉ Tiêu Thống Kê': '• Pin Lithium lưu động (PIN)', 'Số Lượng': pinCount, 'Đơn Vị': 'Bộ', 'Ghi Chú': 'Pin dự phòng Postef 48V-100Ah...' },
    { 'Chỉ Tiêu Thống Kê': '• Thiết bị lưu động khác', 'Số Lượng': otherCount, 'Đơn Vị': 'Thiết bị', 'Ghi Chú': '' },
    { 'Chỉ Tiêu Thống Kê': 'Vị trí: Đang phục vụ tại trạm thực địa', 'Số Lượng': atSiteCount, 'Đơn Vị': 'Thiết bị', 'Ghi Chú': 'Phục vụ ứng cứu cúp điện / sự cố' },
    { 'Chỉ Tiêu Thống Kê': 'Vị trí: Đang lưu kho đài TVT3', 'Số Lượng': atKhoCount, 'Đơn Vị': 'Thiết bị', 'Ghi Chú': 'Sẵn sàng điều động' },
    { 'Chỉ Tiêu Thống Kê': 'Tình trạng: Cần sửa chữa / Hư hỏng', 'Số Lượng': badCount, 'Đơn Vị': 'Thiết bị', 'Ghi Chú': 'Cần theo dõi bảo dưỡng' },
    { 'Chỉ Tiêu Thống Kê': 'Tổng số lượt điều chuyển đã ghi nhận', 'Số Lượng': (transfers || []).length, 'Đơn Vị': 'Lượt', 'Ghi Chú': 'Lịch sử nhật ký điều động' },
  ];

  const workbook = XLSX.utils.book_new();

  // Add Sheet 1
  const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
  ws1['!cols'] = [
    { wch: 6 },  // STT
    { wch: 14 }, // Mã Thiết Bị
    { wch: 12 }, // Phân Loại
    { wch: 26 }, // Thông Số Kỹ Thuật
    { wch: 24 }, // Vị Trí Hiện Tại
    { wch: 14 }, // Mã Trạm Cũ
    { wch: 28 }, // Tên Trạm
    { wch: 18 }, // Huyện
    { wch: 14 }, // Tình Trạng
    { wch: 20 }, // Tồn Nhiên Liệu
    { wch: 30 }, // Ghi Chú
    { wch: 18 }, // Cập Nhật Cuối
  ];
  XLSX.utils.book_append_sheet(workbook, ws1, "1. Vị Trí Thiết Bị");

  // Add Sheet 2
  const ws2 = XLSX.utils.json_to_sheet(sheet2Data);
  ws2['!cols'] = [
    { wch: 6 },  // STT
    { wch: 18 }, // Thời Gian
    { wch: 14 }, // Mã Thiết Bị
    { wch: 12 }, // Phân Loại
    { wch: 20 }, // Nơi Đi
    { wch: 14 }, // Mã Cũ Nơi Đi
    { wch: 25 }, // Tên Điểm Đi
    { wch: 20 }, // Nơi Đến
    { wch: 14 }, // Mã Cũ Nơi Đến
    { wch: 25 }, // Tên Điểm Đến
    { wch: 20 }, // Người Thực Hiện
    { wch: 35 }, // Ghi Chú
  ];
  XLSX.utils.book_append_sheet(workbook, ws2, "2. Lịch Sử Điều Chuyển");

  // Add Sheet 3 if there is data
  if (sheet3Data.length > 0) {
    const ws3 = XLSX.utils.json_to_sheet(sheet3Data);
    ws3['!cols'] = [
      { wch: 6 },  // STT
      { wch: 14 }, // Mã Trạm
      { wch: 14 }, // Mã Trạm Cũ
      { wch: 28 }, // Tên Trạm
      { wch: 18 }, // Huyện
      { wch: 20 }, // Xã
      { wch: 22 }, // Nhãn Hiệu
      { wch: 16 }, // Công Suất
      { wch: 14 }, // Loại Nhiên Liệu
      { wch: 14 }, // Định Mức
      { wch: 30 }, // Ghi Chú
    ];
    XLSX.utils.book_append_sheet(workbook, ws3, "3. MPĐ Xăng Tại Trạm");
  }

  // Add Sheet 4
  const ws4 = XLSX.utils.json_to_sheet(sheet4Data);
  ws4['!cols'] = [
    { wch: 38 }, // Chỉ Tiêu
    { wch: 12 }, // Số Lượng
    { wch: 12 }, // Đơn Vị
    { wch: 38 }, // Ghi Chú
  ];
  XLSX.utils.book_append_sheet(workbook, ws4, "4. Thống Kê Tổng Hợp");

  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const fileName = `Quan_Ly_Thiet_Bi_Luu_Dong_TVT3_${todayStr}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};
