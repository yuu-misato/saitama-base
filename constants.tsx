
import { Post, LocalEvent, Coupon, Kairanban, VolunteerMission } from './types';

export const SAITAMA_MUNICIPALITIES = [
  "さいたま市大宮区", "さいたま市浦和区", "さいたま市中央区", "さいたま市西区", "さいたま市北区",
  "さいたま市見沼区", "さいたま市桜区", "さいたま市南区", "さいたま市緑区", "さいたま市岩槻区",
  "川越市", "熊谷市", "川口市", "行田市", "秩父市", "所沢市", "飯能市", "加須市", "本庄市",
  "東松山市", "春日部市", "狭山市", "羽生市", "鴻巣市", "深谷市", "上尾市", "草加市", "越谷市",
  "蕨市", "戸田市", "入間市", "朝霞市", "志木市", "和光市", "新座市", "桶川市", "久喜市",
  "北本市", "八潮市", "富士見市", "三郷市", "蓮田市", "吉川市", "ふじみ野市", "白岡市",
  "伊奈町", "三芳町", "毛呂山町", "越生町", "滑川町", "嵐山町", "小川町", "川島町", "吉見町",
  "鳩山町", "ときがわ町", "横瀬町", "皆野町", "長瀞町", "小鹿野町", "東秩父村", "美里町",
  "神川町", "上里町", "寄居町", "宮代町", "杉戸町", "松伏町"
];

export const MUNICIPALITY_COORDINATES: Record<string, { lat: number, lon: number }> = {
  "さいたま市大宮区": { lat: 35.9063, lon: 139.6237 },
  "さいたま市浦和区": { lat: 35.8570, lon: 139.6554 },
  "さいたま市中央区": { lat: 35.8856, lon: 139.6267 },
  "川越市": { lat: 35.9251, lon: 139.4858 },
  "熊谷市": { lat: 36.1473, lon: 139.3886 },
  "川口市": { lat: 35.8078, lon: 139.7139 },
  "所沢市": { lat: 35.7994, lon: 139.4687 },
  "春日部市": { lat: 35.9752, lon: 139.7531 },
  "上尾市": { lat: 35.9737, lon: 139.5898 },
  "草加市": { lat: 35.8286, lon: 139.8058 },
  "越谷市": { lat: 35.8920, lon: 139.7903 },
  "秩父市": { lat: 35.9965, lon: 139.0837 },
  // Add more as needed, fallback will be used if not found
};

export const INITIAL_POSTS: Post[] = [
  {
    id: '1',
    userId: 'u1',
    userName: '大宮区の住人A',
    userAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=A',
    category: 'notice',
    area: 'さいたま市大宮区',
    title: '【重要】氷川神社付近の清掃活動',
    content: '今週末、氷川参道の清掃ボランティアを募集します。参加者には回覧板BASEポイントを50pts付与します！',
    likes: 24,
    comments: [],
    createdAt: '2024-05-10T09:00:00Z'
  }
];

export const MOCK_KAIRANBAN: Kairanban[] = [
  {
    id: 'k1',
    title: '令和6年度 自治会費の納入について',
    content: '今年度の自治会費の集金を開始します。キャッシュレス決済（回覧板BASE Pay）でも納入可能になりました。詳細は掲示板をご確認ください。',
    area: 'さいたま市大宮区',
    author: '大宮三丁目町会 役員会',
    points: 10,
    readCount: 156,
    isRead: false,
    createdAt: '2024-05-14T10:00:00Z',
    sentToLine: true
  },
  {
    id: 'k2',
    title: '【重要】不審者情報共有',
    content: '昨日夕方、中央公園付近で不審な声かけが発生しました。お子様の登下校には十分ご注意ください。',
    area: 'さいたま市大宮区',
    author: '防犯部',
    points: 5,
    readCount: 89,
    isRead: false,
    createdAt: '2024-05-13T18:00:00Z',
    sentToLine: false
  }
];

export const MOCK_MISSIONS: VolunteerMission[] = [
  {
    id: 'm1',
    title: '夏祭りのテント設営',
    description: '来週の夏祭りに向けたテント設営のお手伝いを募集します。体力に自信のある方大歓迎！飲み物支給します。',
    points: 100,
    area: 'さいたま市大宮区',
    date: '2024-05-20 09:00',
    currentParticipants: 3,
    maxParticipants: 10
  },
  {
    id: 'm2',
    title: '高齢者宅のスマホ操作説明',
    description: 'スマートフォンの使い方がわからない高齢者の方へ、LINEの送り方を優しく教えていただける方を募集します。',
    points: 150,
    area: 'さいたま市大宮区',
    date: '2024-05-22 14:00',
    currentParticipants: 1,
    maxParticipants: 2
  }
];

export const MOCK_EVENTS: LocalEvent[] = [
  {
    id: 'e1',
    title: '浦和うなぎまつり',
    description: '伝統の味を堪能しましょう。地元の職人による技の披露もあります。',
    date: '2024-05-25',
    location: 'さいたま市役所前',
    area: 'さいたま市浦和区',
    imageUrl: 'https://picsum.photos/id/225/400/250',
    points: 100
  }
];

export const MOCK_COUPONS: Coupon[] = [
  {
    id: 'cp1',
    shopName: '十万石まんじゅう本舗',
    title: 'お買い上げ総額から10%OFF',
    requiredScore: 100,
    discount: '10% OFF',
    imageUrl: 'https://picsum.photos/id/1080/200/200',
    area: 'さいたま市大宮区',
    isUsed: false
  },
  {
    id: 'cp2',
    shopName: '大宮盆栽村カフェ',
    title: 'ドリンク1杯無料（デザート注文時）',
    requiredScore: 300,
    discount: 'FREE DRINK',
    imageUrl: 'https://picsum.photos/id/106/200/200',
    area: 'さいたま市大宮区',
    isUsed: false
  },
  {
    id: 'cp3',
    shopName: '浦和のうなぎ屋',
    title: '肝吸い1杯サービス',
    requiredScore: 50,
    discount: 'SERVICE',
    imageUrl: 'https://picsum.photos/id/1070/200/200',
    area: 'さいたま市浦和区',
    isUsed: false
  }
];
