// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Cốt Truyện 8 Chương & 3 Đại Kết Cục
// ============================================================

import { StoryEndingType, StoryChapterInfo } from '@shared';

export interface StoryChapterData {
  chapter: number;
  title: string;
  location: string;
  openingEvent: string;
  climaxEvent: string;
  summary: string;
  majorNPCs: { name: string; role: string; description: string }[];
}

export const STORY_CHAPTERS: Record<number, StoryChapterData> = {
  1: {
    chapter: 1,
    title: 'Làng Thanh Khê: Dị Biến & Thức Tỉnh',
    location: 'Làng Thanh Khê',
    openingEvent: 'Linh khí đất trời quanh thôn Thanh Khê bỗng nhiên hỗn loạn, dã thú phát cuồng.',
    climaxEvent: 'Tiêu diệt Xích Nha Lang Vương, nhặt được mảnh Thiên Thư đầu tiên bảo lưu ký ức.',
    summary: 'Nhân vật chính bước đầu bước vào con đường tu luyện, cứu dân làng khỏi thảm họa thú dữ và phát hiện bí mật về mảnh Thiên Thư có khả năng lưu giữ ký ức.',
    majorNPCs: [
      { name: 'Trưởng Lão Thanh Khê', role: 'Người Dẫn Đường', description: 'Từng là tu sĩ giang hồ quy ẩn, chỉ điểm bước đầu tu luyện.' },
      { name: 'Dược Sĩ Liễu Muội', role: 'Đồng Môn Lý Tưởng', description: 'Mong muốn dùng y thuật đan dược cứu chữa bách tính phàm trần.' },
      { name: 'Đội Trưởng Vệ Binh', role: 'Đối Thủ Cạnh Tranh', description: 'Thẳng thắn, trọng sức mạnh thực tế hơn đạo thuật huyền ảo.' },
    ],
  },
  2: {
    chapter: 2,
    title: 'Thanh Vân Môn: Khảo Nghiệm & Ký Ức Đánh Mất',
    location: 'Thanh Vân Kiếm Tông',
    openingEvent: 'Bái nhập Thanh Vân Tông, học công pháp kiếm đạo chính thống ngàn năm.',
    climaxEvent: 'Phát hiện nhiều đồng môn sau khi đột phá cảnh giới liền quên sạch quá khứ kiếp phàm.',
    summary: 'Phát hiện quy luật đáng sợ: Mỗi lần tu sĩ đột phá cảnh giới, một phần ký ức của họ bị Thiên Khế bí ẩn tước đoạt.',
    majorNPCs: [
      { name: 'Tiêu Dao Tử', role: 'Sư Phụ Kiếm Tông', description: 'Truyền thụ kiếm đạo nhưng luôn mang vẻ u uất vì quên mất người thương.' },
      { name: 'Thanh Vân Kiếm Si', role: 'Đồng Môn Bi Kịch', description: 'Bị tước sạch ký ức hóa điên trong Kiếm Trũng.' },
    ],
  },
  3: {
    chapter: 3,
    title: 'Đan Hà Cốc: Đan Dược Cấm Kỵ',
    location: 'Đan Hà Cốc',
    openingEvent: 'Truy tìm phương thuốc chữa bệnh mất trí tại thủ phủ đan đạo.',
    climaxEvent: 'Vạch trần âm mưu dùng đan dược cấm kỵ để kiểm soát tâm trí của Xích Luyện Đan Sư.',
    summary: 'Hiểu rõ hơn về cách các thế lực chính đạo âm thầm dung túng việc tước đoạt ký ức để dễ dàng duy trì trật tự môn phái.',
    majorNPCs: [
      { name: 'Đan Tôn Liễu Nhược Vân', role: 'Minh Sư Đan Đạo', description: 'Căm ghét cấm đan, tận tụy tìm kiếm giải dược cho nhân gian.' },
    ],
  },
  4: {
    chapter: 4,
    title: 'Cổ Kiếm Di Tích: Lịch Sử Bị Bôi Xóa',
    location: 'Cổ Kiếm Di Tích',
    openingEvent: 'Bước vào di tích viễn cổ bị phong tỏa suốt ba ngàn năm.',
    climaxEvent: 'Đấu kiếm cùng Cổ Kiếm Tôn Giả và tìm ra mảnh Thiên Thư thứ hai.',
    summary: 'Văn bia cổ hé lộ: Cuộc chiến chính ma thực chất là một kịch bản được dàn dựng để che giấu nguồn gốc thực sự của giao ước Thiên Khế.',
    majorNPCs: [
      { name: 'Kiếm Hồn Viễn Cổ', role: 'Chứng Nhân Lịch Sử', description: 'Lưu giữ ký ức về thời kỳ trước khi Thiên Khế được lập nên.' },
    ],
  },
  5: {
    chapter: 5,
    title: 'U Minh Vực: Tiếng Nói Của Kẻ Bị Khước Từ',
    location: 'U Minh Vực',
    openingEvent: 'Vượt qua biên giới chính ma, bước chân vào vùng đất U Minh hoang tàn.',
    climaxEvent: 'Hội ngộ U Minh Quỷ Đế và xem xét lại toàn bộ ranh giới thiện ác.',
    summary: 'Nhận ra những người bị gán mác "tà tu" thực chất là những kẻ kiên quyết bảo vệ ký ức và nhân tính của mình, không chịu khuất phục giao ước.',
    majorNPCs: [
      { name: 'U Minh Quỷ Đế', role: 'Thủ Lĩnh Phản Kháng', description: 'Lạnh lùng, quyết đoán nhưng hết lòng bảo bọc những người bất tuân Thiên Khế.' },
    ],
  },
  6: {
    chapter: 6,
    title: 'Kính Tâm Cảnh: Đối Diện Tâm Ma',
    location: 'Kính Tâm Cảnh',
    openingEvent: 'Chiếu mình vào gương thần Kính Tâm, đối diện với toàn bộ ký ức đã thu thập.',
    climaxEvent: 'Quyết chiến và thuần phục Kính Tâm Ma Hoàng (tâm ma của chính bản thân).',
    summary: 'Nhân vật chính vượt qua nỗi sợ hãi, chấp nhận những tổn thương trong quá khứ để hoàn thiện tâm cảnh trước ngưỡng cửa phi thăng.',
    majorNPCs: [
      { name: 'Tiếng Vọng Ký Ức', role: 'Gương Soi Bản Thể', description: 'Dẫn dắt người tu luyện nhìn thẳng vào sự thật không trốn tránh.' },
    ],
  },
  7: {
    chapter: 7,
    title: 'Long Mạch Thiên Sơn: Huyết Chiến Băng Phong',
    location: 'Long Mạch Thiên Sơn',
    openingEvent: 'Các phe phái đồng loạt hội tụ đỉnh Thiên Sơn tranh đoạt quyền kiểm soát linh mạch.',
    climaxEvent: 'Khuất phục Long Mạch Chân Long, bảo toàn linh mạch không bị bạo phát hủy diệt cõi phàm.',
    summary: 'Tìm ra phương pháp bảo vệ linh mạch mà không nhất thiết phải hy sinh ký ức của tu sĩ.',
    majorNPCs: [
      { name: 'Sơn Thần Thiên Sơn', role: 'Người Thủ Hộ Đất Trời', description: 'Chỉ dẫn lối lên đỉnh Thiên Khế Đài cao nhất.' },
    ],
  },
  8: {
    chapter: 8,
    title: 'Thiên Khế Đài: Quyết Định Tương Lai',
    location: 'Thiên Khế Đài',
    openingEvent: 'Mang theo tất cả mảnh Thiên Thư bước lên Thiên Khế Đài tối thượng.',
    climaxEvent: 'Đại chiến Thiên Khế Chấp Pháp Giả và lựa chọn kết cục cho toàn bộ thế giới.',
    summary: 'Người chơi đưa ra quyết định tối thượng: Duy Trì, Phá Bỏ hoặc Viết Lại giao ước Thiên Khế.',
    majorNPCs: [
      { name: 'Thiên Khế Chấp Pháp Giả', role: 'Thần Linh Giao Ước', description: 'Đại diện cho ý chí trật tự sắt đá của trời đất viễn cổ.' },
    ],
  },
};

