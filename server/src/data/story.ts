import { StoryEndingType } from '@shared';

export interface StoryChapterData {
  chapter: number;
  title: string;
  location: string;
  openingEvent: string;
  climaxEvent: string;
  summary: string;
  majorNPCs: { name: string; role: string; description: string }[];
}

// Địa danh dùng đúng bản đồ đang chơi; các hồi 4-7 kể tuyến Thiên Khế trên nền các vùng này.
export const STORY_CHAPTERS: Record<number, StoryChapterData> = {
  1: {
    chapter: 1,
    title: 'Thanh Khê: Mảnh Ký Ức Đầu Tiên',
    location: 'Làng và Rừng Thanh Khê',
    openingEvent: 'Linh khí đổi dòng, sói rừng phát cuồng. Trưởng Lão nhờ bạn bảo vệ người đi hái thuốc và tìm nguồn cơn.',
    climaxEvent: 'Xích Nha Lang Vương gục xuống; mảnh Thiên Thư trong nanh nó giữ nguyên lời hứa bạn vừa nói với dân làng.',
    summary: 'Bạn cứu Thanh Khê và nhận ra mảnh Thiên Thư có thể lưu một ký ức mà Thiên Khế chưa kịp lấy. Liễu Muội khuyên hãy giữ nó cho một người có thể quên mình là ai.',
    majorNPCs: [
      { name: 'Trưởng Lão Thanh Khê', role: 'Người dẫn đường', description: 'Biết đường rừng và tin ký ức về quê nhà cũng đáng giữ như mạng sống.' },
      { name: 'Dược Sĩ Liễu Muội', role: 'Người cứu chữa', description: 'Chữa người bị thú tấn công, ghi tên họ để không ai biến mất khỏi ký ức của làng.' },
    ],
  },
  2: {
    chapter: 2,
    title: 'Thanh Vân: Lời Thề Không Quên',
    location: 'Thanh Vân Kiếm Tông',
    openingEvent: 'Thanh Vân đón cả Kiếm, Pháp, Thể tu. Một trưởng lão vừa đột phá lại không còn nhận ra người thân.',
    climaxEvent: 'Bạn giữ lại chân danh của trưởng lão trong Thiên Thư; Huyền Giáp Linh Quy thôi chống trận và viên Trúc Cơ Đan được trao trước lần đột phá.',
    summary: 'Thí luyện cho bạn pháp khí hợp hướng tu. Chưởng Môn xác nhận nhiều người mất ký ức sau khi vượt cảnh giới; lời thề giúp một người nhớ lại đã mở đường điều tra Thiên Khế.',
    majorNPCs: [
      { name: 'Đạo Sĩ Tiêu Dao', role: 'Người dạy thí luyện', description: 'Cho ba hướng tu cùng quyền qua sơn môn và chọn pháp khí của mình.' },
      { name: 'Chưởng Môn Thanh Vân', role: 'Nhân chứng', description: 'Từng xem việc lãng quên là giá của trường sinh, nay nhờ bạn ghi lại tên người bị quên.' },
    ],
  },
  3: {
    chapter: 3,
    title: 'Đan Hà: Lò Đan Tẩy Trí',
    location: 'Đan Hà Cốc',
    openingEvent: 'Liễu Nhược Vân phát hiện thuốc phát cho đệ tử chứa dược chất làm ký ức phai nhanh hơn.',
    climaxEvent: 'Xích Luyện Đan Sư bị đánh bại; mẫu cấm đan và lời khai được lưu lại thay vì để lò lửa thiêu mất.',
    summary: 'Bạn học cách nhận biết cấm đan, lấy chứng cứ từ Đan Hà và công bố nó cùng Đan Tôn. Thiên Khế không chỉ là luật trời: con người đã lợi dụng nó để điều khiển nhau.',
    majorNPCs: [
      { name: 'Đan Tôn Liễu Nhược Vân', role: 'Người đối chứng', description: 'Phân biệt dược cứu người với cấm đan và giữ mẫu thuốc làm bằng chứng.' },
      { name: 'Xích Luyện Đan Sư', role: 'Kẻ che giấu', description: 'Dùng lò đan và lời hứa tăng tu vi để tước ký ức của người khác.' },
    ],
  },
  4: {
    chapter: 4,
    title: 'Cổ Kiếm Di Tích: Lời Chứng Của Tàn Hồn',
    location: 'Cổ Kiếm Di Tích',
    openingEvent: 'Kiếm Hồn Viễn Cổ gọi những linh hồn bị thanh trừng về đối chiếu lời khắc trên bia với lời kể của người sống.',
    climaxEvent: 'Sau trận với Cổ Kiếm Tôn Giả, bia mộ hiện rõ: Thiên Khế từng lấy ký ức của cả hai phe trong cùng một cuộc chiến.',
    summary: 'Bằng chứng từ văn bia nối với cấm đan Đan Hà. Những tàn hồn không cần bạn trả thù; họ muốn tên và lựa chọn của mình được nhớ đúng.',
    majorNPCs: [
      { name: 'Kiếm Hồn Viễn Cổ', role: 'Nhân chứng lịch sử', description: 'Giữ lời khai của người bị xóa tên khỏi sử sách.' },
      { name: 'Cổ Kiếm Tôn Giả', role: 'Người canh bia', description: 'Thử lòng người đến trước khi cho các tàn hồn lên tiếng.' },
    ],
  },
  5: {
    chapter: 5,
    title: 'U Minh Vực: Rèn Lấy Đạo Tâm',
    location: 'U Minh Vực',
    openingEvent: 'Những người bị gọi là tà tu giữ lò rèn pháp bảo và ký ức của người thân ở đất U Minh.',
    climaxEvent: 'U Minh Quỷ Đế chấp nhận thử thách của bạn, trao pháp bảo theo hướng Kiếm, Pháp hoặc Thể và giao một ký ức được bảo toàn.',
    summary: 'Bạn dùng U Minh Ma Thạch rèn vật bản mệnh, hiểu rằng sức mạnh không buộc phải đổi bằng sự vô tình. U Minh đồng ý góp sức khi bạn lên đài Thiên Khế.',
    majorNPCs: [
      { name: 'U Minh Giáo Chủ', role: 'Người giữ lò rèn', description: 'Che chở người bị khước từ và cho ba hướng tu cùng quyền rèn bảo vật.' },
      { name: 'U Minh Quỷ Đế', role: 'Người thử đạo tâm', description: 'Không đòi bạn theo phe mình, chỉ đòi bạn nhớ vì ai mình chiến đấu.' },
    ],
  },
  6: {
    chapter: 6,
    title: 'Kính Tâm: Hàn Ngọc Giữ Chân Danh',
    location: 'Kính Tâm Cảnh',
    openingEvent: 'Trong gương có hàn ngọc niêm phong ký ức, nhưng ảo ảnh bắt chước cả người bạn từng yêu quý.',
    climaxEvent: 'Tâm ma bị khuất phục. Chân danh đã niêm phong vẫn còn nguyên, chứng minh ký ức có thể qua thử thách Thiên Khế.',
    summary: 'Tiếng Vọng giúp bạn phân biệt hồi ức thật với ảo ảnh và đặt ký ức vào hàn ngọc trước khi đến long mạch. Người đã mất được nhớ tới mà không cần tự làm đau mình thêm.',
    majorNPCs: [
      { name: 'Tiếng Vọng Ký Ức', role: 'Người dẫn hồi tưởng', description: 'Đọc lại chân danh và dẫn bạn qua những ký ức bị gương bóp méo.' },
      { name: 'Kính Tâm Ma Hoàng', role: 'Tâm ma', description: 'Dùng nỗi sợ quên người thân để dụ bạn bỏ chính mình.' },
    ],
  },
  7: {
    chapter: 7,
    title: 'Long Mạch Thiên Sơn: Hai Hồi Phá Trụ',
    location: 'Long Mạch Thiên Sơn',
    openingEvent: 'Hồi một: Sơn Thần chỉ nơi các trụ Thiên Khế hút linh hồn qua long mạch khi tu sĩ đột phá.',
    climaxEvent: 'Hồi hai: các trụ bị cắt khỏi long mạch; Chân Long chấp nhận để nhân thế tự dưỡng mạch mà không hiến ký ức.',
    summary: 'Bạn lần ra cơ chế thu hoạch linh hồn rồi cùng người Thanh Vân, Đan Hà và U Minh phá trụ. Sơn Thần niêm phong vết nứt để lựa chọn cuối không hủy ngay cõi phàm.',
    majorNPCs: [
      { name: 'Sơn Thần Thiên Sơn', role: 'Người giữ long mạch', description: 'Chỉ vị trí trụ và xác nhận có cách chữa mạch sau khi Thiên Khế đổi thay.' },
      { name: 'Long Mạch Chân Long', role: 'Người giám hộ', description: 'Thử xem bạn có bảo vệ được đất trời ngoài việc đánh bại kẻ thù.' },
    ],
  },
  8: {
    chapter: 8,
    title: 'Thiên Khế Đài: Ba Con Đường',
    location: 'Thiên Khế Đài',
    openingEvent: 'Thiên Thư, chứng cứ và hàn ngọc đã đến trước người canh giữ. Ông ta giải thích cái giá của từng kết cục.',
    climaxEvent: 'Thiên Khế Chấp Pháp Giả gục xuống. Bạn đánh dấu mốc thế giới trước lựa chọn để sau hoạt cảnh còn tiếp tục tu luyện.',
    summary: 'Thắng người canh giữ không tự quyết định vận mệnh. Bạn có thể phi thăng và đánh đổi ký ức, phá Thiên Khế bằng chứng cứ, hoặc hiến tu vi trong câu chuyện để chữa lành long mạch.',
    majorNPCs: [
      { name: 'Thiên Khế Chấp Pháp Giả', role: 'Người canh khế', description: 'Bảo vệ luật cũ và phải nói rõ hậu quả trước khi bạn chọn.' },
      { name: 'Sơn Thần Thiên Sơn', role: 'Người làm chứng', description: 'Giữ mốc long mạch trước quyết định để cuộc tu luyện vẫn tiếp tục sau truyện.' },
    ],
  },
};

