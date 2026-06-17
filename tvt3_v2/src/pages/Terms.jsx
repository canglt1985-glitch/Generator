import React from 'react';

function Terms() {
  return (
    <div className="max-w-4xl mx-auto py-10 px-6 bg-white rounded-2xl shadow-sm border border-gray-100 mt-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6 border-b pb-4">Điều Khoản Sử Dụng Hệ Thống</h1>
      
      <div className="prose prose-blue text-gray-600 space-y-6">
        <p className="text-sm text-gray-400 italic">Cập nhật lần cuối: 16/06/2026</p>
        
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Chấp nhận điều khoản</h2>
          <p>
            Bằng việc đăng nhập và sử dụng hệ thống VHKT-TVT3, bạn cam kết tuân thủ các quy chế vận hành, quy định an toàn thông tin và bảo mật dữ liệu của Tổ Viễn Thông 3 và Tổng công ty.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Quyền hạn và trách nhiệm tài khoản</h2>
          <p>
            Mỗi tài khoản được cấp cho cá nhân phải được bảo quản bảo mật. Bạn chịu trách nhiệm hoàn toàn về mọi hoạt động ghi chép nhật ký, cập nhật hợp đồng, hay thay đổi thông tin thực hiện dưới tài khoản của bạn.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">3. Tính chính xác của dữ liệu</h2>
          <p>
            Các dữ liệu về nhật ký vận hành kỹ thuật, thông số máy phát điện và số liệu nhiên liệu phải được ghi chép trung thực, chính xác theo thời gian thực tế triển khai ngoài trạm. Việc làm giả hoặc khai báo sai lệch số liệu sẽ bị xử lý theo quy định của tổ chức.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Thay đổi điều khoản</h2>
          <p>
            Tổ Viễn Thông 3 giữ quyền cập nhật, chỉnh sửa các điều khoản sử dụng này để phù hợp với tình hình vận hành thực tế và các quy định mới của doanh nghiệp.
          </p>
        </section>
      </div>
    </div>
  );
}

export default Terms;
