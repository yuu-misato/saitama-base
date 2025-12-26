
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import PostCard from './components/PostCard';
import AIChat from './components/AIChat';
import CouponList from './components/CouponList';
import ChokaiPanel from './components/ChokaiPanel';
import BusinessPanel from './components/BusinessPanel';
import { Post, PostCategory, Coupon, Kairanban, VolunteerMission, User } from './types';
import { SAITAMA_MUNICIPALITIES, MOCK_KAIRANBAN, MOCK_MISSIONS, MOCK_COUPONS, INITIAL_POSTS } from './constants';
import { supabase, getPosts, createKairanbanWithNotification, registerLocalCoupon } from './services/supabaseService';
import { summarizeLocalFeed } from './services/geminiService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('feed');
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [kairanbans, setKairanbans] = useState<Kairanban[]>(MOCK_KAIRANBAN);
  const [missions, setMissions] = useState<VolunteerMission[]>(MOCK_MISSIONS);
  const [coupons, setCoupons] = useState<Coupon[]>(MOCK_COUPONS);
  const [score, setScore] = useState(150);
  const [selectedAreas, setSelectedAreas] = useState<string[]>(['さいたま市大宮区']);
  const [isPosting, setIsPosting] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', category: 'notice' as PostCategory, area: '' });
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [showScorePopup, setShowScorePopup] = useState<{ show: boolean, amount: number }>({ show: false, amount: 0 });

  // Supabase Auth 状態監視
  useEffect(() => {
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // LINEプロファイルからユーザー情報をマッピング
        // 本来は getProfile(session.user.id) でDBから詳細を取得
        setUser({
          id: session.user.id,
          nickname: session.user.user_metadata.full_name || '住民ユーザー',
          role: 'resident', // デフォルト
          avatar: session.user.user_metadata.avatar_url || '',
          score: 150,
          level: 2,
          selectedAreas: ['さいたま市大宮区'],
          isLineConnected: true
        });
      }
    });
  }, []);

  // 実データのフェッチ（エリア変更時など）
  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        const { data } = await getPosts(selectedAreas);
        if (data) setPosts(data as any);
      };
      fetchData();
    }
  }, [selectedAreas, user]);

  const handleLineLogin = async (role: 'resident' | 'chokai_leader' | 'business' = 'resident') => {
    // Supabaseを使用したLINE OAuthログイン
    // LINE連携設定が完了するまで、一時的にモックログインを使用します
    // const { error } = await supabase.auth.signInWithOAuth({
    //   provider: 'line' as any,
    //   options: {
    //     redirectTo: window.location.origin,
    //     queryParams: { role } // カスタム属性として渡す例
    //   }
    // });

    // if (error) {
    //   console.error("Login failed:", error.message);
    // モックログイン（プロトタイプ用）
    const mockUser: User = {
      id: `u-${Date.now()}`,
      nickname: role === 'chokai_leader' ? '大宮三丁目町会長' : role === 'business' ? '大宮盆栽村カフェ店主' : '大宮の住人',
      role: role,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${role}`,
      score: role === 'business' ? 1000 : 150,
      level: 2,
      selectedAreas: ['さいたま市大宮区'],
      isLineConnected: true,
      shopName: role === 'business' ? '大宮盆栽村カフェ' : undefined
    };
    setUser(mockUser);
    if (role === 'business') setActiveTab('business');
    // }
  };

  const addScore = (amount: number) => {
    setScore(prev => prev + amount);
    setShowScorePopup({ show: true, amount });
    setTimeout(() => setShowScorePopup({ show: false, amount: 0 }), 2000);
  };

  const handleCreateKairanban = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBroadcasting(true);

    const kairan = {
      title: newPost.title,
      content: newPost.content,
      area: newPost.area,
      author: user?.nickname,
      points: 20,
      sent_to_line: true,
      created_at: new Date().toISOString()
    };

    const { data, error } = await createKairanbanWithNotification(kairan);

    if (!error && data && data.length > 0) {
      setKairanbans([{ ...kairan, id: data[0].id, readCount: 0, isRead: false, sentToLine: true } as any, ...kairanbans]);
      addScore(50);
      setIsPosting(false);
      setNewPost({ title: '', content: '', category: 'notice', area: '' });
    }
    setIsBroadcasting(false);
  };

  const handleRegisterCoupon = async (coupon: Coupon) => {
    const { error } = await registerLocalCoupon(coupon);
    if (!error) {
      setCoupons([coupon, ...coupons]);
      addScore(100);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white font-sans">
        <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-700">
          <div className="space-y-4">
            <div className="w-20 h-20 bg-emerald-500 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-emerald-500/20 italic text-3xl font-black">S</div>
            <h1 className="text-4xl font-black tracking-tighter">Saitama BASE</h1>
            <p className="text-slate-400 font-bold leading-relaxed">
              Amplify × Supabase 高速インフラ稼働中<br />
              LINE連携で地域に参加しましょう。
            </p>
          </div>

          <div className="space-y-3">
            <button onClick={() => handleLineLogin('resident')} className="w-full bg-[#06C755] hover:bg-[#05b34c] text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-[#06C755]/20">
              <i className="fab fa-line text-2xl"></i> LINEで今すぐ登録
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => handleLineLogin('chokai_leader')} className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-2xl text-[10px] transition-all">町会長・自治会</button>
              <button onClick={() => handleLineLogin('business')} className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-2xl text-[10px] transition-all">地域事業者</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 残りのレンダリングロジックは以前と同様
  const renderContent = () => {
    switch (activeTab) {
      case 'feed':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            {user.role === 'chokai_leader' && !isPosting && (
              <div className="bg-emerald-600 rounded-[2rem] p-6 text-white shadow-xl shadow-emerald-200">
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
            {isPosting && user.role === 'chokai_leader' ? (
              <div className="bg-white border-2 border-emerald-500 rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                    <i className="fab fa-line text-[#06C755]"></i> Supabase × LINE Broadcast
                  </h3>
                  <button onClick={() => setIsPosting(false)} className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center"><i className="fas fa-times"></i></button>
                </div>
                <form onSubmit={handleCreateKairanban} className="space-y-4">
                  <select className="w-full px-5 py-3 bg-slate-50 rounded-2xl outline-none font-bold border border-slate-100" value={newPost.area} onChange={e => setNewPost({ ...newPost, area: e.target.value })}>
                    <option value="">配信エリアを選択</option>
                    {selectedAreas.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <input type="text" placeholder="配信タイトル" className="w-full px-5 py-4 bg-slate-50 rounded-2xl outline-none font-black" value={newPost.title} onChange={e => setNewPost({ ...newPost, title: e.target.value })} />
                  <textarea placeholder="本文を入力..." className="w-full px-5 py-4 bg-slate-50 rounded-2xl outline-none min-h-[150px] font-medium" value={newPost.content} onChange={e => setNewPost({ ...newPost, content: e.target.value })} />
                  <button type="submit" disabled={isBroadcasting || !newPost.area || !newPost.title} className="w-full bg-[#06C755] text-white font-black py-5 rounded-2xl shadow-xl hover:bg-[#05b34c] transition-all flex items-center justify-center gap-3 disabled:bg-slate-200">
                    {isBroadcasting ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fab fa-line text-2xl"></i> LINE友だち全員に通知</>}
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map(post => <PostCard key={post.id} post={post} onLike={() => addScore(2)} />)}
              </div>
            )}
          </div>
        );
      case 'chokai':
        return <ChokaiPanel kairanbans={kairanbans} missions={missions} onReadKairanban={(id, p) => addScore(p)} onJoinMission={(id, p) => addScore(p)} selectedAreas={selectedAreas} />;
      case 'coupons':
        return <CouponList coupons={coupons} currentScore={score} selectedAreas={selectedAreas} />;
      case 'business':
        return <BusinessPanel user={user} onRegisterCoupon={handleRegisterCoupon} myCoupons={coupons.filter(c => c.shopName === user.shopName)} />;
      case 'ai': return <AIChat />;
      case 'profile':
        return (
          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm space-y-8">
            <h3 className="text-2xl font-black text-slate-800">マイエリア設定 (Real-time Sync)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {SAITAMA_MUNICIPALITIES.map(area => (
                <button key={area} onClick={() => setSelectedAreas(selectedAreas.includes(area) ? selectedAreas.filter(a => a !== area) : [...selectedAreas, area])} className={`text-[10px] p-2 rounded-xl border font-bold transition-all ${selectedAreas.includes(area) ? 'bg-emerald-50 border-emerald-600 text-emerald-700' : 'bg-white border-slate-200 text-slate-500'}`}>{area}</button>
              ))}
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} score={score} selectedAreas={selectedAreas} userRole={user.role}>
      {showScorePopup.show && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-10 fade-in duration-500">
          <div className="bg-slate-900 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 font-black border-2 border-emerald-500/30">
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs"><i className="fas fa-plus"></i></div>
            <span className="tracking-tight">LOCAL SCORE +{showScorePopup.amount}!</span>
          </div>
        </div>
      )}
      {renderContent()}
    </Layout>
  );
};

export default App;