export interface StoryEndingDetail {
  type: StoryEndingType;
  title: string;
  description: string;
  epilogue: string;
  unlockedTitle: string;
  preparationQuestId: string | null;
  preparationHint: string;
}

// Save keys stay unchanged for characters created before 1.0.2.
export const STORY_ENDINGS: Record<StoryEndingType, StoryEndingDetail> = {
  [StoryEndingType.MAINTAIN_PACT]: {
    type: StoryEndingType.MAINTAIN_PACT,
    title: 'Vô Tình Phi Thăng',
    description: 'Bước qua cổng Thượng Giới bằng cách trao ký ức của mình cho Thiên Khế. Nhân thế còn trật tự cũ, nhưng bạn dần quên người từng đi cùng.',
    epilogue: 'Trên trời cao, bạn có thể gọi tên mọi cảnh giới mà không gọi nổi tên Liễu Muội. Mảnh Thiên Thư vẫn sáng: một ngày nào đó, bạn có thể trở về đọc lại lời hứa tại Thanh Khê.',
    unlockedTitle: 'Vô Tình Phi Thăng Giả',
    preparationQuestId: null,
    preparationHint: 'Hoàn thành chương 8 để chọn. Ký ức trong hoạt cảnh bị đánh đổi; nhân vật chơi và nhật ký vẫn được giữ.',
  },
  [StoryEndingType.DESTROY_PACT]: {
    type: StoryEndingType.DESTROY_PACT,
    title: 'Nghịch Thiên Phá Đạo',
    description: 'Dùng Thiên Thư và hai lời chứng phá Thiên Khế, trả ký ức cho nhân thế. Long mạch trở nên khó giữ, các phe phải cùng gánh trách nhiệm.',
    epilogue: 'Tên của những người bị xóa hiện lại trên bia. Đan Hà chữa người tỉnh dậy, U Minh mở cổng đón thân quyến, còn bạn ở lại cùng Sơn Thần giữ dòng mạch chưa yên.',
    unlockedTitle: 'Nghịch Thiên Phá Đạo Giả',
    preparationQuestId: 'quest_memory_evidence',
    preparationHint: 'Hoàn thành Hồi Tưởng: Chứng Tích Thiên Khế. Trở lại Đan Hà và Cổ Kiếm Di Tích, nói với hai nhân chứng rồi giao nhiệm vụ.',
  },
  [StoryEndingType.REWRITE_PACT]: {
    type: StoryEndingType.REWRITE_PACT,
    title: 'Luân Hồi Trọng Sinh',
    description: 'Hiến tu vi trong câu chuyện để chữa long mạch và trở về đời phàm cùng ký ức đã giữ. Cảnh giới, trang bị và save đang chơi không bị đặt lại.',
    epilogue: 'Mùa xuân về trên Thanh Khê. Bạn không còn là người đứng trên đỉnh trời trong câu chuyện, nhưng vẫn nhớ tên từng người mình cứu. Khi đóng trang hồi tưởng, bạn tiếp tục tu luyện ở mốc trước quyết định.',
    unlockedTitle: 'Người Gieo Mầm Luân Hồi',
    preparationQuestId: 'quest_memory_rebirth',
    preparationHint: 'Hoàn thành Hồi Tưởng: Hàn Ngọc Luân Hồi. Trở lại Kính Tâm và Long Mạch, nói với hai người giữ ký ức rồi giao nhiệm vụ.',
  },
};

