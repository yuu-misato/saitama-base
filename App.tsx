import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import PostCard from './components/PostCard';
import CouponList from './components/CouponList';
import ChokaiPanel from './components/ChokaiPanel';
import CommunityPanel from './components/CommunityPanel';
import BusinessPanel from './components/BusinessPanel';
import LandingPage from './components/LandingPage';
import { Post, PostCategory, Coupon, Kairanban, VolunteerMission, User, Community } from './types';
import { SAITAMA_MUNICIPALITIES, MUNICIPALITY_COORDINATES, MOCK_KAIRANBAN, MOCK_MISSIONS, MOCK_COUPONS, INITIAL_POSTS } from './constants';
import { supabase, getPosts, createPost, createKairanbanWithNotification, registerLocalCoupon, createProfile, createCommunity, joinCommunity, getProfile, getKairanbans, getCoupons, getMissions, createMission, joinMission, addComment, toggleLike } from './services/supabaseService';

import { summarizeLocalFeed } from './services/geminiService';

import AdminDashboard from './components/AdminDashboard';
import { PostSkeleton } from './components/Skeleton';
import EmptyState from './components/EmptyState';
import Toast, { ToastMessage } from './components/Toast';
import RegistrationModal from './components/RegistrationModal';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [tempUser, setTempUser] = useState<User | null>(null); // 新規登録用一時ステート
  const [activeTab, setActiveTab] = useState('feed');
  const [isLoading, setIsLoading] = useState(true); // Loading state
  const [posts, setPosts] = useState<Post[]>([]);
  const [kairanbans, setKairanbans] = useState<Kairanban[]>([]);
  const [missions, setMissions] = useState<VolunteerMission[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [score, setScore] = useState(150);
  const [selectedAreas, setSelectedAreas] = useState<string[]>(['さいたま市大宮区']);
  const [isPosting, setIsPosting] = useState(false);
  const [isCreatingMission, setIsCreatingMission] = useState(false); // New state
  const [newPost, setNewPost] = useState({ title: '', content: '', category: 'notice' as PostCategory, area: '' });
  const [newMission, setNewMission] = useState({ title: '', description: '', points: 50, area: '', date: '', maxParticipants: 5 }); // New state
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  // State for popups
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showScorePopup, setShowScorePopup] = useState<{ show: boolean, amount: number }>({ show: false, amount: 0 });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, type, message }]);
  };

  // 永続化ログイン & Supabase Auth 状態監視
  useEffect(() => {
    // 0. URLからの管理モード強制起動 (デバッグ用)
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin_mode') === 'true') {
      const adminUser: User = {
        id: 'admin_debug',
        nickname: '管理者（デバッグ）',
        role: 'admin',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin',
        score: 9999,
        level: 99,
        selectedAreas: ['さいたま市大宮区'],
        isLineConnected: true
      };
      setUser(adminUser);
      setActiveTab('admin');
      addToast('デバッグ用管理者モードで起動しました', 'info');
      return;
    }

    // 1. まずローカルストレージを確認 (優先)
    const storedUserId = localStorage.getItem('saitama_user_id');
    if (storedUserId) {
      getProfile(storedUserId).then(({ data, error }) => {
        if (data && !error) {
          console.log('Restoring session for user:', data.nickname);
          setUser({
            id: data.id,
            nickname: data.nickname,
            role: data.role as any,
            avatar: data.avatar_url,
            score: data.score,
            level: data.level,
            selectedAreas: data.selected_areas || ['さいたま市大宮区'],
            isLineConnected: true
          });
          setSelectedAreas(data.selected_areas || ['さいたま市大宮区']);
        } else {
          // IDはあるがDBにない場合（削除された等）、クリアする
          localStorage.removeItem('saitama_user_id');
        }
      });
    }

    // 2. Supabase Auth (今回は未使用だが残す)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Logic for supabase auth if integrated later
    });

    return () => subscription.unsubscribe();
  }, []);

  // 実データのフェッチ（全ての共通データ）
  useEffect(() => {
    if (!user) return; // Wait for user

    setIsLoading(true);
    const promises = [
      getPosts(selectedAreas), // User's selected areas
      getKairanbans(),
      getCoupons(),
      getMissions()
    ];

    Promise.all(promises).then(([postsRes, kairanRes, couponsRes, missionsRes]) => {
      // 1. Posts
      if (postsRes.data) {
        const mappedPosts: Post[] = postsRes.data.map((p: any) => ({
          id: p.id,
          userId: p.author_id || 'unknown',
          userName: p.author?.nickname || 'Unknown',
          userAvatar: p.author?.avatar_url || '',
          category: p.category,
          title: p.title,
          content: p.content,
          area: p.area,
          imageUrl: p.image_url,
          likes: p.likes,
          comments: [],
          createdAt: p.created_at,
          timestamp: new Date(p.created_at).toLocaleDateString()
        }));
        setPosts(mappedPosts);
      }

      // 2. Kairanbans
      if (kairanRes.data) {
        const mappedKairan: Kairanban[] = kairanRes.data.map((k: any) => ({
          id: k.id,
          title: k.title,
          content: k.content,
          area: k.area || '',
          author: k.author,
          points: k.points || 0,
          readCount: k.read_count || 0,
          isRead: false,
          sentToLine: k.sent_to_line || false,
          createdAt: k.created_at,
          category: 'notice',
          communityId: k.community_id
        }));
        setKairanbans(mappedKairan);
      }

      // 3. Coupons
      if (couponsRes.data) {
        const mappedCoupons: Coupon[] = couponsRes.data.map((c: any) => ({
          id: c.id,
          shopName: c.shop_name,
          title: c.title,
          description: c.description,
          requiredScore: c.required_score || 0,
          discount: c.discount_rate || c.discount || 'Special',
          imageUrl: c.image_url,
          area: c.area,
          isUsed: c.is_used || false,
          discountRate: c.discount_rate
        }));
        setCoupons(mappedCoupons);
      }

      // 4. Missions
      if (missionsRes.data) {
        const mappedMissions: VolunteerMission[] = missionsRes.data.map((m: any) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          points: m.points,
          area: m.area,
          date: m.date,
          currentParticipants: m.current_participants || 0,
          maxParticipants: m.max_participants || 10
        }));
        setMissions(mappedMissions);
      }

      setIsLoading(false);
    }).catch(err => {
      console.error(err);
      addToast('データの読み込みに失敗しました。再読み込みしてください。', 'error');
      setIsLoading(false);
    });

  }, [selectedAreas, user]);

  const [publicCommunity, setPublicCommunity] = useState<Community | null>(null);

  // URLからの招待コードチェック
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('invite');
    if (inviteCode) {
      // 本来はDBから取得。ここではモック
      // テスト用に特定のコードでモックデータを返す
      const mockPublicComm: Community = {
        id: 'c-public-demo',
        name: '三郷1丁目町会',
        description: '三郷1丁目の住民とお知らせを共有するコミュニティです。',
        ownerId: 'owner',
        inviteCode: inviteCode,
        membersCount: 42,
        isSecret: false // 公開
      };
      setPublicCommunity(mockPublicComm);
    }
  }, []);

  // LINEログイン (Supabase Auth)
  const handleLineLogin = async (role: 'resident' | 'chokai_leader' | 'business' = 'resident') => {
    localStorage.setItem('loginRole', role);

    // 1. まず標準のLINEプロバイダーを試行
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'line',
      options: {
        redirectTo: window.location.origin,
        scopes: 'profile openid',
        queryParams: {
          access_type: 'offline',
          prompt: 'consents'
        }
      }
    });

    if (error) {
      console.warn('Native LINE login failed:', error);

      // LINEプロバイダーが見つからない場合、自動的にOIDC接続を試みる（フォールバック）
      // ユーザーが「LINEが一覧にないからOpenID Connectで設定した」ケースに対応
      if (error.message.includes('Provider line could not be found')) {
        console.log('Falling back to OIDC provider for LINE...');
        const { error: oidcError } = await supabase.auth.signInWithOAuth({
          provider: 'oidc',
          options: {
            redirectTo: window.location.origin,
            scopes: 'openid profile',
            queryParams: {
              prompt: 'consents',
              // issuer などのパラメータはSupabase側で固定設定されている前提
            }
          }
        });

        if (oidcError) {
          console.error('OIDC Fallback failed:', oidcError);
          // 両方ダメだった場合
          alert(
            '【重要：ログイン設定が必要です】\n\n' +
            'Supabase側でLINEログインが有効になっていません。\n' +
            '前回ログインできた設定に戻すには、以下のいずれかを行ってください：\n\n' +
            'A. Supabase > Auth > Providers で「LINE」を追加して有効化する。\n' +
            '   ※一覧にない場合は「Add Provider」メニューから探してください。\n\n' +
            'B. または「OpenID Connect」を有効化し、Issuerに「https://access.line.me」を設定する。\n\n' +
            'この設定を行わないとログインできません。'
          );
        }
      } else {
        addToast('ログインエラー: ' + error.message, 'error');
      }
    }
  };

  // Auth State Monitoring & Profile Sync
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        console.log('Signed in via Supabase Auth:', session.user.id);

        // 既にローカルステートがある場合はスキップ（二重処理防止）
        if (user && user.id === session.user.id) return;

        const role = localStorage.getItem('loginRole') as any || 'resident';

        // 事前入力情報の確認
        const pendingRegStr = localStorage.getItem('pendingRegistration');
        const pendingReg = pendingRegStr ? JSON.parse(pendingRegStr) : null;

        // 既存プロフィール取得
        const { data: existingProfile } = await getProfile(session.user.id);

        let finalUser: User;

        if (existingProfile) {
          // 既存ユーザー: プロフィール情報を優先
          console.log('Existing profile found:', existingProfile);
          finalUser = {
            id: existingProfile.id,
            nickname: existingProfile.nickname,
            role: existingProfile.role as any,
            avatar: existingProfile.avatar_url,
            score: existingProfile.score,
            level: existingProfile.level,
            selectedAreas: existingProfile.selected_areas || ['さいたま市大宮区'],
            isLineConnected: true
          };

          // もし事前登録情報があって、かつ既存プロフィールと違う場合は更新する？
          // 今回は「既存ユーザーならログイン」という要望なので、あえて上書きしない、
          // もしくはユーザーに確認するフローがベストだが、
          // ここでは「既存情報優先」として、pendingRegistrationは破棄する（重複登録防止）
          if (pendingReg) {
            addToast(`おかえりなさい、${existingProfile.nickname}さん！`, 'success');
            localStorage.removeItem('pendingRegistration');
          }

        } else {
          // 新規ユーザー (またはSupabaseにプロフィールがない)
          console.log('Creating new profile for:', session.user.id);
          finalUser = {
            id: session.user.id,
            nickname: pendingReg?.nickname || (role === 'business' ? '店名未設定' : 'ゲスト'),
            role: role,
            avatar: session.user.user_metadata.avatar_url || (role === 'business' ? 'https://api.dicebear.com/7.x/bottts/svg?seed=business' : 'https://api.dicebear.com/7.x/avataaars/svg?seed=lineuser'),
            score: 150,
            level: 1,
            selectedAreas: pendingReg?.areas || ['さいたま市大宮区'],
            isLineConnected: true
          };

          // プロフィール作成
          await createProfile(finalUser);
          if (pendingReg) {
            addToast('登録が完了しました！', 'success');
            localStorage.removeItem('pendingRegistration');
          }
        }

        // コミュニティ招待の処理
        const pendingInvite = localStorage.getItem('pendingInvite');
        if (pendingInvite) {
          addToast('コミュニティに参加しました。', 'success');
          localStorage.removeItem('pendingInvite');
        }

        localStorage.setItem('saitama_user_id', finalUser.id);
        setUser(finalUser);
        localStorage.removeItem('loginRole');
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('saitama_user_id');
      }
    });

    return () => subscription.unsubscribe();
  }, [user]);

  const handleRegistrationComplete = async (nickname: string, areas: string[]) => {
    if (user) {
      const updatedUser = { ...user, nickname, selectedAreas: areas };
      const { error } = await createProfile(updatedUser);
      if (!error) {
        setUser(updatedUser);
        setSelectedAreas(areas);
        setIsEditingProfile(false);
        addToast('プロフィールを更新しました', 'success');
      } else {
        addToast('更新に失敗しました', 'error');
      }
    }
  };

  // 事前登録フロー（情報入力 -> LINE認証）
  const handlePreRegister = (nickname: string, areas: string[]) => {
    localStorage.setItem('pendingRegistration', JSON.stringify({ nickname, areas }));
    handleLineLogin('resident');
  };

  const addScore = (amount: number) => {
    setScore(prev => prev + amount);
    setShowScorePopup({ show: true, amount });
    setTimeout(() => setShowScorePopup({ show: false, amount: 0 }), 2000);
  };

  const handleAddComment = async (postId: string, content: string) => {
    if (!user) return;
    try {
      await addComment({ postId, userId: user.id, content });
      addToast('コメントを送信しました', 'success');
    } catch (e) {
      console.error(e);
      addToast('送信に失敗しました', 'error');
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!user) return;
    addScore(2);
    toggleLike(postId, user.id);
  };

  const handleCreateKairanban = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBroadcasting(true);

    const kairanPayload = {
      title: newPost.title,
      content: newPost.content,
      area: newPost.area,
      author: user?.nickname,
      sent_to_line: true,
      communityId: selectedCommunity?.id
    };

    const { data, error } = await createKairanbanWithNotification(kairanPayload);

    if (!error && data && data.length > 0) {
      const newKairan: Kairanban = {
        id: data[0].id,
        title: data[0].title,
        content: data[0].content,
        // date removed as it causes type error and is not used
        author: data[0].author,
        points: data[0].points || 0,
        readCount: 0,
        isRead: false,
        sentToLine: data[0].sent_to_line || false,
        createdAt: data[0].created_at,
        category: 'notice',
        communityId: data[0].community_id
      };
      setKairanbans([newKairan, ...kairanbans]);
      addScore(50);
      setIsPosting(false);
      setNewPost({ title: '', content: '', category: 'notice', area: '' });
    }
    setIsBroadcasting(false);
  };

  const handleRegisterCoupon = async (coupon: Coupon) => {
    const { data, error } = await registerLocalCoupon(coupon);
    if (!error && data) {
      const newCoupon = { ...coupon, id: data[0].id }; // ID from DB
      setCoupons([newCoupon, ...coupons]);
      addScore(100);
    }
  };

  if (tempUser) {
    return (
      <RegistrationModal
        initialNickname={tempUser.nickname}
        onRegister={handleRegistrationComplete}
      />
    );
  }

  if (isEditingProfile && user) {
    return (
      <RegistrationModal
        initialNickname={user.nickname}
        onRegister={handleRegistrationComplete}
      />
    );
  }



  if (!user) {
    // 公開コミュニティビュー (招待リンク経由)
    if (publicCommunity) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6 font-sans">
          <header className="w-full max-w-lg flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 font-black text-indigo-600">
              <span className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center">S</span>
              回覧板BASE
            </div>
            <button onClick={() => setPublicCommunity(null)} className="text-xs font-bold text-slate-400">ログイン</button>
          </header>

          <div className="w-full max-w-lg space-y-6">
            {/* コミュニティヘッダー */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl text-center border-t-8 border-indigo-500">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-3xl mx-auto flex items-center justify-center text-4xl mb-4 text-white shadow-lg shadow-indigo-200">
                {publicCommunity.name[0]}
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">{publicCommunity.name}</h2>
              <p className="text-slate-500 text-sm font-bold mb-6">{publicCommunity.description}</p>

              <div className="flex items-center justify-center gap-4 mb-8">
                <span className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-xs font-black">
                  <i className="fas fa-users mr-2"></i>{publicCommunity.membersCount}人が参加中
                </span>
                <span className="bg-emerald-100 text-emerald-600 px-4 py-2 rounded-xl text-xs font-black">
                  <i className="fas fa-shield-alt mr-2"></i>公式認証済み
                </span>
              </div>

              <button
                onClick={() => handleLineLogin('resident')}
                className="w-full bg-[#06C755] text-white font-black py-4 rounded-2xl shadow-xl hover:bg-[#05b34c] transition-all flex items-center justify-center gap-3 animate-pulse"
              >
                <i className="fab fa-line text-2xl"></i> LINEで参加する
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-3 font-bold text-center">LINEアカウントで即座に参加できます</p>

            {/* 公開掲示板プレビュー */}
            <div className="w-full max-w-lg mt-6">
              <h3 className="text-sm font-black text-slate-400 ml-4 mb-3">📌 最新の回覧板（プレビュー）</h3>
              <div className="bg-white rounded-[2rem] p-6 border border-slate-100 opacity-80">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-black text-slate-800">今月の資源回収について</h4>
                  <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-500">3日前</span>
                </div>
                <p className="text-sm text-slate-500 line-clamp-2">今月の資源回収は第3水曜日になります。古紙・ダンボールは...</p>
                <div className="mt-3 pt-3 border-t border-slate-50 text-center">
                  <span className="text-indigo-600 text-xs font-bold">続きを読むには参加してください</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      );
    }

    // 通常の未ログイン状態はランディングページを表示
    return <LandingPage
      onLogin={() => handleLineLogin('resident')}
      onPreRegister={handlePreRegister} // 新規フロー
    />;
  }


  const handleCreateMission = async (e: React.FormEvent) => {
    e.preventDefault();
    const missionPayload = {
      ...newMission,
      area: selectedAreas[0] // Default to first selected area for now
    };

    const { data, error } = await createMission(missionPayload);
    if (!error && data) {
      const created: VolunteerMission = {
        id: data[0].id,
        title: data[0].title,
        description: data[0].description,
        points: data[0].points,
        area: data[0].area,
        date: data[0].date,
        currentParticipants: 0,
        maxParticipants: data[0].max_participants
      };
      setMissions([created, ...missions]);
      setIsCreatingMission(false);
      setNewMission({ title: '', description: '', points: 50, area: '', date: '', maxParticipants: 5 });
      addToast('ミッションを作成しました', 'success');
    }
  };

  const handleJoinMission = async (id: string, points: number) => {
    if (!user) return;
    const { error } = await joinMission(id, user.id);
    if (!error) {
      setMissions(missions.map(m => m.id === id ? { ...m, currentParticipants: m.currentParticipants + 1 } : m));
      addScore(points);
      addToast('ミッションに参加しました！', 'success');
    }
  };

  // 残りのレンダリングロジックは以前と同様
  const renderContent = () => {
    switch (activeTab) {
      case 'community':
        // ... (keep existing community case logic)
        if (selectedCommunity) {
          // コミュニティ詳細画面
          const communityKairanbans = kairanbans.filter(k => (k as any).communityId === selectedCommunity.id);

          return (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              {/* ヘッダー */}
              <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
                <button
                  onClick={() => setSelectedCommunity(null)}
                  className="absolute top-6 left-6 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors backdrop-blur-sm"
                >
                  <i className="fas fa-arrow-left"></i>
                </button>
                <div className="mt-8">
                  <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-[10px] font-black tracking-widest mb-2 backdrop-blur-sm">VIP COMMUNITY</span>
                  <h2 className="text-3xl font-black mb-2">{selectedCommunity.name}</h2>
                  <p className="opacity-80 font-bold text-sm mb-6">{selectedCommunity.description}</p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}?invite=${selectedCommunity.inviteCode}`;
                        navigator.clipboard.writeText(url);
                        addToast(`招待リンクをコピーしました！`, 'success');
                      }}
                      className="flex-1 py-3 bg-white text-indigo-600 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                    >
                      <i className="fas fa-share-alt"></i> 招待する
                    </button>
                    <button
                      onClick={() => {
                        setIsPosting(true);
                        setNewPost({ ...newPost, category: 'chokai', area: selectedCommunity.name });
                      }}
                      className="flex-1 py-3 bg-indigo-800/50 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-indigo-800/70 transition-colors border border-white/10"
                    >
                      <i className="fas fa-bullhorn"></i> 回覧板作成
                    </button>
                  </div>
                </div>
              </div>

              {/* 投稿フォーム (コミュニティ用) */}
              {isPosting && (
                <div className="bg-white border-2 border-indigo-500 rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                      <i className="fab fa-line text-[#06C755]"></i> メンバーへ一斉配信
                    </h3>
                    <button onClick={() => setIsPosting(false)} className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center"><i className="fas fa-times"></i></button>
                  </div>
                  <form onSubmit={(e) => {
                    // コミュニティ用の投稿ハンドラ
                    e.preventDefault();
                    // ... (keep logic)
                    const kairan = {
                      id: `k-${Date.now()}`,
                      title: newPost.title,
                      content: newPost.content,
                      area: selectedCommunity.name,
                      author: user?.nickname || '管理者',
                      points: 20,
                      readCount: 0,
                      isRead: false,
                      sentToLine: true,
                      createdAt: new Date().toISOString(),
                      communityId: selectedCommunity.id
                    };
                    setKairanbans([kairan as any, ...kairanbans]);
                    setIsPosting(false);
                    setNewPost({ title: '', content: '', category: 'notice', area: '' });
                    addToast(`${selectedCommunity.membersCount}人のLINEに配信しました！`, 'success');
                  }} className="space-y-4">
                    {/* ... form content ... */}
                    <p className="text-sm font-bold text-slate-500 bg-slate-50 p-4 rounded-xl">
                      <i className="fas fa-info-circle mr-2"></i>
                      「{selectedCommunity.name}」に参加している{selectedCommunity.membersCount}名のLINEに通知が届きます。
                    </p>
                    <input type="text" placeholder="タイトル" className="w-full px-5 py-4 bg-slate-50 rounded-2xl outline-none font-black" value={newPost.title} onChange={e => setNewPost({ ...newPost, title: e.target.value })} />
                    <textarea placeholder="連絡事項を入力..." className="w-full px-5 py-4 bg-slate-50 rounded-2xl outline-none min-h-[150px] font-medium" value={newPost.content} onChange={e => setNewPost({ ...newPost, content: e.target.value })} />
                    <button type="submit" disabled={!newPost.title} className="w-full bg-[#06C755] text-white font-black py-5 rounded-2xl shadow-xl hover:bg-[#05b34c] transition-all flex items-center justify-center gap-3 disabled:bg-slate-200">
                      <i className="fab fa-line text-2xl"></i> 一斉送信
                    </button>
                  </form>
                </div>
              )}

              {/* タイムライン */}
              <div className="space-y-4">
                <h3 className="font-black text-slate-400 text-sm px-4">最近のお知らせ</h3>
                {/* ... list ... */}
                {communityKairanbans.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-[2rem] border border-slate-100">
                    <p className="text-slate-400 font-bold">まだお知らせはありません</p>
                  </div>
                ) : (
                  communityKairanbans.map(k => (
                    <div key={k.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-black text-lg text-slate-800">{k.title}</h4>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-lg">{(k as any).sentToLine ? 'LINED' : ''}</span>
                      </div>
                      <p className="text-slate-600 font-medium mb-4">{k.content}</p>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                        <span>{new Date(k.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{k.author}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        }
        return (
          <CommunityPanel
            user={user}
            myCommunities={myCommunities}
            onCreateCommunity={(name, desc, isSecret) => {
              const newComm: Community = {
                id: `c-${Date.now()}`,
                name,
                description: desc,
                ownerId: user.id,
                inviteCode: Math.random().toString(36).substring(7),
                membersCount: 1,
                isSecret
              };
              setMyCommunities([...myCommunities, newComm]);
            }}
            onJoinCommunity={(code) => {
              // モック: コードが合えば参加したことにする
              const newComm: Community = {
                id: `c-join-${Date.now()}`,
                name: '招待されたコミュニティ',
                description: '招待コード経由で参加しました',
                ownerId: 'other',
                inviteCode: code,
                membersCount: 12,
                isSecret: false
              };
              setMyCommunities([...myCommunities, newComm]);
              addToast('コミュニティに参加しました！', 'success');
            }}
            onSelectCommunity={setSelectedCommunity}
          />
        );
      case 'feed':
        // ... (keep feed logic)
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* ... */}
            {user.role === 'chokai_leader' && !isPosting && (
              <div className="bg-emerald-600 rounded-[2rem] p-6 text-white shadow-xl shadow-emerald-200">
                {/* ... */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <i className="fab fa-line text-2xl"></i>
                  </div>
                  <div>
                    <h3 className="font-black">町会長パネル (Push Enabled)</h3>
                    <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Connected to Supabase Functions</p>
                  </div>
                </div>
                <button onClick={() => setIsPosting(true)} className="w-full bg-white text-emerald-600 font-black py-4 rounded-2xl hover:bg-emerald-50 transition-all flex items-center justify-center gap-2">
                  <i className="fas fa-bullhorn"></i> LINE一斉通知を送信する
                </button>
              </div>
            )}
            {/* ... */}
            {/* General Post Creation Button */}
            {!isPosting && (
              <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 mb-6 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setIsPosting(true)}>
                <img src={user.avatar} className="w-10 h-10 rounded-full border border-slate-200" alt="avatar" />
                <div className="flex-1 bg-slate-100 h-10 rounded-full flex items-center px-4 text-slate-400 font-bold text-sm">
                  地域の出来事をシェアしよう...
                </div>
                <button className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center hover:bg-indigo-100 transition-colors">
                  <i className="fas fa-image"></i>
                </button>
              </div>
            )}

            {/* General Post Creation Modal */}
            {isPosting && (
              <div className="bg-white border-2 border-indigo-500 rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 mb-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                    <i className="fas fa-pen-fancy text-indigo-500"></i> 投稿を作成
                  </h3>
                  <button onClick={() => setIsPosting(false)} className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-200"><i className="fas fa-times"></i></button>
                </div>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newPost.title || !newPost.content) return;

                  const postPayload = {
                    userId: user.id,
                    userName: user.nickname,
                    userAvatar: user.avatar,
                    category: newPost.category as any,
                    area: selectedAreas[0], // Default to primary area
                    title: newPost.title,
                    content: newPost.content,
                    imageUrl: newPost.imageUrl
                  };

                  const { data, error } = await createPost(postPayload);

                  if (!error && data) {
                    const createdPost: Post = {
                      id: data[0].id,
                      ...postPayload,
                      likes: 0,
                      comments: [],
                      createdAt: new Date().toISOString()
                    };
                    setPosts([createdPost, ...posts]);
                    setIsPosting(false);
                    setNewPost({ title: '', content: '', category: 'general', area: '', imageUrl: '' });
                    addToast('投稿しました！', 'success');
                    addScore(5); // 投稿ボーナス
                  } else {
                    addToast('投稿に失敗しました', 'error');
                  }
                }} className="space-y-4">
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {['general', 'event', 'safety', 'marketplace', 'notice'].map(cat => (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setNewPost({ ...newPost, category: cat })}
                        className={`px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all ${newPost.category === cat ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                      >
                        {cat === 'general' && '雑談'}
                        {cat === 'event' && 'イベント'}
                        {cat === 'safety' && '防犯・防災'}
                        {cat === 'marketplace' && '譲ります'}
                        {cat === 'notice' && 'お知らせ'}
                      </button>
                    ))}
                  </div>
                  <input type="text" placeholder="タイトル" className="w-full px-5 py-4 bg-slate-50 rounded-2xl outline-none font-black text-lg" value={newPost.title} onChange={e => setNewPost({ ...newPost, title: e.target.value })} autoFocus />
                  <textarea placeholder="内容を入力..." className="w-full px-5 py-4 bg-slate-50 rounded-2xl outline-none min-h-[120px] font-medium resize-none" value={newPost.content} onChange={e => setNewPost({ ...newPost, content: e.target.value })} />

                  {/* Image URL Input (Simplified for mock) */}
                  <div className="flex items-center gap-2 bg-slate-50 px-5 py-3 rounded-2xl">
                    <i className="fas fa-link text-slate-400"></i>
                    <input type="text" placeholder="画像URL (任意)" className="w-full bg-transparent outline-none text-sm font-bold text-slate-600" value={newPost.imageUrl || ''} onChange={e => setNewPost({ ...newPost, imageUrl: e.target.value })} />
                  </div>

                  <button type="submit" disabled={!newPost.title || !newPost.content} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-indigo-500 transition-all flex items-center justify-center gap-3 disabled:bg-slate-200 disabled:cursor-not-allowed">
                    <i className="fas fa-paper-plane"></i> 投稿する
                  </button>
                </form>
              </div>
            )}

            {isPosting && user.role === 'chokai_leader' && (
              <div className="mb-8 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <p className="text-xs font-bold text-emerald-800 mb-2">💡 町会長メニュー</p>
                <button onClick={() => { /* Switch mode logic if needed, or just keep separate */ }} className="text-[10px] bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg">
                  回覧板作成モードに切り替え
                </button>
              </div>
            )}

            <div className="space-y-4">
              {isLoading ? (
                <>
                  <PostSkeleton />
                  <PostSkeleton />
                  <PostSkeleton />
                </>
              ) : posts.length === 0 ? (
                <EmptyState
                  title="まだ投稿がありません"
                  description="この地域の最初の投稿を作成してみましょう！"
                />
              ) : (
                posts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onLike={() => handleLikePost(post.id)}
                    currentUser={user || undefined}
                    onAddComment={handleAddComment}
                  />
                ))
              )}
            </div>
          </div>
        );
      case 'chokai':
        return (
          <>
            {isCreatingMission && (
              <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                <div className="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-xl text-slate-800">お手伝いミッション作成</h3>
                    <button onClick={() => setIsCreatingMission(false)} className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center"><i className="fas fa-times"></i></button>
                  </div>
                  <form onSubmit={handleCreateMission} className="space-y-4">
                    <input type="text" placeholder="ミッション名 (例: 公園の清掃)" required className="w-full px-5 py-4 bg-slate-50 rounded-2xl outline-none font-black" value={newMission.title} onChange={e => setNewMission({ ...newMission, title: e.target.value })} />
                    <textarea placeholder="内容の詳細..." required className="w-full px-5 py-4 bg-slate-50 rounded-2xl outline-none min-h-[100px] font-medium" value={newMission.description} onChange={e => setNewMission({ ...newMission, description: e.target.value })} />
                    <div className="grid grid-cols-2 gap-4">
                      <input type="text" placeholder="開催日 (例: 12/30 10:00)" required className="w-full px-5 py-4 bg-slate-50 rounded-2xl outline-none" value={newMission.date} onChange={e => setNewMission({ ...newMission, date: e.target.value })} />
                      <input type="number" placeholder="最大人数" required className="w-full px-5 py-4 bg-slate-50 rounded-2xl outline-none" value={newMission.maxParticipants} onChange={e => setNewMission({ ...newMission, maxParticipants: parseInt(e.target.value) })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input type="number" placeholder="付与ポイント" required className="w-full px-5 py-4 bg-slate-50 rounded-2xl outline-none" value={newMission.points} onChange={e => setNewMission({ ...newMission, points: parseInt(e.target.value) })} />
                      <div className="flex items-center justify-center font-bold text-slate-400 bg-slate-50 rounded-2xl">
                        エリア: {selectedAreas[0]}
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-rose-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-rose-500 transition-all">作成する</button>
                  </form>
                </div>
              </div>
            )}
            <ChokaiPanel
              kairanbans={kairanbans}
              missions={missions}
              onReadKairanban={(id, p) => addScore(p)}
              onJoinMission={handleJoinMission}
              selectedAreas={selectedAreas}
              userRole={user?.role}
              onOpenCreateMission={() => setIsCreatingMission(true)}
              myCommunities={myCommunities}
            />
          </>
        );
      case 'coupons':
        return <CouponList coupons={coupons} currentScore={score} selectedAreas={selectedAreas} />;
      case 'business':
        return <BusinessPanel user={user} onRegisterCoupon={handleRegisterCoupon} myCoupons={coupons.filter(c => c.shopName === user.shopName)} />;
      case 'admin':
        return user.role === 'admin' ? <AdminDashboard currentUser={user} onAddToast={addToast} /> : null;
      case 'ai': return <AIChat />;
      case 'profile':
        // ... (keep profile logic)
        return (
          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm space-y-8 animate-in slide-in-from-right">
            {/* ... */}
            <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-100">
              <img src={user.avatar} className="w-24 h-24 rounded-3xl shadow-lg" alt="avatar" />
              <div>
                <h2 className="text-3xl font-black text-slate-800 mb-1">{user.nickname}</h2>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-lg text-xs font-bold">住民ランク: {user.level}</span>
                  <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold">ID: {user.id.substring(0, 8)}</span>
                </div>
                <button onClick={() => setIsEditingProfile(true)} className="mt-4 text-emerald-600 text-sm font-bold flex items-center gap-2 hover:underline">
                  <i className="fas fa-pen"></i> プロフィールを編集
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-slate-800">マイエリア設定 (Real-time Sync)</h3>
              <button
                onClick={() => {
                  if (!navigator.geolocation) {
                    addToast('位置情報がサポートされていません', 'error');
                    return;
                  }
                  navigator.geolocation.getCurrentPosition(pos => {
                    const { latitude, longitude } = pos.coords;
                    let nearest = '';
                    let minDistance = Infinity;
                    Object.entries(MUNICIPALITY_COORDINATES).forEach(([name, coords]) => {
                      const dist = Math.sqrt(Math.pow(coords.lat - latitude, 2) + Math.pow(coords.lon - longitude, 2));
                      if (dist < minDistance) {
                        minDistance = dist;
                        nearest = name;
                      }
                    });
                    if (nearest && !selectedAreas.includes(nearest)) {
                      setSelectedAreas([...selectedAreas, nearest]);
                      addToast(`${nearest}を追加しました`, 'success');
                    } else if (nearest) {
                      addToast(`${nearest}は既に追加されています`, 'info');
                    }
                  }, () => addToast('位置情報の取得に失敗しました', 'error'));
                }}
                className="text-[10px] bg-slate-900 text-white px-3 py-1 rounded-lg font-bold flex items-center gap-1 hover:bg-slate-700"
              >
                <i className="fas fa-location-arrow"></i> 現在地から追加
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {SAITAMA_MUNICIPALITIES.map(area => (
                <button key={area} onClick={() => setSelectedAreas(selectedAreas.includes(area) ? selectedAreas.filter(a => a !== area) : [...selectedAreas, area])} className={`text-[10px] p-2 rounded-xl border font-bold transition-all ${selectedAreas.includes(area) ? 'bg-emerald-50 border-emerald-600 text-emerald-700' : 'bg-white border-slate-200 text-slate-500'}`}>{area}</button>
              ))}
            </div>

            <div className="bg-emerald-50 rounded-xl p-4 mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#06C755] rounded-full flex items-center justify-center text-white text-xl">
                  <i className="fab fa-line"></i>
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-700">埼玉BASE公式アカウント</p>
                  <p className="text-[10px] text-slate-500">最新情報やクーポンを受け取る</p>
                </div>
              </div>
              <a
                href="https://line.me/R/ti/p/@357rcjnp"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#06C755] text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#05b34c] transition-colors"
              >
                友だち追加
              </a>
            </div>

            <div className="pt-8 border-t border-slate-100">
              <button
                onClick={() => {
                  const confirm = window.confirm('ログアウトしますか？');
                  if (confirm) {
                    localStorage.removeItem('saitama_user_id');
                    sessionStorage.clear();
                    setUser(null);
                    window.location.href = '/';
                  }
                }}
                className="w-full py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
              >
                ログアウト
              </button>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      score={score}
      selectedAreas={selectedAreas}
      userRole={user.role}
      onClickProfile={() => setIsEditingProfile(true)}
      userNickname={user.nickname}
      userAvatar={user.avatar}
    >
      {showScorePopup.show && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-10 fade-in duration-500">
          <div className="bg-slate-900 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 font-black border-2 border-emerald-500/30">
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs"><i className="fas fa-plus"></i></div>
            <span className="tracking-tight">LOCAL SCORE +{showScorePopup.amount}!</span>
          </div>
        </div>
      )}
      <Toast toasts={toasts} onRemove={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />

      {renderContent()}
    </Layout>
  );
};

export default App;