export interface StoryEndingDetail {
  type: StoryEndingType;
  title: string;
  description: string;
  epilogue: string;
  unlockedTitle: string;
}

export const STORY_ENDINGS: Record<StoryEndingType, StoryEndingDetail> = {
  [StoryEndingType.MAINTAIN_PACT]: {
    type: StoryEndingType.MAINTAIN_PACT,
    title: 'Duy Trì Thiên Khế (Thuận Thiên Hành Đạo)',
    description: 'Chấp nhận trật tự cổ xưa: Linh mạch được bảo hộ vĩnh hằng, nhưng tu sĩ mỗi lần đột phá vẫn tiếp tục quên đi ký ức.',
    epilogue: 'Thiên địa thái bình trong trật tự nghiêm mật. Bạn trở thành Chấp Pháp Giả đời kế tiếp, đứng trên đỉnh cao cô độc nhìn thế gian luân hồi.',
    unlockedTitle: 'Thiên Khế Chấp Pháp Tôn',
  },
  [StoryEndingType.DESTROY_PACT]: {
    type: StoryEndingType.DESTROY_PACT,
    title: 'Phá Bỏ Thiên Khế (Nghịch Thiên Cải Mệnh)',
    description: 'Đập tan đài Thiên Khế, giải phóng toàn bộ ký ức bị giam giữ cho muôn vạn sinh linh.',
    epilogue: 'Mọi người tìm lại được người thương và nguồn cội của mình. Dù linh mạch trở nên bất ổn và nhiều cuộc tranh đoạt nổ ra, con người đã thực sự tự do sống với trọn vẹn ký ức.',
    unlockedTitle: 'Vô Hạn Tự Do Đạo Tổ',
  },
  [StoryEndingType.REWRITE_PACT]: {
    type: StoryEndingType.REWRITE_PACT,
    title: 'Viết Lại Thiên Khế: Vạn Đạo Trường Sinh',
    description: 'Sử dụng toàn bộ mảnh Thiên Thư tái lập giao ước mới: Ký ức hòa quyện cùng linh khí, người tu luyện tự gánh vác trách nhiệm dưỡng mạch mà không cần đánh đổi bản ngã.',
    epilogue: 'Một kỷ nguyên tu tiên mới mở ra. Tu sĩ tu hành không còn lạnh lùng vô cảm mà tràn đầy nhân tính và tình thương. Bạn được muôn đời tôn xưng là bậc khai sáng Vạn Đạo Trường Sinh.',
    unlockedTitle: 'Vạn Đạo Trường Sinh Đại Đế',
  },
};