export interface StoryChapterView extends Omit<StoryChapterData, 'climaxEvent'> {
  climaxEvent: string | null;
  isCompleted: boolean;
}

export function getStoryChaptersForProgress(turnedIn: ReadonlySet<string>): StoryChapterView[] {
  return Object.values(STORY_CHAPTERS)
    .filter(({ chapter }) => chapter === 1 || turnedIn.has(`quest_main_${String((chapter - 1) * 3).padStart(2, '0')}`))
    .map((chapter) => {
      const isCompleted = turnedIn.has(`quest_main_${String(chapter.chapter * 3).padStart(2, '0')}`);
      return {
        ...chapter,
        summary: isCompleted ? chapter.summary : chapter.openingEvent,
        climaxEvent: isCompleted ? chapter.climaxEvent : null,
        isCompleted,
      };
    });
}

export interface StoryEndingChoice extends StoryEndingDetail {
  canChoose: boolean;
  missing: string[];
}

export function getEndingChoices(turnedIn: ReadonlySet<string>): StoryEndingChoice[] {
  return Object.values(STORY_ENDINGS).map((ending) => {
    const missing: string[] = [];
    if (!turnedIn.has('quest_main_24')) missing.push('Hoàn thành và giao nhiệm vụ cuối chương 8.');
    if (ending.preparationQuestId && !turnedIn.has(ending.preparationQuestId)) missing.push(ending.preparationHint);
    return { ...ending, canChoose: missing.length === 0, missing };
  });
}

