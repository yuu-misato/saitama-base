import React, { useState } from 'react';
import { Community, User } from '../types';

interface CommunityPanelProps {
    user: User;
    myCommunities: Community[];
    onCreateCommunity: (name: string, description: string) => void;
    onJoinCommunity: (inviteCode: string) => void;
    onSelectCommunity: (community: Community) => void;
}

const CommunityPanel: React.FC<CommunityPanelProps> = ({ user, myCommunities, onCreateCommunity, onJoinCommunity, onSelectCommunity }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [inviteInput, setInviteInput] = useState('');

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* ヒーローセクション */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2.5rem] p-8 text-white shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="relative z-10">
                    <h2 className="text-3xl font-black mb-2 flex items-center gap-3">
                        <span className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-xl">🤝</span>
                        コミュニティ
                    </h2>
                    <p className="text-indigo-100 font-bold opacity-90">
                        地域ごとの小さなコミュニティを作って、<br />LINEでスムーズに情報を届けましょう。
                    </p>
                </div>
            </div>

            {/* アクションボタン */}
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => setIsCreating(true)}
                    className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center gap-3 hover:bg-slate-50 transition-all group"
                >
                    <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                        <i className="fas fa-plus"></i>
                    </div>
                    <span className="font-black text-slate-700">新しく作る</span>
                </button>
                <button
                    onClick={() => {
                        const code = prompt("招待コードを入力してください");
                        if (code) onJoinCommunity(code);
                    }}
                    className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center gap-3 hover:bg-slate-50 transition-all group"
                >
                    <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                        <i className="fas fa-sign-in-alt"></i>
                    </div>
                    <span className="font-black text-slate-700">参加する</span>
                </button>
            </div>

            {/* 作成フォーム - Modal風 */}
            {isCreating && (
                <div className="bg-white border-2 border-indigo-100 rounded-[2rem] p-6 shadow-xl animate-in zoom-in-95">
                    <h3 className="font-black text-lg mb-4 text-slate-800">コミュニティの立ち上げ</h3>
                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="コミュニティ名 (例: 三郷1丁目町会)"
                            className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none border border-slate-200 focus:border-indigo-500 transition-colors"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                        />
                        <textarea
                            placeholder="簡単な説明..."
                            className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none border border-slate-200 focus:border-indigo-500 transition-colors h-24"
                            value={newDesc}
                            onChange={e => setNewDesc(e.target.value)}
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setIsCreating(false)} className="flex-1 py-4 font-bold text-slate-400 bg-slate-50 rounded-2xl">キャンセル</button>
                            <button
                                onClick={() => {
                                    if (newName) {
                                        onCreateCommunity(newName, newDesc);
                                        setIsCreating(false);
                                        setNewName('');
                                        setNewDesc('');
                                    }
                                }}
                                className="flex-1 py-4 font-black text-white bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors"
                            >
                                作成する
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* リスト */}
            <div className="space-y-4">
                <h3 className="font-black text-slate-400 text-sm px-4">参加中のコミュニティ</h3>
                {myCommunities.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 font-bold bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                        まだ参加していません
                    </div>
                ) : (
                    myCommunities.map(c => (
                        <div key={c.id} onClick={() => onSelectCommunity(c)} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer hover:shadow-md transition-all active:scale-[0.98]">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-200">
                                    {c.name[0]}
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-800 text-lg">{c.name}</h4>
                                    <p className="text-xs font-bold text-slate-400">{c.membersCount}人のメンバー</p>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                                <i className="fas fa-chevron-right"></i>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default CommunityPanel;
