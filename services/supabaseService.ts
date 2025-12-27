
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
      selected_areas: user.selectedAreas,
    })
    .select();
  return { data, error };
};

export const createCommunity = async (community: any) => {
  const { data, error } = await supabase
    .from('communities')
    .insert({
      name: community.name,
      description: community.description,
      owner_id: community.ownerId,
      image_url: community.imageUrl,
      is_secret: community.isSecret
    })
    .select()
    .single();
  return { data, error };
};

export const joinCommunity = async (communityId: string, userId: string) => {
  const { data, error } = await supabase
    .from('community_members')
    .insert({
      community_id: communityId,
      user_id: userId
    });
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
/**
 * タイムライン投稿の取得
 */
export const getPosts = async (areas: string[]) => {
  const { data, error } = await supabase
    .from('posts')
    .select('*, author:profiles(nickname, avatar_url)')
    .in('area', areas)
    .order('created_at', { ascending: false });
  return { data, error };
};

/**
 * タイムライン投稿の作成
 */
export const createPost = async (post: any) => {
  const { data, error } = await supabase
    .from('posts')
    .insert(post)
    .select();
  return { data, error };
};

/**
 * コメント機能（SNS強化）
 */
export const getComments = async (postId: string) => {
  const { data, error } = await supabase
    .from('comments')
    .select('*, author:profiles(nickname, avatar_url)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  return { data, error };
};

export const addComment = async (comment: { postId: string, userId: string, content: string }) => {
  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: comment.postId,
      user_id: comment.userId,
      content: comment.content
    })
    .select('*, author:profiles(nickname, avatar_url)')
    .single();
  return { data, error };
};

/**
 * いいね機能（永続化・アトミック処理）
 */
export const toggleLike = async (postId: string, userId: string) => {
  // Google Engineer Fix: Use database function (RPC) for atomicity
  const { error } = await supabase.rpc('toggle_like', {
    p_id: postId,
    u_id: userId
  });

  return { error };
};

/**
 * 回覧板の取得
 */
export const getKairanbans = async () => {
  const { data, error } = await supabase
    .from('kairanbans')
    .select('*')
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
    .insert([{
      title: kairan.title,
      content: kairan.content,
      area: kairan.area,
      author: kairan.author,
      sent_to_line: kairan.sent_to_line,
      community_id: kairan.communityId || null
    }])
    .select();

  if (!error && kairan.sent_to_line) {
    console.log("Invoking line-broadcast Edge Function...");
    const { data: funcData, error: funcError } = await supabase.functions.invoke('line-broadcast', {
      body: {
        title: kairan.title,
        content: kairan.content,
        area: kairan.area,
        communityId: kairan.communityId
      }
    });

    if (funcError) {
      console.error("Failed to send LINE notification:", funcError);
    } else {
      console.log("LINE notification sent successfully:", funcData);
    }
  }

  return { data, error };
};

/**
 * 地域クーポン取得
 */
export const getCoupons = async () => {
  const { data, error } = await supabase
    .from('coupons')
    .select('*');
  return { data, error };
};

/**
 * 地域クーポン登録
 */
export const registerLocalCoupon = async (coupon: any) => {
  const { data, error } = await supabase
    .from('coupons')
    .insert([{
      shop_name: coupon.shopName,
      title: coupon.title,
      description: coupon.description,
      discount_rate: coupon.discountRate,
      area: coupon.area,
      image_url: coupon.imageUrl
    }])
    .select();
  return { data, error };
};

/**
 * 地域お手伝いミッションの取得
 */
export const getMissions = async () => {
  const { data, error } = await supabase
    .from('volunteer_missions')
    .select('*')
    .order('created_at', { ascending: false });
  return { data, error };
};

/**
 * 地域お手伝いミッションの作成
 */
export const createMission = async (mission: any) => {
  const { data, error } = await supabase
    .from('volunteer_missions')
    .insert([{
      title: mission.title,
      description: mission.description,
      points: mission.points,
      area: mission.area,
      date: mission.date,
      max_participants: mission.maxParticipants
    }])
    .select();
  return { data, error };
};

/**
 * ミッションに参加（トランザクション処理）
 */
export const joinMission = async (missionId: string, userId: string) => {
  // Google Engineer Fix: Use RPC to prevent race conditions (overbooking)
  const { data, error } = await supabase.rpc('join_mission', {
    m_id: missionId,
    u_id: userId
  });

  if (data === true) {
    return { data, error: null };
  } else if (data === false) {
    return { data: null, error: 'Already joined or full' };
  }

  return { data, error };
};
// ... (existing code)

/**
 * 管理者機能：全ユーザー取得
 */
export const getAllUsers = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  return { data, error };
};

/**
 * 管理者機能：ユーザー権限更新
 */
export const updateUserRole = async (userId: string, role: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select();
  return { data, error };
};

/**
 * 管理者機能：ポイント付与
 */
export const giveUserPoints = async (userId: string, points: number) => {
  const { data: current } = await supabase
    .from('profiles')
    .select('score')
    .eq('id', userId)
    .single();

  if (current) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ score: (current.score || 0) + points })
      .eq('id', userId)
      .select();
    return { data, error };
  }
  return { data: null, error: 'User not found' };
};

/**
 * 管理者機能：全コミュニティ取得
 */
export const getAllCommunities = async () => {
  const { data, error } = await supabase
    .from('communities')
    .select('*')
    .order('created_at', { ascending: false });
  return { data, error };
};

/**
 * 管理者機能：コミュニティ削除
 */
export const deleteCommunity = async (communityId: string) => {
  const { error } = await supabase
    .from('communities')
    .delete()
    .eq('id', communityId);
  return { error };
};
