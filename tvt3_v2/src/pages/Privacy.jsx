import React from 'react';

function Privacy() {
  return (
    <div className="max-w-4xl mx-auto py-10 px-6 bg-white rounded-2xl shadow-sm border border-gray-100 mt-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6 border-b pb-4">Chính Sách Bảo Mật Thông Tin</h1>
      
      <div className="prose prose-blue text-gray-600 space-y-6">
        <p className="text-sm text-gray-400 italic">Cập nhật lần cuối: 16/06/2026</p>
        
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Mục đích thu thập dữ liệu</h2>
          <p>
            Hệ thống VHKT-TVT3 thu thập thông tin nhằm phục vụ công tác quản lý vận hành kỹ thuật, hợp đồng nhà trạm viễn thông, nhật ký công việc hàng ngày, giám sát máy phát điện và lịch cúp điện của Tổ Viễn Thông 3. Dữ liệu này chỉ lưu hành nội bộ và phục vụ cho mục đích vận hành mạng lưới viễn thông ổn định.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Các loại thông tin thu thập</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Thông tin tài khoản: Tên đăng nhập, email công việc, số điện thoại, vai trò và phân quyền trong hệ thống.</li>
            <li>Thông tin vận hành: Nhật ký đi tuyến, báo cáo máy phát điện, thông số kỹ thuật nhà trạm và lịch cúp điện.</li>
            <li>Thông tin đối tác: Thông tin chủ trạm, số tài khoản ngân hàng, thông tin đàm phán hợp đồng.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">3. Bảo mật thông tin</h2>
          <p>
            Mọi thông tin liên quan đến hạ tầng kỹ thuật, tài chính hợp đồng và dữ liệu vận hành được coi là thông tin mật cấp độ doanh nghiệp. Hệ thống sử dụng kết nối mã hóa SSL/TLS, các chính sách bảo mật Row Level Security (RLS) trên Supabase để ngăn chặn truy cập trái phép.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Cam kết người dùng</h2>
          <p>
            Người dùng hệ thống (cán bộ, nhân viên Tổ Viễn Thông 3) có trách nhiệm bảo mật tài khoản cá nhân, không chia sẻ thông tin dữ liệu nhà trạm hoặc các điều khoản đàm phán tài chính ra bên ngoài khi chưa được sự cho phép của cấp quản lý.
          </p>
        </section>
      </div>
    </div>
  );
}

export default Privacy;
