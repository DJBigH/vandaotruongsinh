// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - 56 Nhiệm Vụ (Quests)
// 24 Chính Tuyến (8 Chương) | 24 Nhánh Phụ | 8 Ẩn Tuyến
// ============================================================

import { CultivationPath, QuestType, type QuestObjective } from '@shared';

export interface QuestObjectiveDef {
  id: string;
  description: string;
  type: 'KILL' | 'COLLECT' | 'TALK' | 'EXPLORE' | 'CRAFT' | 'REACH_REALM';
  targetId?: string;
  required: number;
}

export interface QuestRewardDef {
  exp: number;
  gold: number;
  cultivationExp: number;
  items: { itemTemplateId: string; quantity: number }[];
}

export interface QuestTemplate {
  id: string;
  name: string;
  description: string;
  type: QuestType;
  chapter: number;
  objectives: QuestObjectiveDef[];
  rewards: QuestRewardDef;
  pathRewardItems?: Partial<Record<CultivationPath, QuestRewardDef['items']>>;
  prerequisiteQuestId?: string;
  prerequisites?: string[];
}

export function getQuestRewards(template: QuestTemplate, path: CultivationPath): QuestRewardDef {
  return {
    ...template.rewards,
    items: [...template.rewards.items, ...(template.pathRewardItems?.[path] ?? [])],
  };
}

export function reconcileQuestObjectives(template: QuestTemplate, saved: unknown): QuestObjective[] {
  const previous = Array.isArray(saved) ? saved as QuestObjective[] : [];
  return template.objectives.map((definition) => {
    const old = previous.find((objective) => objective.id === definition.id &&
      objective.type === definition.type && objective.targetId === definition.targetId);
    return {
      ...definition,
      current: old && Number.isFinite(old.current) ? Math.min(definition.required, Math.max(0, old.current)) : 0,
    };
  });
}