export const DIALOGUE_DATA: Record<string, any[]> = {
  dlg_elder_01: [
    { speaker: 'Trưởng Lão Thanh Khê', text: 'Chào đạo hữu trẻ tuổi. Bìa rừng gần đây có tiếng gầm lạ, lũ sói xám thường xuyên tấn công dân làng.' },
    { speaker: 'Trưởng Lão Thanh Khê', text: 'Đạo hữu hãy cẩn trọng, nếu có thể tiêu diệt vài con sói xám để bảo vệ làng, thôn dân sẽ vô cùng cảm kích!' },
  ],
  dlg_healer_01: [
    { speaker: 'Dược Sĩ Liễu Muội', text: 'Ta đang rất cần Linh Thảo để luyện Hồi Nguyên Đan cho những người bị thương. Đạo hữu có thể giúp ta hái vài nhánh quanh đây không?' },
  ],
  dlg_guard_01: [
    { speaker: 'Đội Trưởng Vệ Binh', text: 'Bên ngoài rừng Thanh Khê rất nguy hiểm. Nếu chưa nắm vững công pháp, chớ có đi sâu vào bên trong!' },
  ],
  dlg_mentor_01: [
    { speaker: 'Đạo Sĩ Tiêu Dao', text: 'Kiếm ý Thanh Vân lấy sự thanh thoát khoáng đạt làm gốc. Muốn nhập môn, trước hết hãy chứng minh định lực qua các khôi lỗi luyện kiếm!' },
  ],
  dlg_sect_master: [
    { speaker: 'Chưởng Môn Thanh Vân', text: 'Ngươi mang theo mảnh ngọc Thiên Thư trên người... Đây là điềm lành hay đại kiếp của tông môn?' },
  ],
  dlg_dan_ton: [
    { speaker: 'Đan Tôn Liễu Nhược Vân', text: 'Hương đan có thể cứu người, cũng có thể hại người. Hãy tỉnh táo trước những viên đan dược hứa hẹn tăng tiến tu vi một cách quá dễ dàng.' },
  ],
  dlg_sword_spirit: [
    { speaker: 'Kiếm Hồn Viễn Cổ', text: 'Ba ngàn năm rồi mới có người bước vào di tích này. Kẻ phàm, ngươi đến để tìm kiếm kiếm pháp hay tìm lại sự thật đã bị chôn vùi?' },
  ],
  dlg_nether_rebel: [
    { speaker: 'U Minh Giáo Chủ', text: 'Họ gọi chúng ta là ma đạo chỉ vì chúng ta không muốn quên đi người thân của mình. Ngươi thấy đó, ai mới là kẻ tàn nhẫn?' },
  ],
  dlg_inner_voice: [
    { speaker: 'Tiếng Vọng Ký Ức', text: 'Trong tấm gương này, ngươi không thể nói dối. Hãy nhìn thẳng vào tâm ma của mình và vượt qua nó!' },
  ],
  dlg_mountain_god: [
    { speaker: 'Sơn Thần Thiên Sơn', text: 'Đỉnh tuyết lạnh giá này là nơi phong ấn long mạch và đài Thiên Khế. Hãy chuẩn bị tâm lý trước khi bước lên đỉnh cao nhất.' },
  ],
  dlg_covenant_final: [
    { speaker: 'Thiên Khế Chấp Pháp Giả', text: 'Ngươi đã vượt qua muôn ngàn kiếp nạn để đến trước mặt ta. Giờ đây, vận mệnh của toàn thế giới nằm trong tay ngươi.' },
    {
      speaker: 'Thiên Khế Chấp Pháp Giả',
      text: 'Hãy lựa chọn kết cục cho giao ước ngàn năm này!',
      choices: [
        'Duy Trì Thiên Khế: Giữ vững trật tự cổ xưa',
        'Phá Bỏ Thiên Khế: Giải phóng toàn bộ ký ức',
        'Viết Lại Thiên Khế: Vạn Đạo Trường Sinh dung hợp',
      ],
    },
  ],
  dlg_tower_keeper: [
    { speaker: 'Tháp Linh Vạn Cổ', text: 'Chào mừng cường giả đến với Trấn Yêu Tháp! Nơi đây giam giữ những ma thần và yêu vương hùng mạnh nhất lịch sử. Hãy thử sức mình!' },
  ],
};