export const DIALOGUE_DATA: Record<string, any[]> = {
  dlg_elder_01: [
    { speaker: 'Trưởng Lão Thanh Khê', text: 'Sói rừng phát cuồng từ đêm linh khí đổi dòng. Hãy cứu người hái thuốc và trở về kể ta nghe điều đạo hữu tìm thấy.' },
    { speaker: 'Trưởng Lão Thanh Khê', text: 'Tên của một người cũng là nhà của họ. Nếu mảnh ngọc thật sự nhớ được, xin đừng bỏ nó.' },
  ],
  dlg_elder_ma_01: [
    { speaker: 'Huyền U Lão Giả', text: 'Đêm nguyệt thực ta nhặt được con và huyết ngọc của Ma Tôn. U Lâm đang gọi tên con; trước khi đi, hãy xem phong ấn ở linh miếu.' },
    { speaker: 'Huyền U Lão Giả', text: 'Huyết mạch không quyết định thiện ác. Tìm ba dấu vết của đàn sói, rồi tự chọn con đường.' },
  ],
  dlg_healer_ma_01: [
    { speaker: 'Dược Sư U Lan', text: 'Huyết ngọc của con làm linh dược đổi màu. Ta sẽ giữ người ở Huyền U Khê bình an khi con vào U Lâm.' },
  ],
  dlg_guard_ma_01: [
    { speaker: 'Huyền Giáp Vệ', text: 'Ta từng phục vụ Ma Tôn. Nếu U Lâm nổi loạn, hãy trở về kể đúng những gì con thấy.' },
  ],
  dlg_healer_01: [
    { speaker: 'Dược Sĩ Liễu Muội', text: 'Ta ghi tên từng người được cứu. Thuốc là để họ sống tiếp, ký ức là để họ biết mình đang sống vì ai.' },
  ],
  dlg_guard_01: [
    { speaker: 'Đội Trưởng Vệ Binh', text: 'Rừng Thanh Khê có Lang Vương. Hãy mang thuốc chữa thương và đi cùng lời dặn của người ở nhà.' },
  ],
  dlg_mentor_01: [
    { speaker: 'Đạo Sĩ Tiêu Dao', text: 'Sơn môn nhận cả Kiếm, Pháp và Thể tu. Khôi lỗi thử định lực; pháp khí thưởng cho ngươi sẽ hợp con đường ngươi chọn.' },
  ],
  dlg_sect_master: [
    { speaker: 'Chưởng Môn Thanh Vân', text: 'Ta vừa đột phá, rồi không nhớ tên người vẫn chờ dưới núi. Xin dùng Thiên Thư ghi lại cho ta trước khi mọi dấu vết mất hẳn.' },
  ],
  dlg_dan_ton: [
    { speaker: 'Đan Tôn Liễu Nhược Vân', text: 'Mẫu cấm đan này khiến người ta quên nhanh hơn. Ta giữ một phần làm chứng; khi cần phá Thiên Khế, hãy trở lại đối chiếu lời ta.' },
  ],
  dlg_sword_spirit: [
    { speaker: 'Kiếm Hồn Viễn Cổ', text: 'Bia ghi chiến thắng, nhưng tàn hồn nhớ cả hai phe đều bị lấy ký ức. Hãy so lời ta với chứng cứ Đan Hà.' },
  ],
  dlg_nether_rebel: [
    { speaker: 'U Minh Giáo Chủ', text: 'Lò rèn của chúng ta làm kiếm, trượng và khí luyện thể. Không ai phải quên người thân để được nhận pháp bảo.' },
  ],
  dlg_inner_voice: [
    { speaker: 'Tiếng Vọng Ký Ức', text: 'Hàn ngọc giữ chân danh qua kiếp nạn. Khi muốn chữa long mạch, hãy trở lại đọc ký ức này trước gương.' },
  ],
  dlg_mountain_god: [
    { speaker: 'Sơn Thần Thiên Sơn', text: 'Trụ trên núi hút linh hồn vào Thiên Khế. Phá trụ rồi, chúng ta vẫn phải chữa vết thương của long mạch; ta sẽ làm chứng cho đường luân hồi.' },
  ],
  dlg_covenant_final: [
    { speaker: 'Thiên Khế Chấp Pháp Giả', text: 'Sau khi ngươi thắng ta, hãy đọc ba cái giá trong Thiên Thư: phi thăng mất ký ức, phá khế phải giữ mạch, luân hồi hiến tu vi trong câu chuyện.' },
    { speaker: 'Thiên Khế Chấp Pháp Giả', text: 'Lựa chọn chỉ mở sau trận cuối. Hai con đường giữ người khác cần lời chứng hoặc hàn ngọc; nếu thiếu, hãy theo nhiệm vụ hồi tưởng.' },
  ],
  dlg_tower_keeper: [
    { speaker: 'Tháp Linh Vạn Cổ', text: 'Cốt truyện đã khép, hành trình tu luyện vẫn tiếp. Trấn Yêu Tháp đang chờ người muốn thử sức và đổi cách chiến đấu.' },
  ],
  dlg_mentor_01_ma: [
    { speaker: 'Ma Sư Vô Trần', text: 'Huyền Ma Tông không xét huyết thống. Kiếm, Pháp và Thể tu đều phải tự giữ bản tâm khi huyết khí trỗi dậy.' },
  ],
  dlg_sect_master_ma: [
    { speaker: 'Huyền Ma Tông Chủ', text: 'Mỗi lần vượt cảnh, tên một môn đồ lại biến mất khỏi huyết bạ. Hãy lưu lời chứng trước khi Thiên Khế xóa nốt dấu mực.' },
  ],
  dlg_dan_ton_ma: [
    { speaker: 'Huyết Đan Tôn', text: 'Trong huyết lô còn cặn cấm đan đổi ký ức lấy tu vi. Ta niêm phong một phần để người mang huyết ngọc đối chứng với Thiên Thư.' },
  ],
  dlg_sword_spirit_ma: [
    { speaker: 'Huyết Kiếm Tàn Hồn', text: 'Bia chiến trường chỉ khắc tên kẻ thắng. Lưỡi kiếm ta giữ cả tên Tiên lẫn Ma đã ngã xuống trong cùng một đêm.' },
  ],
  dlg_nether_rebel_ma: [
    { speaker: 'Cửu U Hộ Pháp', text: 'Người đời gọi chúng ta là tà. Lò rèn Cửu U giữ chân danh của những người bị tước ký ức; hãy mang lời họ ra khỏi vực.' },
  ],
  dlg_inner_voice_ma: [
    { speaker: 'Hồn Kính Chi Ảnh', text: 'Hồn kính chiếu ra điều huyết ngọc không thể kể. Hãy nhìn thật kỹ trước khi chạm vào long mạch.' },
  ],
  dlg_mountain_god_ma: [
    { speaker: 'Huyết Mạch Sơn Linh', text: 'Thiên Khế hút cả tiên linh lẫn ma khí từ núi. Phá trụ rồi vẫn phải chữa mạch đất, nếu không các đời sau sẽ gánh nạn.' },
  ],
  dlg_covenant_final_ma: [
    { speaker: 'Ma Khế Chấp Pháp', text: 'Huyết mạch Ma Tôn không miễn cái giá của lựa chọn. Đọc ba con đường trong Thiên Thư, rồi quyết định điều gì đáng giữ.' },
    { speaker: 'Ma Khế Chấp Pháp', text: 'Ngươi cần lời chứng và hàn ngọc để cứu người khác. Thiếu chúng, hãy quay lại những vùng đã đi qua.' },
  ],
  dlg_tower_keeper_ma: [
    { speaker: 'Trấn Hồn Tháp Linh', text: 'Câu chuyện đã khép, nhưng Trấn Hồn Tháp vẫn thử lòng người tu ma. Vào tháp để mài giũa chiêu thức và giữ tên các cổ hồn.' },
  ],
};
