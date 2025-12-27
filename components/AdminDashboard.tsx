
import React, { useState, useEffect } from 'react';
import { User, VolunteerMission, Community } from '../types';
import { getAllUsers, updateUserRole, giveUserPoints, createMission, getAllCommunities, deleteCommunity, getMissions } from '../services/supabaseService';
import Toast from './Toast';

interface AdminDashboardProps {
    currentUser: User;
    onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onAddToast }) => {
    const [activeTab, setActiveTab] = useState<'users' | 'missions' | 'communities'>('users');
    const [users, setUsers] = useState<any[]>([]);
    const [missions, setMissions] = useState<VolunteerMission[]>([]);
    const [communities, setCommunities] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Editing States
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [pointsInput, setPointsInput] = useState<number>(100);
    const [isCreatingMission, setIsCreatingMission] = useState(false);
    const [newMission, setNewMission] = useState({ title: '', description: '', points: 50, area: 'さいたま市大宮区', date: '', maxParticipants: 5 });

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            if (activeTab === 'users') {
                const { data } = await getAllUsers();
                if (data) setUsers(data);
            } else if (activeTab === 'missions') {
                const { data } = await getMissions(); // Using existing getMissions, assuming it fetches all
                if (data) setMissions(data.map((m: any) => ({
                    id: m.id,
                    title: m.title,
                    description: m.description,
                    points: m.points,
                    area: m.area,
                    date: m.date,
                    currentParticipants: m.current_participants || 0,
                    maxParticipants: m.max_participants || 10
                })));
            } else if (activeTab === 'communities') {
                const { data } = await getAllCommunities();
                if (data) setCommunities(data);
            }
        } catch (e) {
            onAddToast('データの取得に失敗しました', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRoleUpdate = async (userId: string, newRole: string) => {
        const { error } = await updateUserRole(userId, newRole);
        if (!error) {
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
            onAddToast('ユーザー権限を更新しました', 'success');
        } else {
            onAddToast('更新に失敗しました', 'error');
        }
    };

    const handleGivePoints = async (userId: string) => {
        const { error } = await giveUserPoints(userId, pointsInput);
        if (!error) {
            setUsers(users.map(u => u.id === userId ? { ...u, score: (u.score || 0) + pointsInput } : u));
            onAddToast(`${pointsInput}ポイントを付与しました`, 'success');
            setEditingUser(null);
        } else {
            onAddToast('ポイント付与に失敗しました', 'error');
        }
    };

    const handleCreateMission = async (e: React.FormEvent) => {
        e.preventDefault();
        const { data, error } = await createMission(newMission);
        if (!error && data) {
            onAddToast('ミッションを作成しました', 'success');
            setIsCreatingMission(false);
            setNewMission({ title: '', description: '', points: 50, area: 'さいたま市大宮区', date: '', maxParticipants: 5 });
            loadData(); // Refresh list
        } else {
            onAddToast('作成に失敗しました', 'error');
        }
    };

    const handleDeleteCommunity = async (id: string) => {
        if (!window.confirm('本当に削除しますか？')) return;
        const { error } = await deleteCommunity(id);
        if (!error) {
            setCommunities(communities.filter(c => c.id !== id));
            onAddToast('コミュニティを削除しました', 'success');
        } else {
            onAddToast('削除に失敗しました', 'error');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl -mr-16 -mt-16 animate-pulse"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
                            <i className="fas fa-shield-alt text-2xl text-emerald-400"></i>
                        </div>
                        <h2 className="text-3xl font-black tracking-tight">Admin Console</h2>
                    </div>
                    <p className="text-slate-400 font-bold ml-16">
                        システム全体の管理・監視を行います。
                    </p>
                </div>
            </div>

            {/* Navigation tabs */}
            <div className="flex gap-2 p-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
                {(['users', 'missions', 'communities'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-3 px-6 rounded-xl font-black text-sm transition-all whitespace-nowrap ${activeTab === tab
                            ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
                    >
                        {tab === 'users' && <i className="fas fa-users mr-2"></i>}
                        {tab === 'missions' && <i className="fas fa-flag mr-2"></i>}
                        {tab === 'communities' && <i className="fas fa-building mr-2"></i>}
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            {isLoading ? (
                <div className="flex justify-center py-20"><i className="fas fa-circle-notch fa-spin text-4xl text-slate-300"></i></div>
            ) : (
                <div className="min-h-[400px]">
                    {/* USERS TAB */}
                    {activeTab === 'users' && (
                        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">User</th>
                                        <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">Role</th>
                                        <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">Score</th>
                                        <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {users.map(u => (
                                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <img src={u.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest'} className="w-10 h-10 rounded-full bg-slate-100" />
                                                    <div>
                                                        <p className="font-bold text-slate-800">{u.nickname}</p>
                                                        <p className="text-xs text-slate-400 font-mono">{u.id.substring(0, 8)}...</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <select
                                                    value={u.role || 'resident'}
                                                    onChange={(e) => handleRoleUpdate(u.id, e.target.value)}
                                                    className="bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all cursor-pointer"
                                                >
                                                    <option value="resident">Resident</option>
                                                    <option value="business">Business</option>
                                                    <option value="chokai_leader">Chokai Leader</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            </td>
                                            <td className="p-6 font-mono font-bold text-emerald-600">
                                                {u.score?.toLocaleString()} pts
                                            </td>
                                            <td className="p-6 text-right">
                                                <button
                                                    onClick={() => setEditingUser(u)}
                                                    className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-emerald-100 transition-colors"
                                                >
                                                    <i className="fas fa-gift mr-2"></i>Give Points
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* MISSIONS TAB */}
                    {activeTab === 'missions' && (
                        <div className="space-y-6">
                            <button
                                onClick={() => setIsCreatingMission(true)}
                                className="w-full py-4 bg-dashed border-2 border-dashed border-slate-300 rounded-2xl text-slate-400 font-bold hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
                            >
                                <i className="fas fa-plus"></i> 新しいミッションを作成
                            </button>

                            {isCreatingMission && (
                                <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-emerald-100 animate-in zoom-in-95">
                                    <h3 className="font-black text-lg mb-4">Create Mission</h3>
                                    <form onSubmit={handleCreateMission} className="space-y-4">
                                        <input className="w-full p-4 bg-slate-50 rounded-xl font-bold border-none outline-none focus:ring-2 ring-emerald-200" placeholder="Title" value={newMission.title} onChange={e => setNewMission({ ...newMission, title: e.target.value })} required />
                                        <textarea className="w-full p-4 bg-slate-50 rounded-xl font-bold border-none outline-none focus:ring-2 ring-emerald-200 h-24" placeholder="Description" value={newMission.description} onChange={e => setNewMission({ ...newMission, description: e.target.value })} required />
                                        <div className="grid grid-cols-2 gap-4">
                                            <input type="number" className="p-4 bg-slate-50 rounded-xl font-bold border-none outline-none" placeholder="Points" value={newMission.points} onChange={e => setNewMission({ ...newMission, points: parseInt(e.target.value) })} required />
                                            <input className="p-4 bg-slate-50 rounded-xl font-bold border-none outline-none" placeholder="Target Area" value={newMission.area} onChange={e => setNewMission({ ...newMission, area: e.target.value })} required />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <input className="p-4 bg-slate-50 rounded-xl font-bold border-none outline-none " placeholder="Date (e.g. 12/31 10:00)" value={newMission.date} onChange={e => setNewMission({ ...newMission, date: e.target.value })} required />
                                            <input type="number" className="p-4 bg-slate-50 rounded-xl font-bold border-none outline-none" placeholder="Max Participants" value={newMission.maxParticipants} onChange={e => setNewMission({ ...newMission, maxParticipants: parseInt(e.target.value) })} required />
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <button type="button" onClick={() => setIsCreatingMission(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-100">Cancel</button>
                                            <button type="submit" className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-black shadow-lg shadow-emerald-200 hover:bg-emerald-600">Create</button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            <div className="grid gap-4">
                                {missions.map(m => (
                                    <div key={m.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">Mission</span>
                                                <h4 className="font-bold text-slate-800">{m.title}</h4>
                                            </div>
                                            <p className="text-xs text-slate-500 font-bold">{m.points} pts • {m.area}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-2xl font-black text-slate-800">{m.currentParticipants}<span className="text-sm text-slate-400 font-bold">/{m.maxParticipants}</span></p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">Participants</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* COMMUNITIES TAB */}
                    {activeTab === 'communities' && (
                        <div className="grid gap-4">
                            {communities.map(c => (
                                <div key={c.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4">
                                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 text-2xl">
                                        {c.image_url ? <img src={c.image_url} className="w-full h-full object-cover rounded-2xl" /> : <i className="fas fa-users"></i>}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-800 text-lg">{c.name}</h4>
                                        <p className="text-sm text-slate-500">{c.description}</p>
                                        <div className="flex gap-2 mt-2">
                                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded font-bold">ID: {c.id.substring(0, 8)}</span>
                                            {c.is_secret && <span className="text-[10px] bg-slate-800 text-white px-2 py-1 rounded font-bold"><i className="fas fa-lock mr-1"></i>Secret</span>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteCommunity(c.id)}
                                        className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors"
                                    >
                                        <i className="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Point Giving Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95">
                        <div className="text-center mb-6">
                            <img src={editingUser.avatar_url} className="w-20 h-20 rounded-full mx-auto mb-4 bg-slate-100" />
                            <h3 className="font-black text-xl text-slate-800">{editingUser.nickname}</h3>
                            <p className="text-slate-400 font-bold text-sm">Give Points</p>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-emerald-50 rounded-2xl p-4 flex items-center justify-center">
                                <span className="text-3xl font-black text-emerald-600 mr-2">+{pointsInput}</span>
                                <span className="text-emerald-400 font-bold text-sm">pts</span>
                            </div>
                            <input
                                type="range"
                                min="10"
                                max="1000"
                                step="10"
                                value={pointsInput}
                                onChange={e => setPointsInput(parseInt(e.target.value))}
                                className="w-full accent-emerald-500"
                            />
                            <div className="flex justify-between text-xs font-bold text-slate-400 px-2">
                                <span>10</span>
                                <span>500</span>
                                <span>1000</span>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setEditingUser(null)} className="flex-1 py-4 font-bold text-slate-400 bg-slate-50 rounded-2xl hover:bg-slate-100">Cancel</button>
                            <button onClick={() => handleGivePoints(editingUser.id)} className="flex-1 py-4 font-black text-white bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-200 hover:bg-emerald-600">Send Gift</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
