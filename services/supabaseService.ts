
import { createClient } from '@supabase/supabase-js';

// AWS Amplifyの環境変数を想定
// 実際の設定は Amplify Console の Environment variables で行います
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 住民・事業者のプロファイル管理
 */
export const createProfile = async (user: any) => { // Changed User to any for simplicity, assuming type definition is elsewhere
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id || undefined, // UUIDが自動生成されるか、またはLINE IDをハッシュ化したものを使う
      nickname: user.nickname,
      avatar_url: user.avatar,
      role: user.role,
      level: user.level || 1,
      score: user.score || 0,
    })
    .select();
  return { data, error };
};

export const createCommunity = async (community: any) => {
  const { data, error } = await supabase
    .from('communities')
    .insert(community)
    .select();
  return { data, error };
};

export const joinCommunity = async (userId: string, communityId: string) => {
  const { data, error } = await supabase
    .from('community_members')
    .insert({ user_id: userId, community_id: communityId })
    .select();
  return { data, error };
};

/**
 * 住民・事業者のプロファイル管理
 */
export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
};

/**
 * タイムライン投稿の取得
 */
export const getPosts = async (areas: string[]) => {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .in('area', areas)
    .order('created_at', { ascending: false });
  return { data, error };
};

/**
 * 町会長用：LINE連携プッシュ通知の記録と投稿
 */
export const createKairanbanWithNotification = async (kairan: any) => {
  // 1. 回覧板データを挿入
  const { data, error } = await supabase
    .from('kairanbans')
    .insert([kairan])
    .select();

  // 2. LINE Messaging APIへのトリガー（Edge Functions または Lambda を想定）
  // ここではDBのWebhook機能を活用する設計を推奨します
  if (!error && kairan.sent_to_line) {
    console.log("Supabase Edge Functions triggered for LINE broadcast...");
  }

  return { data, error };
};

/**
 * 地域クーポン登録
 */
export const registerLocalCoupon = async (coupon: any) => {
  const { data, error } = await supabase
    .from('coupons')
    .insert([coupon])
    .select();
  return { data, error };
};
