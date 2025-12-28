```
import React, { useState, useEffect } from 'react';
import { PREFECTURES, MUNICIPALITIES_BY_PREFECTURE } from '../constants';

interface RegistrationModalProps {
    initialNickname: string;
    onRegister: (nickname: string, areas: string[]) => void;
}

const RegistrationModal: React.FC<RegistrationModalProps> = ({ initialNickname, onRegister }) => {
    const [nickname, setNickname] = useState(initialNickname);
    const [prefecture, setPrefecture] = useState('埼玉県');
    const [municipality, setMunicipality] = useState('');
    
    // Get list based on selected prefecture
    const municipalities = MUNICIPALITIES_BY_PREFECTURE[prefecture] || [];

    // Reset default municipality when prefecture changes
    useEffect(() => {
        if (municipalities.length > 0) {
            setMunicipality(municipalities[0]);
        } else {
            setMunicipality(''); // Clear municipality if no options for the selected prefecture
        }
    }, [prefecture, municipalities]); // Added municipalities to dependency array for completeness

    const handleRegister = () => {
        if (!nickname) return;
        
        // Final Area String: e.g. "東京都世田谷区" or "埼玉県さいたま市大宮区"
        // Note: Our data for Saitama includes "さいたま市..." full name, but some others might just be city name.
        // If the municipality string already contains the prefecture name (unlikely in this dataset) or is unique enough.
        // Generally: Prefecture + Municipality is safest, BUT our Saitama data (legacy) is used as ID.
        // Let's keep it simple: Just pass the Municipality string if it's unique enough (like our legacy logic), 
        // OR combine. 
        // Current logic in App searches by exact string match for Saitama.
        // For consistency with existing data, we should probably JUST use the municipality string if it is Saitama,
        // but for others, maybe Pref + City?
        // Actually, let's look at the data. Saitama data is "札幌市中央区" (includes City), "世田谷区" (Ward only).
        // Let's decide: ALWAYS concatenate Prefecture + Municipality, UNLESS it's Saitama (legacy compatibility? or just clean override?)
        // Actually, our `constants.tsx` for Saitama does NOT include "埼玉県".
        // So for Saitama, use `municipality` as is.
        // For others, use `prefecture + municipality` to be safe? 
        // Or just `municipality` if it includes "市"?
        // Let's do: if (prefecture === '埼玉県') return municipality; else return municipality;
        // Wait, "世田谷区" without "東京都" is weird.
        // Let's construct full address for non-Saitama to be safe, but keep Saitama as is.
        
        let finalArea = municipality;
        // If it's NOT Saitama, and municipality doesn't start with Prefecture (usually doesn't)
        if (prefecture !== '埼玉県') {
             // For consistency in UI, maybe we want "東京都千代田区".
             finalArea = `${ prefecture }${ municipality } `;
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
                        <div className="relative">
                            <select
                                value={municipality}
                                onChange={e => setMunicipality(e.target.value)}
                                className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold border-2 border-slate-100 focus:border-emerald-500 outline-none transition-colors appearance-none cursor-pointer"
                            >
                                {municipalities.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                <i className="fas fa-chevron-down"></i>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleRegister}
                        disabled={!nickname || !municipality}
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