export const QUEST_TEMPLATES: Record<string, QuestTemplate> = {
  // ====================================================
  // CHƯƠNG 1: LÀNG THANH KHÊ (Main: 01-03, Side: 01-03, Hidden: 01)
  // ====================================================
  quest_main_01: {
    id: 'quest_main_01',
    name: 'Khởi Đầu Tu Đạo: Dị Biến Thanh Khê',
    description: 'Thanh Khê thôn phát sinh dị biến, linh khí hỗn loạn làm thú dữ phát cuồng.',
    type: QuestType.MAIN,
    chapter: 1,
    objectives: [
      { id: 'obj_talk_elder', description: 'Đàm thoại với Trưởng Lão Thanh Khê', type: 'TALK', targetId: 'npc_elder', required: 1 },
      { id: 'obj_shrine_village', description: 'Xem sổ ký ức tại Linh Miếu giữa làng Thanh Khê', type: 'EXPLORE', targetId: 'shrine_01', required: 1 },
      { id: 'obj_kill_wolves', description: 'Tiêu diệt 3 con Sói Xám bìa rừng', type: 'KILL', targetId: 'mon_001', required: 3 },
    ],
    rewards: { exp: 50, gold: 20, cultivationExp: 60, items: [{ itemTemplateId: 'item_009', quantity: 3 }] },
  },
  quest_main_02: {
    id: 'quest_main_02',
    name: 'Nanh Vuốt Bóng Tối: Cứu Viện Dân Làng',
    description: 'Điều tra nguồn gốc dị biến sâu trong rừng và cứu người hái thuốc bị mắc kẹt.',
    type: QuestType.MAIN,
    chapter: 1,
    prerequisiteQuestId: 'quest_main_01',
    objectives: [
      { id: 'obj_kill_black_wolf', description: 'Tiêu diệt 2 Sói Đen hung hãn', type: 'KILL', targetId: 'mon_002', required: 2 },
      { id: 'obj_collect_herb', description: 'Thu thập 2 Linh Thảo chữa thương', type: 'COLLECT', targetId: 'item_012', required: 2 },
    ],
    rewards: { exp: 80, gold: 35, cultivationExp: 100, items: [{ itemTemplateId: 'item_010', quantity: 2 }] },
  },
  quest_main_03: {
    id: 'quest_main_03',
    name: 'Mảnh Vỡ Thiên Thư: Trảm Xích Nha',
    description: 'Xích Nha Lang Vương ngậm mảnh ngọc phát sáng gây náo loạn. Trảm sát yêu thú thu hồi tàn phiến.',
    type: QuestType.MAIN,
    chapter: 1,
    prerequisiteQuestId: 'quest_main_02',
    objectives: [
      { id: 'obj_kill_wolf_king', description: 'Hạ gục Xích Nha Lang Vương', type: 'KILL', targetId: 'boss_001', required: 1 },
      { id: 'obj_shrine_forest', description: 'Tìm dấu tích Thiên Thư tại Linh Miếu sâu trong rừng', type: 'EXPLORE', targetId: 'shrine_boss', required: 1 },
      { id: 'obj_talk_elder_end', description: 'Giao mảnh ngọc cho Trưởng Lão thẩm định', type: 'TALK', targetId: 'npc_elder', required: 1 },
    ],
    rewards: { exp: 200, gold: 100, cultivationExp: 250, items: [{ itemTemplateId: 'item_006', quantity: 1 }, { itemTemplateId: 'item_015', quantity: 1 }] },
  },
  quest_side_01: {
    id: 'quest_side_01',
    name: 'Dược Liệu Trị Thương',
    description: 'Hái 3 Linh Thảo giúp Dược Sĩ Liễu Muội chế tạo đan dược.',
    type: QuestType.SIDE,
    chapter: 1,
    objectives: [{ id: 'obj_collect_herbs', description: 'Thu thập 3 Linh Thảo', type: 'COLLECT', targetId: 'item_012', required: 3 }],
    rewards: { exp: 40, gold: 15, cultivationExp: 50, items: [{ itemTemplateId: 'item_009', quantity: 2 }] },
  },
  quest_side_02: {
    id: 'quest_side_02',
    name: 'Trừ Hại Cho Thôn: Rắn Độc',
    description: 'Tiêu diệt 4 con Rắn Độc ven đầm lầy bảo đảm an toàn cho đường vận chuyển lương thực.',
    type: QuestType.SIDE,
    chapter: 1,
    objectives: [{ id: 'obj_kill_snakes', description: 'Tiêu diệt 4 Rắn Độc', type: 'KILL', targetId: 'mon_003', required: 4 }],
    rewards: { exp: 60, gold: 25, cultivationExp: 80, items: [{ itemTemplateId: 'item_013', quantity: 3 }] },
  },
  quest_side_03: {
    id: 'quest_side_03',
    name: 'Săn Thú Lấy Da',
    description: 'Thu thập 3 tấm Thú Bì để thợ may trong thôn đan áo ấm.',
    type: QuestType.SIDE,
    chapter: 1,
    objectives: [{ id: 'obj_collect_pelts', description: 'Thu thập 3 Thú Bì', type: 'COLLECT', targetId: 'item_014', required: 3 }],
    rewards: { exp: 70, gold: 30, cultivationExp: 90, items: [{ itemTemplateId: 'item_005', quantity: 1 }] },
  },
  quest_hidden_01: {
    id: 'quest_hidden_01',
    name: 'Cổ Thụ Trăm Năm Biến Dị',
    description: 'Thụ yêu nghìn năm thức giấc dưới đáy khe sâu Rừng Thanh Khê, hãy diệt trừ mối họa ẩn tàng.',
    type: QuestType.SIDE,
    chapter: 1,
    objectives: [{ id: 'obj_kill_tree_boss', description: 'Đánh bại Cổ Thụ Yêu', type: 'KILL', targetId: 'boss_002', required: 1 }],
    rewards: { exp: 250, gold: 120, cultivationExp: 350, items: [{ itemTemplateId: 'item_008', quantity: 1 }] },
  },

  // ====================================================
  // CHƯƠNG 2: THANH VÂN MÔN (Main: 04-06, Side: 04-06, Hidden: 02)
  // ====================================================
  quest_main_04: {
    id: 'quest_main_04',
    name: 'Bái Nhập Sơn Môn: Thanh Vân Thí Luyện',
    description: 'Thanh Vân mở ba nhánh Kiếm, Pháp, Thể. Vượt qua khôi lỗi để chọn pháp khí hợp với đạo của mình.',
    type: QuestType.MAIN,
    chapter: 2,
    prerequisiteQuestId: 'quest_main_03',
    objectives: [
      { id: 'obj_talk_mentor', description: 'Bái kiến Đạo Sĩ Tiêu Dao', type: 'TALK', targetId: 'npc_mentor', required: 1 },
      { id: 'obj_shrine_sword', description: 'Đọc bia thề tại linh miếu Thanh Vân', type: 'EXPLORE', targetId: 'sword_shrine', required: 1 },
      { id: 'obj_kill_puppets', description: 'Đánh bại 3 Kiếm Khí Khôi Lỗi trong thí luyện', type: 'KILL', targetId: 'mon_006', required: 3 },
    ],
    rewards: { exp: 280, gold: 140, cultivationExp: 380, items: [] },
    pathRewardItems: {
      [CultivationPath.SWORD]: [{ itemTemplateId: 'item_016', quantity: 1 }],
      [CultivationPath.SPELL]: [{ itemTemplateId: 'item_017', quantity: 1 }],
      [CultivationPath.BODY]: [{ itemTemplateId: 'item_018', quantity: 1 }],
    },
  },
  quest_main_05: {
    id: 'quest_main_05',
    name: 'Ký Ức Đánh Mất: Bí Ẩn Đệ Tử Mất Trí',
    description: 'Một trưởng lão quên tên người thân sau khi đột phá. Tìm lời chứng của chưởng môn để bảo lưu ký ức cho ông.',
    type: QuestType.MAIN,
    chapter: 2,
    prerequisiteQuestId: 'quest_main_04',
    objectives: [
      { id: 'obj_kill_fiery_snakes', description: 'Đánh lui 4 Hủ Thi quấy rối sơn môn', type: 'KILL', targetId: 'mon_008', required: 4 },
      { id: 'obj_reach_zhuji', description: 'Hỏi chưởng môn về ký ức đã mất', type: 'TALK', targetId: 'npc_sect_master', required: 1 },
    ],
    rewards: { exp: 350, gold: 180, cultivationExp: 500, items: [{ itemTemplateId: 'item_049', quantity: 1 }] },
  },
  quest_main_06: {
    id: 'quest_main_06',
    name: 'Hộ Trận Linh Thú: Lời Thề Thanh Vân',
    description: 'Huyền Giáp Linh Quy bị Thiên Khế kích động. Trấn an linh thú để lời thề giữ ký ức của trưởng lão được ghi vào Thiên Thư.',
    type: QuestType.MAIN,
    chapter: 2,
    prerequisiteQuestId: 'quest_main_05',
    objectives: [
      { id: 'obj_kill_turtle_boss', description: 'Khuất phục Huyền Giáp Linh Quy', type: 'KILL', targetId: 'boss_003', required: 1 },
    ],
    rewards: { exp: 500, gold: 260, cultivationExp: 700, items: [{ itemTemplateId: 'item_026', quantity: 1 }] },
  },
  quest_side_04: {
    id: 'quest_side_04',
    name: 'Khôi Phục Trận Pháp',
    description: 'Giao nộp 3 Cổ Kiếm Tủy để củng cố kiếm trận tông môn.',
    type: QuestType.SIDE,
    chapter: 2,
    objectives: [{ id: 'obj_collect_marrow', description: 'Giao nộp 3 Cổ Kiếm Tủy', type: 'COLLECT', targetId: 'item_057', required: 3 }],
    rewards: { exp: 180, gold: 90, cultivationExp: 240, items: [{ itemTemplateId: 'item_043', quantity: 1 }] },
  },
  quest_side_05: {
    id: 'quest_side_05',
    name: 'Trừ Diệt Hủ Thi',
    description: 'Tiêu diệt 4 Thi Khí Hủ Thi dưới khe núi phía tây sơn môn.',
    type: QuestType.SIDE,
    chapter: 2,
    objectives: [{ id: 'obj_kill_corpses', description: 'Tiêu diệt 4 Hủ Thi', type: 'KILL', targetId: 'mon_008', required: 4 }],
    rewards: { exp: 210, gold: 110, cultivationExp: 290, items: [{ itemTemplateId: 'item_051', quantity: 2 }] },
  },
  quest_side_06: {
    id: 'quest_side_06',
    name: 'Săn Hỏa Xà Bì',
    description: 'Săn 3 tấm da Hỏa Viêm Mãng để Bách Luyện Đường chế giáp.',
    type: QuestType.SIDE,
    chapter: 2,
    objectives: [{ id: 'obj_collect_snake_skin', description: 'Thu thập 3 Da Hỏa Mãng', type: 'COLLECT', targetId: 'item_014', required: 3 }],
    rewards: { exp: 240, gold: 120, cultivationExp: 320, items: [{ itemTemplateId: 'item_032', quantity: 1 }] },
  },
  quest_hidden_02: {
    id: 'quest_hidden_02',
    name: 'Thanh Vân Kiếm Si Cuồng Loạn',
    description: 'Một vị sư huynh mất trí trong Kiếm Trũng đang tấn công bất kỳ ai đến gần, hãy giải thoát cho huynh ấy.',
    type: QuestType.SIDE,
    chapter: 2,
    objectives: [{ id: 'obj_defeat_sword_maniac', description: 'Đánh bại Thanh Vân Kiếm Si', type: 'KILL', targetId: 'boss_004', required: 1 }],
    rewards: { exp: 450, gold: 220, cultivationExp: 600, items: [{ itemTemplateId: 'item_037', quantity: 1 }] },
  },

  // ====================================================
  // CHƯƠNG 3: ĐAN HÀ CỐC (Main: 07-09, Side: 07-09, Hidden: 03)
  // ====================================================
  quest_main_07: {
    id: 'quest_main_07',
    name: 'Dược Hương Vạn Lý: Đến Đan Hà Cốc',
    description: 'Theo manh mối mảnh Thiên Thư đến Đan Hà Cốc tìm vị danh y chữa bệnh mất trí.',
    type: QuestType.MAIN,
    chapter: 3,
    prerequisiteQuestId: 'quest_main_06',
    objectives: [
      { id: 'obj_talk_dan_ton', description: 'Hội ngộ Đan Tôn Liễu Nhược Vân', type: 'TALK', targetId: 'npc_dan_ton', required: 1 },
      { id: 'obj_shrine_cauldron', description: 'Tìm cặn cấm dược tại Đan Lô', type: 'EXPLORE', targetId: 'dan_cauldron', required: 1 },
      { id: 'obj_kill_fire_spirits', description: 'Tiêu diệt 4 Đan Lô Hỏa Linh loạn lạc', type: 'KILL', targetId: 'mon_011', required: 4 },
    ],
    rewards: { exp: 550, gold: 280, cultivationExp: 750, items: [{ itemTemplateId: 'item_052', quantity: 3 }] },
  },
  quest_main_08: {
    id: 'quest_main_08',
    name: 'Bí Mật Cấm Đan: Chứng Cứ Tẩy Trí',
    description: 'Đan dược tẩy trí bị trộn vào thuốc phát cho đệ tử. Giữ mẫu dược và ghi lời khai trước khi lò bị thiêu hủy.',
    type: QuestType.MAIN,
    chapter: 3,
    prerequisiteQuestId: 'quest_main_07',
    objectives: [
      { id: 'obj_kill_vines', description: 'Phá hủy 4 bụi Hóa Cốt Đằng cản lối', type: 'KILL', targetId: 'mon_013', required: 4 },
      { id: 'obj_collect_flame_herb', description: 'Thu thập 2 Dương Viêm Thảo giải độc', type: 'COLLECT', targetId: 'item_062', required: 2 },
    ],
    rewards: { exp: 680, gold: 340, cultivationExp: 920, items: [{ itemTemplateId: 'item_054', quantity: 2 }] },
  },
  quest_main_09: {
    id: 'quest_main_09',
    name: 'Đan Khôi Vô Tâm: Phơi Bày Cấm Đan',
    description: 'Xích Luyện dùng cấm đan nuôi lò thành khôi lỗi vô tâm. Đánh bại hắn và giao chứng cứ cho Liễu Nhược Vân công bố.',
    type: QuestType.MAIN,
    chapter: 3,
    prerequisiteQuestId: 'quest_main_08',
    objectives: [
      { id: 'obj_kill_alchemist_boss', description: 'Hạ gục Xích Luyện Đan Sư', type: 'KILL', targetId: 'boss_005', required: 1 },
    ],
    rewards: { exp: 950, gold: 480, cultivationExp: 1300, items: [{ itemTemplateId: 'item_036', quantity: 1 }, { itemTemplateId: 'item_050', quantity: 1 }] },
  },
  quest_side_07: {
    id: 'quest_side_07',
    name: 'Linh Thảo Thu Thập',
    description: 'Thu thập 5 nhánh Linh Thảo giao cho đan phòng Đan Hà.',
    type: QuestType.SIDE,
    chapter: 3,
    objectives: [{ id: 'obj_collect_herbs_danha', description: 'Giao nộp 5 Linh Thảo', type: 'COLLECT', targetId: 'item_012', required: 5 }],
    rewards: { exp: 320, gold: 160, cultivationExp: 430, items: [{ itemTemplateId: 'item_051', quantity: 3 }] },
  },
  quest_side_08: {
    id: 'quest_side_08',
    name: 'Diệt Độc Vụ Bức',
    description: 'Tiêu diệt 5 con Độc Vụ Bức quanh khe suối Đan Hà.',
    type: QuestType.SIDE,
    chapter: 3,
    objectives: [{ id: 'obj_kill_bats', description: 'Diệt 5 Độc Vụ Bức', type: 'KILL', targetId: 'mon_012', required: 5 }],
    rewards: { exp: 360, gold: 180, cultivationExp: 490, items: [{ itemTemplateId: 'item_019', quantity: 1 }] },
  },
  quest_side_09: {
    id: 'quest_side_09',
    name: 'Bắt Bọ Đan Ma',
    description: 'Tiêu diệt 4 con Đan Ma Trùng đang gặm nhấm kho dược thảo.',
    type: QuestType.SIDE,
    chapter: 3,
    objectives: [{ id: 'obj_kill_bugs', description: 'Tiêu diệt 4 Đan Ma Trùng', type: 'KILL', targetId: 'mon_014', required: 4 }],
    rewards: { exp: 400, gold: 200, cultivationExp: 550, items: [{ itemTemplateId: 'item_044', quantity: 1 }] },
  },
  quest_hidden_03: {
    id: 'quest_hidden_03',
    name: 'U Hỏa Độc Hạt Nguy Hiểm',
    description: 'Con bọ cạp độc u hỏa ngàn năm xuất hiện dưới đáy hỏa đàm, độc tố có thể luyện sát kiếm.',
    type: QuestType.SIDE,
    chapter: 3,
    objectives: [{ id: 'obj_kill_scorpion_boss', description: 'Đánh bại U Hỏa Huyết Hạt', type: 'KILL', targetId: 'boss_006', required: 1 }],
    rewards: { exp: 800, gold: 400, cultivationExp: 1100, items: [{ itemTemplateId: 'item_028', quantity: 1 }] },
  },

  // ====================================================
  // CHƯƠNG 4: CỔ KIẾM DI TÍCH - LỜI CHỨNG TÀN HỒN
  // ====================================================
  quest_main_10: {
    id: 'quest_main_10',
    name: 'Di Tích Tàn Hồn: Lời Chứng Thứ Nhất',
    description: 'Trong Kiếm Trũng cũ, linh hồn người bị thanh trừng còn bám vào vũ khí. Hỏi Kiếm Hồn về ngày Thiên Khế được lập.',
    type: QuestType.MAIN,
    chapter: 4,
    prerequisiteQuestId: 'quest_main_09',
    objectives: [
      { id: 'obj_talk_sword_spirit', description: 'Gặp gỡ Kiếm Hồn Viễn Cổ', type: 'TALK', targetId: 'npc_sword_spirit', required: 1 },
      { id: 'obj_shrine_tomb', description: 'Đối chiếu tên khắc trên Cổ Mộ', type: 'EXPLORE', targetId: 'ancient_tomb', required: 1 },
      { id: 'obj_kill_broken_swords', description: 'Trấn áp 4 Đoạn Kiếm Tàn Hồn', type: 'KILL', targetId: 'mon_016', required: 4 },
    ],
    rewards: { exp: 1100, gold: 550, cultivationExp: 1500, items: [] },
    pathRewardItems: {
      [CultivationPath.SWORD]: [{ itemTemplateId: 'item_021', quantity: 1 }],
      [CultivationPath.SPELL]: [{ itemTemplateId: 'item_023', quantity: 1 }],
      [CultivationPath.BODY]: [{ itemTemplateId: 'item_078', quantity: 1 }],
    },
  },
  quest_main_11: {
    id: 'quest_main_11',
    name: 'Lời Chứng Bị Bôi Xóa',
    description: 'Đối chiếu lời Kiếm Hồn với văn bia: Thiên Khế đã nuốt ký ức của cả người thắng lẫn người thua.',
    type: QuestType.MAIN,
    chapter: 4,
    prerequisiteQuestId: 'quest_main_10',
    objectives: [
      { id: 'obj_kill_ancient_guards', description: 'Hạ 4 Viễn Cổ Chiến Vệ bảo hộ bia', type: 'KILL', targetId: 'mon_017', required: 4 },
      { id: 'obj_reach_jindan', description: 'Đối chiếu lời chứng với Kiếm Hồn', type: 'TALK', targetId: 'npc_sword_spirit', required: 1 },
    ],
    rewards: { exp: 1400, gold: 700, cultivationExp: 1900, items: [{ itemTemplateId: 'item_064', quantity: 2 }] },
  },
  quest_main_12: {
    id: 'quest_main_12',
    name: 'Trấn Chủ Kiếm Trũng: Giải Phóng Tàn Hồn',
    description: 'Cổ Kiếm Tôn Giả canh giữ mộ bia Thiên Khế. Đánh bại ông để các tàn hồn được kể lại sự thật.',
    type: QuestType.MAIN,
    chapter: 4,
    prerequisiteQuestId: 'quest_main_11',
    objectives: [
      { id: 'obj_kill_sword_master_boss', description: 'Chiến thắng Cổ Kiếm Tôn Giả', type: 'KILL', targetId: 'boss_007', required: 1 },
    ],
    rewards: { exp: 2000, gold: 1000, cultivationExp: 2750, items: [{ itemTemplateId: 'item_027', quantity: 1 }, { itemTemplateId: 'item_063', quantity: 1 }] },
  },
  quest_side_10: {
    id: 'quest_side_10',
    name: 'Thu Nhặt Mảnh Kiếm Cổ',
    description: 'Thu thập 4 mảnh Cổ Kiếm Tủy trao cho đệ tử luyện kiếm.',
    type: QuestType.SIDE,
    chapter: 4,
    objectives: [{ id: 'obj_collect_sword_marrow', description: 'Thu thập 4 Cổ Kiếm Tủy', type: 'COLLECT', targetId: 'item_057', required: 4 }],
    rewards: { exp: 500, gold: 250, cultivationExp: 680, items: [{ itemTemplateId: 'item_047', quantity: 1 }] },
  },
  quest_side_11: {
    id: 'quest_side_11',
    name: 'Tiêu Diệt Khôi Lỗi Bích Lạc',
    description: 'Tiêu diệt 4 con Bích Lạc Khôi Lỗi phát cuồng cản trở đường đi.',
    type: QuestType.SIDE,
    chapter: 4,
    objectives: [{ id: 'obj_kill_jade_puppets', description: 'Hạ 4 Bích Lạc Khôi Lỗi', type: 'KILL', targetId: 'mon_019', required: 4 }],
    rewards: { exp: 560, gold: 280, cultivationExp: 760, items: [{ itemTemplateId: 'item_085', quantity: 1 }] },
  },
  quest_side_12: {
    id: 'quest_side_12',
    name: 'Giải Thoát Kiếm Nô',
    description: 'Tiêu diệt 5 Tàn Hồn Kiếm Nô giúp họ thoát khỏi sự khống chế tà niệm.',
    type: QuestType.SIDE,
    chapter: 4,
    objectives: [{ id: 'obj_kill_sword_slaves', description: 'Giải thoát 5 Kiếm Nô', type: 'KILL', targetId: 'mon_020', required: 5 }],
    rewards: { exp: 620, gold: 310, cultivationExp: 840, items: [{ itemTemplateId: 'item_076', quantity: 1 }] },
  },
  quest_hidden_04: {
    id: 'quest_hidden_04',
    name: 'Khiêu Chiến Tàn Kiếm Tông Sư',
    description: 'Bậc thầy kiếm thuật ẩn thế trong mật thất cổ xưa đang chờ một đối thủ xứng tầm.',
    type: QuestType.SIDE,
    chapter: 4,
    objectives: [{ id: 'obj_defeat_hermit_master', description: 'Đánh bại Tàn Kiếm Tông Sư', type: 'KILL', targetId: 'boss_012', required: 1 }],
    rewards: { exp: 1500, gold: 750, cultivationExp: 2000, items: [{ itemTemplateId: 'item_037', quantity: 1 }] },
  },

  // ====================================================
  // CHƯƠNG 5: U MINH VỰC - RÈN PHÁP BẢO BẢN MỆNH
  // ====================================================
  quest_main_13: {
    id: 'quest_main_13',
    name: 'U Minh Vực: Lửa Rèn Của Kẻ Bị Quên',
    description: 'Những người từ chối giao ký ức ẩn ở U Minh. Họ giữ lò rèn pháp bảo cho cả ba hướng tu.',
    type: QuestType.MAIN,
    chapter: 5,
    prerequisiteQuestId: 'quest_main_12',
    objectives: [
      { id: 'obj_talk_rebel', description: 'Đối thoại với U Minh Giáo Chủ', type: 'TALK', targetId: 'npc_rebel_cultivator', required: 1 },
      { id: 'obj_shrine_well', description: 'Đọc chân danh tại Hoàng Tuyền Tỉnh', type: 'EXPLORE', targetId: 'yellow_spring_well', required: 1 },
      { id: 'obj_kill_ghost_soldiers', description: 'Đánh lui 5 U Hồn Quỷ Tốt', type: 'KILL', targetId: 'mon_021', required: 5 },
    ],
    rewards: { exp: 1800, gold: 900, cultivationExp: 2450, items: [] },
  },
  quest_main_14: {
    id: 'quest_main_14',
    name: 'Chọn Đạo Tâm: Vật Liệu Bản Mệnh',
    description: 'Thu U Minh Ma Thạch để rèn pháp bảo. Người tu tự chọn vì sao mình mạnh lên: bảo vệ người còn sống hay chỉ vượt lên họ.',
    type: QuestType.MAIN,
    chapter: 5,
    prerequisiteQuestId: 'quest_main_13',
    objectives: [
      { id: 'obj_kill_yakshas', description: 'Hạ 4 Bạch Cốt Dạ Xoa phát cuồng', type: 'KILL', targetId: 'mon_022', required: 4 },
      { id: 'obj_collect_nether_stone', description: 'Thu thập 3 U Minh Ma Thạch', type: 'COLLECT', targetId: 'item_058', required: 3 },
    ],
    rewards: { exp: 2200, gold: 1100, cultivationExp: 3000, items: [{ itemTemplateId: 'item_066', quantity: 1 }] },
  },
  quest_main_15: {
    id: 'quest_main_15',
    name: 'Lò Rèn Hoàng Tuyền: Thử Pháp Bảo',
    description: 'U Minh Quỷ Đế thử pháp bảo bản mệnh bằng trận chiến. Sau đó ông giao mảnh ký ức đã giữ cho dân U Minh.',
    type: QuestType.MAIN,
    chapter: 5,
    prerequisiteQuestId: 'quest_main_14',
    objectives: [
      { id: 'obj_defeat_nether_emperor', description: 'Đánh bại U Minh Quỷ Đế', type: 'KILL', targetId: 'boss_008', required: 1 },
    ],
    rewards: { exp: 3000, gold: 1500, cultivationExp: 4100, items: [{ itemTemplateId: 'item_029', quantity: 1 }, { itemTemplateId: 'item_065', quantity: 1 }] },
    pathRewardItems: {
      [CultivationPath.SWORD]: [{ itemTemplateId: 'item_022', quantity: 1 }],
      [CultivationPath.SPELL]: [{ itemTemplateId: 'item_023', quantity: 1 }],
      [CultivationPath.BODY]: [{ itemTemplateId: 'item_078', quantity: 1 }],
    },
  },
  quest_side_13: {
    id: 'quest_side_13',
    name: 'Trấn Áp Minh Hà Ngư',
    description: 'Tiêu diệt 5 con Minh Hà Huyết Ngư quấy nhiễu nguồn nước U Minh.',
    type: QuestType.SIDE,
    chapter: 5,
    objectives: [{ id: 'obj_kill_blood_fish', description: 'Hạ 5 Minh Hà Huyết Ngư', type: 'KILL', targetId: 'mon_023', required: 5 }],
    rewards: { exp: 750, gold: 375, cultivationExp: 1020, items: [{ itemTemplateId: 'item_056', quantity: 2 }] },
  },
  quest_side_14: {
    id: 'quest_side_14',
    name: 'Giải Thoát Oán Nữ',
    description: 'Siêu độ cho 4 Oán Linh Nữ Quỷ khóc than dưới chân cầu Hoàng Tuyền.',
    type: QuestType.SIDE,
    chapter: 5,
    objectives: [{ id: 'obj_kill_female_ghosts', description: 'Siêu độ 4 Oán Linh Nữ Quỷ', type: 'KILL', targetId: 'mon_024', required: 4 }],
    rewards: { exp: 850, gold: 420, cultivationExp: 1160, items: [{ itemTemplateId: 'item_089', quantity: 1 }] },
  },
  quest_side_15: {
    id: 'quest_side_15',
    name: 'Thảo Phạt Hắc Ma Viên',
    description: 'Tiêu diệt 4 con Hắc Ma Cự Viên hung hãn bảo hộ biên giới.',
    type: QuestType.SIDE,
    chapter: 5,
    objectives: [{ id: 'obj_kill_dark_apes', description: 'Diệt 4 Hắc Ma Cự Viên', type: 'KILL', targetId: 'mon_025', required: 4 }],
    rewards: { exp: 950, gold: 480, cultivationExp: 1300, items: [{ itemTemplateId: 'item_078', quantity: 1 }] },
  },
  quest_hidden_05: {
    id: 'quest_hidden_05',
    name: 'Cổ Xà Chín Đầu Hoàng Tuyền',
    description: 'Rắn thần chín đầu thức giấc dưới đáy bùn sông Hoàng Tuyền, trừng phạt kẻ xâm nhập cõi âm.',
    type: QuestType.SIDE,
    chapter: 5,
    objectives: [{ id: 'obj_kill_nine_head_snake', description: 'Diệt Hoàng Tuyền Minh Xà', type: 'KILL', targetId: 'boss_013', required: 1 }],
    rewards: { exp: 2500, gold: 1250, cultivationExp: 3400, items: [{ itemTemplateId: 'item_031', quantity: 1 }] },
  },

  // ====================================================
  // CHƯƠNG 6: KÍNH TÂM CẢNH - PHONG ẤN KÝ ỨC
  // ====================================================
  quest_main_16: {
    id: 'quest_main_16',
    name: 'Hàn Ngọc Kính Tâm: Ký Ức Còn Lại',
    description: 'Hàn ngọc trong gương có thể giữ ký ức qua đột phá. Tiếng Vọng chỉ đường phân biệt hồi ức thật và ảo ảnh.',
    type: QuestType.MAIN,
    chapter: 6,
    prerequisiteQuestId: 'quest_main_15',
    objectives: [
      { id: 'obj_talk_inner_voice', description: 'Lắng nghe Tiếng Vọng Ký Ức', type: 'TALK', targetId: 'npc_inner_voice', required: 1 },
      { id: 'obj_shrine_mirror', description: 'Soi chân danh vào Kính Tâm', type: 'EXPLORE', targetId: 'heart_mirror', required: 1 },
      { id: 'obj_kill_shadows', description: 'Đánh tan 5 Tâm Ma Huyễn Ảnh', type: 'KILL', targetId: 'mon_026', required: 5 },
    ],
    rewards: { exp: 2800, gold: 1400, cultivationExp: 3800, items: [{ itemTemplateId: 'item_038', quantity: 1 }] },
  },
  quest_main_17: {
    id: 'quest_main_17',
    name: 'Tâm Kiếp Hàn Ngọc: Niêm Phong Chân Danh',
    description: 'Ghi lại tên người từng cứu mình vào hàn ngọc trước khi Thiên Khế thử xóa ký ức ấy.',
    type: QuestType.MAIN,
    chapter: 6,
    prerequisiteQuestId: 'quest_main_16',
    objectives: [
      { id: 'obj_kill_nightmares', description: 'Đánh tan 4 Kính Diện Ma Thú', type: 'KILL', targetId: 'mon_027', required: 4 },
      { id: 'obj_reach_huashen', description: 'Nhắc lại chân danh trước Tiếng Vọng Ký Ức', type: 'TALK', targetId: 'npc_inner_voice', required: 1 },
    ],
    rewards: { exp: 3500, gold: 1750, cultivationExp: 4800, items: [{ itemTemplateId: 'item_068', quantity: 2 }] },
  },
  quest_main_18: {
    id: 'quest_main_18',
    name: 'Bản Thể Quyết Đấu: Diệt Kính Tâm Ma Hoàng',
    description: 'Chiến đấu và khuất phục tâm ma của chính mình để đạt đến cảnh giới vô tạp niệm.',
    type: QuestType.MAIN,
    chapter: 6,
    prerequisiteQuestId: 'quest_main_17',
    objectives: [
      { id: 'obj_kill_heart_demon', description: 'Trảm sát Kính Tâm Ma Hoàng', type: 'KILL', targetId: 'boss_009', required: 1 },
    ],
    rewards: { exp: 4500, gold: 2250, cultivationExp: 6200, items: [{ itemTemplateId: 'item_035', quantity: 1 }, { itemTemplateId: 'item_067', quantity: 1 }, { itemTemplateId: 'item_069', quantity: 1 }] },
  },
  quest_side_16: {
    id: 'quest_side_16',
    name: 'Phá Vỡ Kính Ma',
    description: 'Tiêu diệt 5 Kính Diện Ma Thú phản chiếu sát thương.',
    type: QuestType.SIDE,
    chapter: 6,
    objectives: [{ id: 'obj_kill_mirror_beasts', description: 'Diệt 5 Kính Diện Ma Thú', type: 'KILL', targetId: 'mon_027', required: 5 }],
    rewards: { exp: 1200, gold: 600, cultivationExp: 1650, items: [{ itemTemplateId: 'item_091', quantity: 2 }] },
  },
  quest_side_17: {
    id: 'quest_side_17',
    name: 'Trảm Thần Điểu Hư Vọng',
    description: 'Tiêu diệt 4 con Hư Vọng Thần Điểu reo rắc ảo giác cuồng dại.',
    type: QuestType.SIDE,
    chapter: 6,
    objectives: [{ id: 'obj_kill_delusion_birds', description: 'Hạ 4 Hư Vọng Thần Điểu', type: 'KILL', targetId: 'mon_028', required: 4 }],
    rewards: { exp: 1350, gold: 675, cultivationExp: 1850, items: [{ itemTemplateId: 'item_092', quantity: 2 }] },
  },
  quest_side_18: {
    id: 'quest_side_18',
    name: 'Hóa Giải Chấp Niệm Cốt',
    description: 'Tiêu diệt 4 Chấp Niệm Hủ Thi lưu lạc trong gương thần.',
    type: QuestType.SIDE,
    chapter: 6,
    objectives: [{ id: 'obj_kill_obsession_corpses', description: 'Hóa giải 4 Chấp Niệm Hủ Thi', type: 'KILL', targetId: 'mon_029', required: 4 }],
    rewards: { exp: 1500, gold: 750, cultivationExp: 2050, items: [{ itemTemplateId: 'item_070', quantity: 1 }] },
  },
  quest_hidden_06: {
    id: 'quest_hidden_06',
    name: 'Thần Bí Tàn Quyển Sơn Hà',
    description: 'Tiếng Vọng Ký Ức biết nơi cất mảnh Sơn Hà Xã Tắc Đồ. Hỏi đường trước khi ảo ảnh nuốt mất dấu tích.',
    type: QuestType.SIDE,
    chapter: 6,
    objectives: [{ id: 'obj_collect_map_fragment', description: 'Hỏi Tiếng Vọng về mảnh Sơn Hà Xã Tắc Đồ', type: 'TALK', targetId: 'npc_inner_voice', required: 1 }],
    rewards: { exp: 3500, gold: 1750, cultivationExp: 4800, items: [{ itemTemplateId: 'item_039', quantity: 1 }] },
  },

  // ====================================================
  // CHƯƠNG 7: LONG MẠCH THIÊN SƠN - HAI HỒI PHÁ TRỤ THIÊN KHẾ
  // ====================================================
  quest_main_19: {
    id: 'quest_main_19',
    name: 'Hồi Một: Dấu Tích Thu Hoạch Linh Hồn',
    description: 'Sơn Thần chỉ ra trụ Thiên Khế nằm trên long mạch. Linh hồn bị hút lên đỉnh tuyết mỗi khi có người đột phá.',
    type: QuestType.MAIN,
    chapter: 7,
    prerequisiteQuestId: 'quest_main_18',
    objectives: [
      { id: 'obj_talk_mountain_god', description: 'Bái kiến Sơn Thần Thiên Sơn', type: 'TALK', targetId: 'npc_mountain_god', required: 1 },
      { id: 'obj_shrine_dragon', description: 'Khảo sát mạch khí tại Long Mạch Thần Điểm', type: 'EXPLORE', targetId: 'dragon_vein_node', required: 1 },
      { id: 'obj_kill_snow_birds', description: 'Hạ 5 Tuyết Sơn Băng Dực Điểu', type: 'KILL', targetId: 'mon_031', required: 5 },
    ],
    rewards: { exp: 4000, gold: 2000, cultivationExp: 5500, items: [{ itemTemplateId: 'item_030', quantity: 1 }] },
  },
  quest_main_20: {
    id: 'quest_main_20',
    name: 'Hồi Hai: Phá Trụ Thiên Khế',
    description: 'Chính đạo và U Minh hợp sức cắt đường thu hoạch linh hồn. Đánh bại vệ binh trụ rồi nhờ Sơn Thần niêm phong long mạch.',
    type: QuestType.MAIN,
    chapter: 7,
    prerequisiteQuestId: 'quest_main_19',
    objectives: [
      { id: 'obj_kill_stone_golems', description: 'Đánh bại 5 Long Mạch Hộ Vệ canh trụ', type: 'KILL', targetId: 'mon_032', required: 5 },
      { id: 'obj_reach_heti', description: 'Cùng Sơn Thần niêm phong trụ đã phá', type: 'TALK', targetId: 'npc_mountain_god', required: 1 },
    ],
    rewards: { exp: 5000, gold: 2500, cultivationExp: 6900, items: [{ itemTemplateId: 'item_072', quantity: 2 }] },
  },
  quest_main_21: {
    id: 'quest_main_21',
    name: 'Giám Khế Chân Long: Bảo Toàn Nhân Thế',
    description: 'Chân Long canh nguồn mạch còn lại. Vượt qua thử thách của nó để chứng minh có thể giữ đất trời mà không hiến ký ức.',
    type: QuestType.MAIN,
    chapter: 7,
    prerequisiteQuestId: 'quest_main_20',
    objectives: [
      { id: 'obj_defeat_true_dragon', description: 'Khuất phục Long Mạch Chân Long', type: 'KILL', targetId: 'boss_010', required: 1 },
    ],
    rewards: { exp: 6800, gold: 3400, cultivationExp: 9300, items: [{ itemTemplateId: 'item_071', quantity: 1 }] },
    pathRewardItems: {
      [CultivationPath.SWORD]: [{ itemTemplateId: 'item_079', quantity: 1 }],
      [CultivationPath.SPELL]: [{ itemTemplateId: 'item_080', quantity: 1 }],
      [CultivationPath.BODY]: [{ itemTemplateId: 'item_024', quantity: 1 }],
    },
  },
  quest_side_19: {
    id: 'quest_side_19',
    name: 'Hái Thiên Sơn Tuyết Liên',
    description: 'Thu hái 3 bông hoa Thiên Sơn Tuyết Liên mọc trên vách băng hiểm trở.',
    type: QuestType.SIDE,
    chapter: 7,
    objectives: [{ id: 'obj_collect_snow_lotus', description: 'Hái 3 Thiên Sơn Tuyết Liên', type: 'COLLECT', targetId: 'item_059', required: 3 }],
    rewards: { exp: 1800, gold: 900, cultivationExp: 2500, items: [{ itemTemplateId: 'item_093', quantity: 1 }] },
  },
  quest_side_20: {
    id: 'quest_side_20',
    name: 'Săn Băng Giáp Hùng',
    description: 'Tiêu diệt 4 con Băng Giáp Cuồng Hùng chặn đường lên núi.',
    type: QuestType.SIDE,
    chapter: 7,
    objectives: [{ id: 'obj_kill_ice_bears', description: 'Diệt 4 Băng Giáp Cuồng Hùng', type: 'KILL', targetId: 'mon_033', required: 4 }],
    rewards: { exp: 2100, gold: 1050, cultivationExp: 2900, items: [{ itemTemplateId: 'item_088', quantity: 1 }] },
  },
  quest_side_21: {
    id: 'quest_side_21',
    name: 'Thu Nhập Long Khí Tinh Hoa',
    description: 'Thu thập 2 giọt Chân Long Huyết Tinh rớt xuống từ cuộc giao tranh rồng.',
    type: QuestType.SIDE,
    chapter: 7,
    objectives: [{ id: 'obj_collect_dragon_blood', description: 'Thu thập 2 Chân Long Huyết Tinh', type: 'COLLECT', targetId: 'item_072', required: 2 }],
    rewards: { exp: 2400, gold: 1200, cultivationExp: 3300, items: [{ itemTemplateId: 'item_094', quantity: 1 }] },
  },
  quest_hidden_07: {
    id: 'quest_hidden_07',
    name: 'Băng Phượng Tê Thiên Tuyệt Đỉnh',
    description: 'Khiêu chiến Phượng hoàng băng ngàn năm ngự trị trên đỉnh tuyết Thiên Sơn.',
    type: QuestType.SIDE,
    chapter: 7,
    objectives: [{ id: 'obj_defeat_ice_phoenix', description: 'Đánh bại Băng Sương Huyễn Phượng', type: 'KILL', targetId: 'boss_014', required: 1 }],
    rewards: { exp: 5000, gold: 2500, cultivationExp: 6900, items: [{ itemTemplateId: 'item_040', quantity: 1 }] },
  },

  // ====================================================
  // CHƯƠNG 8: THIÊN KHẾ ĐÀI & BA CON ĐƯỜNG
  // ====================================================
  quest_main_22: {
    id: 'quest_main_22',
    name: 'Đường Lên Thiên Khế Đài',
    description: 'Giữ mảnh Thiên Thư và ký ức đã niêm phong, bước lên đài nơi giao ước đòi món nợ cuối.',
    type: QuestType.MAIN,
    chapter: 8,
    prerequisiteQuestId: 'quest_main_21',
    objectives: [
      { id: 'obj_kill_patrol_guards', description: 'Đánh lui 6 Thiên Khế Tuần Tra Vệ', type: 'KILL', targetId: 'mon_036', required: 6 },
      { id: 'obj_shrine_monolith', description: 'Đọc ba con đường trên Cổ Bia Thiên Khế', type: 'EXPLORE', targetId: 'covenant_monolith', required: 1 },
      { id: 'obj_reach_dajie', description: 'Đối chất với thần tượng Chấp Pháp Giả', type: 'TALK', targetId: 'npc_covenant_arbiter', required: 1 },
    ],
    rewards: { exp: 7500, gold: 3800, cultivationExp: 10500, items: [{ itemTemplateId: 'item_073', quantity: 1 }] },
  },
  quest_main_23: {
    id: 'quest_main_23',
    name: 'Mở Lối Qua Kim Giáp Thần Binh',
    description: 'Đánh lui quân giữ đài, rồi nghe lời giải thích cuối về cái giá ký ức, tự do và luân hồi.',
    type: QuestType.MAIN,
    chapter: 8,
    prerequisiteQuestId: 'quest_main_22',
    objectives: [
      { id: 'obj_kill_golden_soldiers', description: 'Hạ 5 Kim Giáp Thần Binh', type: 'KILL', targetId: 'mon_037', required: 5 },
      { id: 'obj_kill_order_puppets', description: 'Nghe Chấp Pháp Giả nói về ba cái giá', type: 'TALK', targetId: 'npc_covenant_arbiter', required: 1 },
    ],
    rewards: { exp: 9000, gold: 4500, cultivationExp: 12500, items: [{ itemTemplateId: 'item_074', quantity: 3 }] },
  },
  quest_main_24: {
    id: 'quest_main_24',
    name: 'Thiên Khế Chấp Chưởng: Điểm Chọn Cuối',
    description: 'Đánh bại người canh giữ và mở mốc thế giới trước quyết định. Ba kết cục được chọn trong Thiên Thư Sử Ký.',
    type: QuestType.MAIN,
    chapter: 8,
    prerequisiteQuestId: 'quest_main_23',
    objectives: [
      { id: 'obj_defeat_final_arbiter', description: 'Đánh bại Thiên Khế Chấp Pháp Giả', type: 'KILL', targetId: 'boss_011', required: 1 },
      { id: 'obj_decide_covenant', description: 'Ghi lời thề trước Cổ Bia Thiên Khế', type: 'TALK', targetId: 'npc_covenant_arbiter', required: 1 },
    ],
    rewards: { exp: 15000, gold: 8000, cultivationExp: 21000, items: [{ itemTemplateId: 'item_041', quantity: 1 }] },
    pathRewardItems: {
      [CultivationPath.SWORD]: [{ itemTemplateId: 'item_025', quantity: 1 }],
      [CultivationPath.SPELL]: [{ itemTemplateId: 'item_106', quantity: 1 }],
      [CultivationPath.BODY]: [{ itemTemplateId: 'item_107', quantity: 1 }],
    },
  },
  quest_side_22: {
    id: 'quest_side_22',
    name: 'Tiêu Diệt Dị Thú Hư Không',
    description: 'Tiêu diệt 4 con Hư Không Phá Diệt Thú đe dọa làm sụp đổ trật tự không gian.',
    type: QuestType.SIDE,
    chapter: 8,
    objectives: [{ id: 'obj_kill_void_beasts', description: 'Diệt 4 Hư Không Phá Diệt Thú', type: 'KILL', targetId: 'mon_039', required: 4 }],
    rewards: { exp: 3000, gold: 1500, cultivationExp: 4200, items: [{ itemTemplateId: 'item_068', quantity: 3 }] },
  },
  quest_side_23: {
    id: 'quest_side_23',
    name: 'Thí Luyện Thần Tướng',
    description: 'Khiêu chiến và đánh bại 3 Vạn Đạo Thần Tướng chứng minh tư cách trường sinh.',
    type: QuestType.SIDE,
    chapter: 8,
    objectives: [{ id: 'obj_kill_god_generals', description: 'Đánh bại 3 Vạn Đạo Thần Tướng', type: 'KILL', targetId: 'mon_040', required: 3 }],
    rewards: { exp: 3500, gold: 1750, cultivationExp: 4900, items: [{ itemTemplateId: 'item_074', quantity: 2 }] },
  },
  quest_side_24: {
    id: 'quest_side_24',
    name: 'Củng Cố Cổ Phù',
    description: 'Thu thập 5 khối Cửu Thiên Lôi Tinh để bảo hộ thần hồn trước kiếp lôi.',
    type: QuestType.SIDE,
    chapter: 8,
    objectives: [{ id: 'obj_collect_lightning_cores', description: 'Giao nộp 5 Cửu Thiên Lôi Tinh', type: 'COLLECT', targetId: 'item_074', required: 5 }],
    rewards: { exp: 4000, gold: 2000, cultivationExp: 5600, items: [{ itemTemplateId: 'item_087', quantity: 1 }] },
  },
  quest_hidden_08: {
    id: 'quest_hidden_08',
    name: 'Trấn Yêu Tháp Cực Hạn Khiêu Chiến',
    description: 'Chinh phục Đỉnh Tháp Trấn Yêu, đánh bại Vạn Đạo Thiên Tôn chứng minh bản thân bất diệt.',
    type: QuestType.SIDE,
    chapter: 8,
    objectives: [{ id: 'obj_defeat_supreme_tianzun', description: 'Đánh bại Vạn Đạo Thiên Tôn', type: 'KILL', targetId: 'boss_020', required: 1 }],
    rewards: { exp: 20000, gold: 10000, cultivationExp: 30000, items: [{ itemTemplateId: 'item_042', quantity: 1 }, { itemTemplateId: 'item_095', quantity: 1 }] },
  },
  quest_memory_evidence: {
    id: 'quest_memory_evidence',
    name: 'Hồi Tưởng: Chứng Tích Thiên Khế',
    description: 'Trở lại Đan Hà và Cổ Kiếm Di Tích. Nhờ hai nhân chứng nối lời khai về cấm đan với văn bia để Thiên Thư đủ sức phá Thiên Khế.',
    type: QuestType.SIDE,
    chapter: 8,
    prerequisiteQuestId: 'quest_main_23',
    objectives: [
      { id: 'obj_memory_dan_ton', description: 'Xin Đan Tôn đối chứng mẫu cấm đan', type: 'TALK', targetId: 'npc_dan_ton', required: 1 },
      { id: 'obj_memory_sword_spirit', description: 'Xin Kiếm Hồn đối chứng văn bia', type: 'TALK', targetId: 'npc_sword_spirit', required: 1 },
    ],
    rewards: { exp: 1200, gold: 600, cultivationExp: 1600, items: [] },
  },
  quest_memory_rebirth: {
    id: 'quest_memory_rebirth',
    name: 'Hồi Tưởng: Hàn Ngọc Luân Hồi',
    description: 'Trở lại Kính Tâm và Long Mạch. Ghép ký ức đã niêm phong với lời thề của Sơn Thần để tìm cách chữa lành nhân thế.',
    type: QuestType.SIDE,
    chapter: 8,
    prerequisiteQuestId: 'quest_main_23',
    objectives: [
      { id: 'obj_memory_inner_voice', description: 'Nhờ Tiếng Vọng mở hàn ngọc ký ức', type: 'TALK', targetId: 'npc_inner_voice', required: 1 },
      { id: 'obj_memory_mountain_god', description: 'Nhờ Sơn Thần xác nhận đường hồi sinh linh mạch', type: 'TALK', targetId: 'npc_mountain_god', required: 1 },
    ],
    rewards: { exp: 1200, gold: 600, cultivationExp: 1600, items: [] },
  },
};
