
import { ChangelogEntry } from './types';

// Helper function to get a date a few days ago for more realistic changelog
const getDateDaysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
};

export const changelogData: ChangelogEntry[] = [
  {
    version: "1.3.3", // New version for GIF avatar feature
    date: new Date().toISOString().split('T')[0], // Today's date
    title: "Nâng Cấp Avatar Nhân Vật: Hỗ Trợ Ảnh Động GIF!",
    changes: [
      {
        type: 'new',
        description: "Thêm tính năng sử dụng ảnh đại diện động (GIF) cho nhân vật, làm cho nhân vật trở nên sống động hơn.",
        details: [
          "Người dùng có thể cung cấp URL trực tiếp đến file GIF cho ảnh đại diện động.",
          "Hỗ trợ tải lên file GIF từ thiết bị của người dùng để làm ảnh đại diện động.",
          "Ảnh GIF sẽ được ưu tiên hiển thị. Nếu không có GIF, ứng dụng sẽ hiển thị ảnh tĩnh hoặc chữ cái đầu của tên nhân vật như trước.",
          "Bổ sung nút 'Xóa GIF' trong màn hình tạo/sửa nhân vật để dễ dàng gỡ bỏ ảnh động."
        ]
      },
      {
        type: 'info',
        description: "Việc hiển thị ảnh GIF có thể tiêu tốn thêm một chút tài nguyên hệ thống so với ảnh tĩnh, tùy thuộc vào kích thước và độ phức tạp của GIF."
      }
    ]
  },
  {
    version: "1.3.2", 
    date: getDateDaysAgo(1), 
    title: "Gộp Chức Năng Quản Lý & Nhập Nhân Vật",
    changes: [
      {
        type: 'improved',
        description: "Hợp nhất hai cửa sổ 'Quản Lý Nhân Vật' và 'Nhập Nhân Vật' thành một cửa sổ duy nhất: 'Quản Lý & Nhập/Xuất Nhân Vật'.",
        details: [
          "Giao diện mới gộp tất cả các chức năng liên quan đến quản lý, lưu trữ (vào slot hoặc file JSON), và nhập/tải nhân vật vào một nơi.",
          "Cải thiện trải nghiệm người dùng bằng cách giảm số lượng cửa sổ bật lên và tập trung các thao tác tương tự."
        ]
      },
      {
        type: 'info',
        description: "Nút 'Quản Lý Nhân Vật' và 'Nhập Nhân Vật' ở màn hình Hồ Sơ giờ đây sẽ cùng mở ra cửa sổ hợp nhất mới này."
      }
    ]
  },
  {
    version: "1.3.1", 
    date: getDateDaysAgo(2), 
    title: "Tích Hợp Sâu & Nhập Liệu Tiện Lợi",
    changes: [
      {
        type: 'new',
        description: "Hỗ trợ mở file .json trực tiếp bằng ứng dụng trên Android để nhập nhân vật.",
        details: [
          "Khi bạn nhấn vào một file .json trên thiết bị Android, hệ thống sẽ gợi ý mở bằng ứng dụng này.",
          "Ứng dụng sẽ tự động đọc file và nhập dữ liệu nhân vật (bao gồm cả lịch sử chat nếu có trong file)."
        ]
      },
      {
        type: 'improved',
        description: "Cải thiện luồng xử lý nhập file JSON khi mở từ bên ngoài.",
        details: [
          "Toast message rõ ràng hơn trong quá trình xử lý file.",
          "Tự động điều hướng về màn hình chính và bỏ chọn nhân vật đang hoạt động (nếu có) sau khi nhập file để người dùng dễ dàng thấy danh sách nhân vật được cập nhật."
        ]
      }
    ]
  },
  {
    version: "1.3.0", 
    date: getDateDaysAgo(3), 
    title: "Nâng Cấp Giao Diện & Thêm Nhật Ký Thay Đổi!",
    changes: [
      { 
        type: 'new', 
        description: "Thêm mục Nhật Ký Thay Đổi (Changelog) vào Cài Đặt Ứng Dụng.",
        details: ["Bạn đang xem nó đây! Giờ đây bạn có thể theo dõi các tính năng mới và cải tiến của ứng dụng."]
      },
      { 
        type: 'improved', 
        description: "Thiết kế lại menu Cài Đặt Ứng Dụng chính.",
        details: ["Giao diện trực quan hơn, dễ dàng truy cập các mục cài đặt con."]
      },
    ]
  },
  {
    version: "1.2.0",
    date: getDateDaysAgo(6), 
    title: "AI Thông Minh Hơn", 
    changes: [
      { 
        type: 'new', 
        description: "Nâng cấp bộ não AI: Trí Nhớ & Cảm Xúc Động.",
        details: [
            "AI giờ đây có thể ghi nhớ các chi tiết quan trọng từ cuộc trò chuyện (nếu bật Trí Nhớ).",
            "Cảm xúc của AI có thể thay đổi dựa trên tương tác, ảnh hưởng đến lời nói (nếu bật Cảm Xúc Động).",
            "Bật/tắt các tính năng này trong Cài Đặt AI."
        ]
      },
      { type: 'improved', description: "Cải thiện giao diện quản lý API Key, hỗ trợ nhiều key Gemini Custom." },
    ]
  },
  {
    version: "1.1.0",
    date: getDateDaysAgo(10), 
    title: "Cá Nhân Hóa & Quản Lý Mạnh Mẽ",
    changes: [
      { 
        type: 'new', 
        description: "Hồ Sơ Người Dùng: Tùy chỉnh tên và ảnh đại diện của BẠN.",
        details: ["AI sẽ nhận biết và xưng hô với bạn bằng tên bạn đã đặt."]
      },
      { 
        type: 'new', 
        description: "Quản lý nhân vật nâng cao: Lưu/Tải nhân vật vào các 'slot' trong trình duyệt.",
        details: ["Dễ dàng chuyển đổi hoặc sao lưu các nhân vật yêu thích mà không cần file JSON."]
      },
      { type: 'new', description: "Nhập/Xuất nhiều nhân vật cùng lúc từ một file JSON duy nhất (bao gồm cả tùy chọn xuất kèm lịch sử chat)." },
      { type: 'improved', description: "Cải tiến giao diện chọn và tạo nhân vật." },
    ]
  },
  {
    version: "1.0.0",
    date: getDateDaysAgo(17), 
    title: "Phiên Bản Đầu Tiên Ra Mắt!",
    changes: [
      { type: 'new', description: "Character AI Simulator chính thức ra mắt!" },
      { type: 'new', description: "Tạo và trò chuyện với nhân vật AI sử dụng Google Gemini." },
      { type: 'new', description: "Hỗ trợ tùy chỉnh tên, ảnh, tính cách, lời chào, giọng điệu, và ví dụ hội thoại." },
      { type: 'new', description: "Lưu và tải nhân vật từ file JSON." },
      { type: 'new', description: "Giao diện Sáng/Tối và tùy chỉnh kích thước chữ." },
      { type: 'new', description: "Tích hợp tính năng Tìm kiếm Web cho AI." },
      { type: 'new', description: "Dán hình ảnh trực tiếp vào khung chat." },
    ]
  }
];
