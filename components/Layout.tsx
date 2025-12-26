
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  score: number;
  selectedAreas: string[];
  userRole?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, score, selectedAreas, userRole }) => {
  const menuItems = [
    { id: 'feed', icon: 'fa-home', label: 'タイムライン' },
    { id: 'chokai', icon: 'fa-building-columns', label: '町会・自治会' },
    { id: 'community', icon: 'fa-users', label: 'コミュニティ' },
    { id: 'coupons', icon: 'fa-ticket-alt', label: '地域クーポン' },
    ...(userRole === 'business' ? [{ id: 'business', icon: 'fa-store', label: 'クーポン管理' }] : []),
    { id: 'ai', icon: 'fa-robot', label: 'AIアシスタント' },
  ];

  const level = Math.floor(score / 100) + 1;
  const progress = (score % 100);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-200 fixed h-full shadow-sm z-30">
        <div className="p-8">
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2 text-emerald-600">
            <span className="bg-emerald-600 text-white w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-100 italic">S</span>
            Saitama BASE
          </h1>
        </div>

        {/* Score Widget */}
        <div className="mx-6 mb-6 p-5 bg-slate-900 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">Local Contrib</p>
                <h3 className="text-3xl font-black">{score}<span className="text-xs ml-1 opacity-60">pts</span></h3>
              </div>
              <div className="bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-black shadow-lg">
                Lv.{level}
              </div>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-1000"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-8 py-4 transition-all ${activeTab === item.id
                  ? 'bg-emerald-50/50 text-emerald-700 border-r-4 border-emerald-600 font-black'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
            >
              <i className={`fas ${item.icon} w-5 text-lg ${activeTab === item.id ? 'text-emerald-600' : 'text-slate-400'}`}></i>
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-4 px-8 py-4 transition-all ${activeTab === 'profile'
                ? 'bg-emerald-50/50 text-emerald-700 border-r-4 border-emerald-600 font-black'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
          >
            <i className={`fas fa-cog w-5 text-lg ${activeTab === 'profile' ? 'text-emerald-600' : 'text-slate-400'}`}></i>
            <span className="text-sm">エリア設定</span>
          </button>
        </nav>

        <div className="p-6 border-t border-slate-100">
          <div className="flex items-center gap-3 p-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
              <i className="fas fa-user-secret text-slate-400"></i>
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-black text-slate-900 truncate">ゲストユーザー</p>
              <p className="text-[9px] text-emerald-600 font-black tracking-widest uppercase">{userRole === 'business' ? 'Business Account' : 'Anonymous Mode'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-72 pb-20 md:pb-0">
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight">
              {activeTab === 'profile' ? '設定' : (menuItems.find(i => i.id === activeTab)?.label || 'ホーム')}
            </h2>
            <div className="flex gap-1 mt-0.5">
              {selectedAreas.slice(0, 1).map(area => (
                <span key={area} className="text-[10px] text-emerald-600 font-bold">{area}中心</span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-slate-100 px-3 py-1.5 rounded-full flex items-center gap-2">
              <i className="fas fa-coins text-amber-500 text-xs"></i>
              <span className="text-xs font-bold text-slate-700">{score}</span>
            </div>
          </div>
        </header>
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 flex justify-around items-center h-18 z-50">
        {menuItems.slice(0, 4).map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center py-2 flex-1 transition-all ${activeTab === item.id ? 'text-emerald-600' : 'text-slate-400'
              }`}
          >
            <i className={`fas ${item.icon} text-lg`}></i>
            <span className="text-[9px] mt-1 font-black">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
