export interface TowerFloorConfig {
  floor: number;
  name: string;
  bossId: string;
  recommendedRealm: string;
  firstClearRewards: {
    exp: number;
    gold: number;
    cultivationExp: number;
    items: { itemTemplateId: string; quantity: number }[];
  };
}

export const TOWER_FLOORS: TowerFloorConfig[] = [
  {
    floor: 1,
    name: 'Tầng 1: Hỗn Độn Chi Địa',
    bossId: 'boss_015',
    recommendedRealm: 'Hóa Thần Cảnh',
    firstClearRewards: {
      exp: 10000,
      gold: 5000,
      cultivationExp: 15000,
      items: [{ itemTemplateId: 'item_036', quantity: 1 }, { itemTemplateId: 'item_068', quantity: 3 }],
    },
  },
  {
    floor: 2,
    name: 'Tầng 2: Cửu U Minh Giới',
    bossId: 'boss_016',
    recommendedRealm: 'Luyện Hư Cảnh',
    firstClearRewards: {
      exp: 15000,
      gold: 7500,
      cultivationExp: 22000,
      items: [{ itemTemplateId: 'item_031', quantity: 1 }, { itemTemplateId: 'item_070', quantity: 3 }],
    },
  },
  {
    floor: 3,
    name: 'Tầng 3: Lôi Kiếp Tuyệt Vực',
    bossId: 'boss_017',
    recommendedRealm: 'Hợp Thể Cảnh',
    firstClearRewards: {
      exp: 22000,
      gold: 11000,
      cultivationExp: 32000,
      items: [{ itemTemplateId: 'item_037', quantity: 1 }, { itemTemplateId: 'item_072', quantity: 3 }],
    },
  },
  {
    floor: 4,
    name: 'Tầng 4: Hư Không Vực Thẳm',
    bossId: 'boss_018',
    recommendedRealm: 'Đại Thừa Cảnh',
    firstClearRewards: {
      exp: 30000,
      gold: 15000,
      cultivationExp: 45000,
      items: [{ itemTemplateId: 'item_040', quantity: 1 }, { itemTemplateId: 'item_074', quantity: 5 }],
    },
  },
  {
    floor: 5,
    name: 'Tầng 5: Bất Diệt Kiếm Cực',
    bossId: 'boss_019',
    recommendedRealm: 'Độ Kiếp Cảnh',
    firstClearRewards: {
      exp: 42000,
      gold: 21000,
      cultivationExp: 60000,
      items: [{ itemTemplateId: 'item_041', quantity: 1 }, { itemTemplateId: 'item_073', quantity: 3 }],
    },
  },
  {
    floor: 6,
    name: 'Tầng 6: Vạn Đạo Đỉnh Phong',
    bossId: 'boss_020',
    recommendedRealm: 'Độ Kiếp Viên Mãn',
    firstClearRewards: {
      exp: 60000,
      gold: 30000,
      cultivationExp: 90000,
      items: [{ itemTemplateId: 'item_025', quantity: 1 }, { itemTemplateId: 'item_042', quantity: 1 }],
    },
  },
];
