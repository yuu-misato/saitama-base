
import React from 'react';
import { Kairanban, VolunteerMission } from '../types';

interface ChokaiPanelProps {
  kairanbans: Kairanban[];
  missions: VolunteerMission[];
  onReadKairanban: (id: string, points: number) => void;
  onJoinMission: (id: string, points: number) => void;
  selectedAreas: string[];
}

const ChokaiPanel: React.FC<ChokaiPanelProps> = ({ kairanbans, missions, onReadKairanban, onJoinMission, selectedAreas }) => {
  const filteredKairanbans = kairanbans.filter(k => selectedAreas.includes(k.area));
  const filteredMissions = missions.filter(m => selectedAreas.includes(m.area));

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Kairanban Section */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <i className="fas fa-clipboard-list"></i>
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">デジタル回覧板</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Neighborhood Circulars</p>
          </div>
        </div>

        <div className="space-y-4">
          {filteredKairanbans.length > 0 ? filteredKairanbans.map(k => (
            <div key={k.id} className={`bg-white border rounded-3xl p-6 transition-all ${k.isRead ? 'border-slate-100 opacity-80' : 'border-indigo-100 shadow-xl shadow-indigo-50 border-l-8 border-l-indigo-600'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{k.author}</span>
                    <span className="text-[10px] text-slate-400 font-bold">{new Date(k.createdAt).toLocaleDateString()}</span>
                    {k.sentToLine && (
                      <span className="text-[9px] font-black text-[#06C755] bg-[#06C755]/10 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <i className="fab fa-line"></i> LINE通知済み
                      </span>
                    )}
                  </div>
                  <h4 className="text-lg font-black text-slate-800 leading-tight">{k.title}</h4>
                </div>
                {!k.isRead && (
                  <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black animate-pulse whitespace-nowrap">
                    未読: +{k.points}pts
                  </div>
                )}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-6 font-medium whitespace-pre-wrap">{k.content}</p>
              <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                <div className="text-[10px] text-slate-400 font-bold">
                  <i className="fas fa-eye mr-1"></i> {k.readCount}人が確認済み
                </div>
                {!k.isRead ? (
                  <button 
                    onClick={() => onReadKairanban(k.id, k.points)}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-black text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
                  >
                    内容を確認しました
                  </button>
                ) : (
                  <span className="text-emerald-500 font-black text-xs flex items-center gap-1">
                    <i className="fas fa-check-circle"></i> 確認済み
                  </span>
                )}
              </div>
            </div>
          )) : (
            <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
              <p className="text-slate-400 font-bold italic">現在、回覧板はありません</p>
            </div>
          )}
        </div>
      </section>

      {/* Volunteer Missions Section */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-rose-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
            <i className="fas fa-handshake-angle"></i>
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">地域お手伝いミッション</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Local Missions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredMissions.length > 0 ? filteredMissions.map(m => (
            <div key={m.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all group">
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-lg font-black text-slate-800 leading-tight group-hover:text-rose-600 transition-colors">{m.title}</h4>
                <div className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-[10px] font-black whitespace-nowrap">
                  +{m.points}pts
                </div>
              </div>
              <p className="text-sm text-slate-500 mb-6 font-medium line-clamp-3">{m.description}</p>
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span>参加状況</span>
                  <span className="text-slate-700">{m.currentParticipants} / {m.maxParticipants}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full transition-all duration-1000" style={{ width: `${(m.currentParticipants / m.maxParticipants) * 100}%` }}></div>
                </div>
              </div>
              <button 
                onClick={() => onJoinMission(m.id, m.points)}
                disabled={m.currentParticipants >= m.maxParticipants}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm hover:bg-rose-600 transition-all shadow-xl active:scale-95 disabled:bg-slate-200"
              >
                {m.currentParticipants >= m.maxParticipants ? '募集終了' : 'ミッションに参加する'}
              </button>
            </div>
          )) : (
            <div className="md:col-span-2 text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
              <p className="text-slate-400 font-bold italic">募集中のミッションはありません</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ChokaiPanel;
