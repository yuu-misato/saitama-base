import React, { useState } from 'react';

interface RegistrationModalProps {
    initialNickname: string;
    onRegister: (nickname: string, areas: string[]) => void;
}

const RegistrationModal: React.FC<RegistrationModalProps> = ({ initialNickname, onRegister }) => {
    const [nickname, setNickname] = useState(initialNickname);
    const [selectedArea, setSelectedArea] = useState('さいたま市大宮区');

    const areas = ['さいたま市大宮区', 'さいたま市浦和区', 'さいたま市中央区', 'さいたま市北区', '三郷市', '川口市', '戸田市'];

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center text-3xl mb-4">
                        <i className="fas fa-user-check"></i>
                    </div>
                    <h2 className="text-2xl font-black text-slate-800">プロフィール登録</h2>
                    <p className="text-sm font-bold text-slate-400">あなたの地域の情報を設定しましょう</p>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-black text-slate-500 mb-2 ml-2">ニックネーム</label>
                        <input
                            type="text"
                            value={nickname}
                            onChange={e => setNickname(e.target.value)}
                            className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-2 border-slate-100 focus:border-emerald-500 outline-none transition-colors"
                            placeholder="表示名を入力"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-black text-slate-500 mb-2 ml-2">主なお住まいの地域</label>
                        <select
                            value={selectedArea}
                            onChange={e => setSelectedArea(e.target.value)}
                            className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-2 border-slate-100 focus:border-emerald-500 outline-none transition-colors appearance-none"
                        >
                            {areas.map(area => (
                                <option key={area} value={area}>{area}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={() => {
                            if (nickname) onRegister(nickname, [selectedArea]);
                        }}
                        disabled={!nickname}
                        className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        登録してはじめる
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RegistrationModal;
