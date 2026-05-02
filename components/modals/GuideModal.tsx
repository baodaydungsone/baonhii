import React from 'react';
import Modal from '../Modal';
import Button from '../Button';
import { GEMINI_API_KEY_URL, APP_TITLE } from '../../constants'; 

interface GuideModalProps {
  onClose: () => void;
}

const GuideSection: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
  <section className="py-3">
    <h4 className="font-semibold text-xl lg:text-2xl border-b border-border-light dark:border-border-dark pb-2 mb-4 text-primary dark:text-primary-light flex items-center">
      <i className={`${icon} mr-3 text-2xl opacity-80`}></i>{title}
    </h4>
    <div className="space-y-3 prose prose-sm sm:prose-base dark:prose-invert max-w-none text-text-light dark:text-text-dark leading-relaxed">
        {children}
    </div>
  </section>
);


const GuideModal: React.FC<GuideModalProps> = ({ onClose }) => {
  return (
    <Modal isOpen={true} onClose={onClose} title={`Hướng Dẫn Sử Dụng ${APP_TITLE}`} size="lg" containerClass="custom-scrollbar"> {/* Changed size to lg */}
      <div className="space-y-6">
        <p className="text-lg text-center text-slate-700 dark:text-slate-300">
            Chào mừng bạn đến với <strong>{APP_TITLE}</strong>! Hãy cùng khám phá cách tạo và trò chuyện với những nhân vật AI độc đáo:
        </p>

        <GuideSection title="1. Chuẩn Bị API Key (Quan Trọng!)" icon="fas fa-key">
          <p>Để AI có thể "nhập vai" và trò chuyện, bạn cần một API Key từ Google Gemini.</p>
          <ul className="list-disc list-inside ml-2 space-y-2">
            <li>Trên giao diện chính, tìm nút <i className="fas fa-key"></i> (Thiết Lập API Key).</li>
            <li>
                <strong>Lựa chọn tốt nhất cho người mới:</strong> Đánh dấu vào ô <strong className="text-green-600 dark:text-green-400">"Sử dụng API Key mặc định của ứng dụng"</strong>. Tùy chọn này sử dụng mô hình Gemini Flash mạnh mẽ và thường là đủ dùng. Nhấn "Lưu & Đóng".
            </li>
            <li>
                <strong>Nếu bạn có API Key riêng:</strong> Bỏ chọn ô mặc định, dán Key của bạn vào ô nhập liệu và nhấn <strong className="text-blue-600 dark:text-blue-400">"Kiểm tra & Lưu Key"</strong>. Bạn có thể lấy Key tại <a href={GEMINI_API_KEY_URL} target="_blank" rel="noopener noreferrer" className="text-secondary dark:text-secondary-light hover:underline font-medium">Google AI Studio</a>.
            </li>
            <li>Key hợp lệ sẽ được lưu, và bạn đã sẵn sàng!</li>
          </ul>
        </GuideSection>

        <GuideSection title="2. Tạo Nhân Vật AI Đầu Tiên" icon="fas fa-user-plus">
          <p>Trên màn hình chính, nhấn vào nút <strong className="text-primary dark:text-primary-light">"Tạo Nhân Vật Mới"</strong>.</p>
          <ul className="list-disc list-inside ml-2 space-y-2">
            <li><strong>Tên Nhân Vật (*):</strong> Đặt một cái tên thật kêu cho AI của bạn.</li>
            <li><strong>Ảnh Đại Diện:</strong> Tải lên một ảnh từ máy hoặc nhập URL ảnh. Nếu bỏ trống, một ảnh mặc định sẽ được sử dụng.</li>
            <li><strong>Mô Tả Tính Cách (*):</strong> Đây là phần quan trọng nhất! Mô tả càng chi tiết về tính cách, sở thích, kiến thức, phong cách nói chuyện... AI sẽ nhập vai càng tốt.</li>
            <li><strong>Lời Chào Mở Đầu (*):</strong> Câu nói đầu tiên AI sẽ gửi cho bạn khi bắt đầu chat.</li>
            <li><strong>Giọng Nói / Giọng Điệu:</strong> Mô tả cách AI nên "phát âm" (ví dụ: trầm ấm, vui vẻ, cổ trang...).</li>
            <li><strong>Ví Dụ Hội Thoại:</strong> Cung cấp vài cặp ví dụ "User: ..." và "Character: ..." để AI học theo phong cách của bạn.</li>
            <li>Nhấn <strong className="text-green-600 dark:text-green-400">"Tạo Nhân Vật"</strong> (hoặc "Lưu Thay Đổi" nếu bạn đang sửa).</li>
          </ul>
        </GuideSection>

        <GuideSection title="3. Bắt Đầu Trò Chuyện" icon="fas fa-comments">
          <p>Sau khi tạo, nhân vật sẽ xuất hiện trên màn hình chính.</p>
          <ul className="list-disc list-inside ml-2 space-y-1.5">
            <li>Nhấn vào ảnh đại diện hoặc tên nhân vật để mở màn hình chat.</li>
            <li>Giao diện chat tương tự các ứng dụng nhắn tin quen thuộc. Nhập tin nhắn của bạn vào ô ở dưới và nhấn nút gửi <i className="fas fa-paper-plane"></i>.</li>
            <li>AI sẽ phản hồi dựa trên "tính cách" bạn đã định nghĩa.</li>
            <li>Trong màn hình chat, bạn có thể nhấn nút <i className="fas fa-ellipsis-v"></i> (menu) để <strong className="text-orange-500">Sửa Hồ Sơ</strong> nhân vật hoặc <strong className="text-red-500">Xóa Lịch Sử</strong> trò chuyện.</li>
          </ul>
        </GuideSection>
        
        <GuideSection title="4. Quản Lý & Nhập/Xuất Nhân Vật" icon="fas fa-users-cog">
            <p>Sử dụng các nút chức năng trên màn hình danh sách nhân vật:</p>
            <ul className="list-disc list-inside ml-2 space-y-1.5">
                <li><strong><i className="fas fa-users-cog"></i> Quản Lý N.Vật:</strong> Mở cửa sổ quản lý. Tại đây bạn có thể:
                    <ul className="list-circle list-inside ml-4 space-y-1 mt-1">
                        <li>Chọn một nhân vật từ danh sách.</li>
                        <li><strong>Lưu Nhân Vật Ra File JSON:</strong> Xuất định nghĩa nhân vật đã chọn ra file .json để lưu trữ hoặc chia sẻ.</li>
                        <li><strong>Lưu Nhân Vật Vào Slot Trình Duyệt:</strong> Lưu nhân vật đã chọn vào một "slot" trong bộ nhớ trình duyệt với tên bạn đặt.</li>
                        <li>Xóa các nhân vật hiện có.</li>
                    </ul>
                </li>
                <li><strong><i className="fas fa-upload"></i> Nhập N.Vật:</strong> Mở cửa sổ nhập. Bạn có thể:
                     <ul className="list-circle list-inside ml-4 space-y-1 mt-1">
                        <li>Tải nhân vật từ file JSON đã xuất trước đó.</li>
                        <li>Tải nhân vật từ một slot đã lưu trong trình duyệt.</li>
                    </ul>
                </li>
            </ul>
        </GuideSection>

        <GuideSection title="5. Các Thiết Lập Khác" icon="fas fa-cogs">
          <ul className="list-disc list-inside ml-2 space-y-1.5">
            <li><strong><i className="fas fa-fire-alt mr-1"></i> Chế Độ NSFW:</strong> (Biểu tượng <i className="fas fa-shield-alt"></i> nếu tắt) Tùy chỉnh mức độ nội dung người lớn (sử dụng có trách nhiệm và theo quy định của Google Gemini).</li>
            <li><strong><i className="fas fa-cogs mr-1"></i> Cài Đặt Chung:</strong> Thay đổi giao diện Sáng/Tối, kích thước chữ.</li>
          </ul>
        </GuideSection>
        
        <GuideSection title="Mẹo Nhỏ Cho Cuộc Trò Chuyện Thú Vị" icon="fas fa-lightbulb">
          <ul className="list-disc list-inside ml-2 space-y-1.5">
            <li><strong>Định nghĩa tính cách rõ ràng:</strong> Cung cấp cho AI càng nhiều thông tin và ví dụ về nhân vật, cuộc trò chuyện sẽ càng "thật" và thú vị.</li>
            <li><strong>Thử nghiệm:</strong> Đừng ngại tạo nhiều nhân vật với các tính cách khác nhau để xem AI thể hiện thế nào.</li>
            <li><strong>Nếu AI "lạc đề":</strong> Bạn có thể sửa lại hồ sơ nhân vật, cung cấp thêm ví dụ hội thoại, hoặc xóa lịch sử chat và bắt đầu lại.</li>
            <li><strong>Kiên nhẫn:</strong> Đôi khi AI cần vài lượt chat để "hiểu" rõ hơn về nhân vật và ngữ cảnh.</li>
          </ul>
        </GuideSection>

        <p className="mt-8 text-center text-lg font-semibold text-primary dark:text-primary-light">
            Chúc bạn có những cuộc trò chuyện AI đầy sáng tạo và vui vẻ!
        </p>
      </div>
      <div className="mt-8 flex justify-end">
        <Button onClick={onClose} size="lg" variant="primary" className="px-8 py-3">
            <i className="fas fa-check-circle mr-2"></i>Đã Hiểu!
        </Button>
      </div>
    </Modal>
  );
};

export default GuideModal;