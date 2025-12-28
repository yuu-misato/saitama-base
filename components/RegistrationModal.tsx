import React, { useState, useEffect } from 'react';
import { PREFECTURES, SAITAMA_MUNICIPALITIES } from '../constants';

interface RegistrationModalProps {
    initialNickname: string;
    onRegister: (nickname: string, areas: string[]) => void;
}

const RegistrationModal: React.FC<RegistrationModalProps> = ({ initialNickname, onRegister }) => {
    const [nickname, setNickname] = useState(initialNickname);
    const [prefecture, setPrefecture] = useState('埼玉県');
    const [municipality, setMunicipality] = useState(SAITAMA_MUNICIPALITIES[0]);
    const [customCity, setCustomCity] = useState('');

    const handleRegister = () => {
        if (!nickname) return;

        let finalArea = '';
        if (prefecture === '埼玉県') {
            finalArea = municipality;
        } else {
            // Trim to avoid empty spaces
            const city = customCity.trim();
            if (!city) {
                // Should we block? Let's assume they might just want "東京都" if they don't type a city, but better to enforce it.
                // For now, allow just prefecture if empty? No, let's just append.
                finalArea = prefecture;
            } else {
                finalArea = `${prefecture}${city}`;
            }
        }

        onRegister(nickname, [finalArea]);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center text-3xl mb-4">
                        <i className="fas fa-map-marked-alt"></i>
                    </div>
                    <h2 className="text-2xl font-black text-slate-800">プロフィール設定</h2>
                    <p className="text-sm font-bold text-slate-400">お住まいの地域を教えてください</p>
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
                        <label className="block text-sm font-black text-slate-500 mb-2 ml-2">都道府県</label>
                        <div className="relative">
                            <select
                                value={prefecture}
                                onChange={e => setPrefecture(e.target.value)}
                                className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-2 border-slate-100 focus:border-emerald-500 outline-none transition-colors appearance-none cursor-pointer"
                            >
                                {PREFECTURES.map(pref => (
                                    <option key={pref} value={pref}>{pref}</option>
                                ))}
                            </select>
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                <i className="fas fa-chevron-down"></i>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-black text-slate-500 mb-2 ml-2">市区町村</label>
                        {prefecture === '埼玉県' ? (
                            <div className="relative">
                                <select
                                    value={municipality}
                                    onChange={e => setMunicipality(e.target.value)}
                                    className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-2 border-slate-100 focus:border-emerald-500 outline-none transition-colors appearance-none cursor-pointer"
                                >
                                    {SAITAMA_MUNICIPALITIES.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                    <i className="fas fa-chevron-down"></i>
                                </div>
                            </div>
                        ) : (
                            <input
                                type="text"
                                value={customCity}
                                onChange={e => setCustomCity(e.target.value)}
                                className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-2 border-slate-100 focus:border-emerald-500 outline-none transition-colors"
                                placeholder="例：世田谷区、横浜市中区"
                            />
                        )}
                    </div>

                    <button
                        onClick={handleRegister}
                        disabled={!nickname || (prefecture !== '埼玉県' && !customCity.trim())}
                        className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                        登録してはじめる
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RegistrationModal;
