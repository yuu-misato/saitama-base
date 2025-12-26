import React from 'react';

interface LandingPageProps {
    onLogin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
    return (
        <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
            {/* Navigation */}
            <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-black text-2xl tracking-tighter text-slate-900">
                        <span className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white text-base">S</span>
                        Saitama BASE
                    </div>
                    <button
                        onClick={onLogin}
                        className="bg-slate-900 text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-slate-800 transition-all hover:scale-105 active:scale-95"
                    >
                        LINEでログイン
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-emerald-50 to-transparent -z-10 rounded-bl-[10rem] opacity-60" />
                <div className="absolute bottom-0 left-0 w-1/3 h-2/3 bg-gradient-to-tr from-indigo-50 to-transparent -z-10 rounded-tr-[10rem] opacity-60" />

                <div className="max-w-5xl mx-auto text-center">
                    <div className="inline-block mb-6 animate-in slide-in-from-bottom fade-in duration-700">
                        <span className="px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs tracking-wider border border-emerald-200">
                            NEW STARNDARD OF LOCAL COMMUNITY
                        </span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 leading-[1.1] animate-in slide-in-from-bottom fade-in duration-700 delay-100">
                        地域の回覧板を、<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">圧倒的に楽に。</span>
                    </h1>

                    <p className="text-xl text-slate-500 font-medium mb-10 max-w-2xl mx-auto leading-relaxed animate-in slide-in-from-bottom fade-in duration-700 delay-200">
                        面倒なハンコのリレーも、雨の日の配達も必要ありません。<br className="hidden md:block" />
                        スマホひとつで、地域のお知らせはもっと自由に、もっと楽しく。
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in slide-in-from-bottom fade-in duration-700 delay-300">
                        <button
                            onClick={onLogin}
                            className="w-full sm:w-auto px-8 py-4 bg-[#06C755] text-white rounded-2xl font-black text-lg shadow-xl shadow-emerald-200 hover:bg-[#05b34c] transition-all hover:-translate-y-1 flex items-center justify-center gap-3"
                        >
                            <i className="fab fa-line text-2xl"></i>
                            LINEで今すぐ始める
                        </button>
                        <p className="text-xs text-slate-400 font-bold mt-2 sm:mt-0">
                            ※登録は無料です
                        </p>
                    </div>
                </div>
            </section>

            {/* Feature 1: Kairanban */}
            <section className="py-24 px-6 bg-slate-50 relative">
                <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
                    <div className="order-2 md:order-1 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl blur-3xl opacity-20 transform rotate-6"></div>
                        <div className="bg-white rounded-3xl p-8 shadow-2xl relative border border-slate-100">
                            {/* Mock UI */}
                            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                                    <i className="fas fa-bullhorn"></i>
                                </div>
                                <div>
                                    <div className="h-2 w-24 bg-slate-200 rounded mb-1"></div>
                                    <div className="h-2 w-16 bg-slate-100 rounded"></div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="h-4 w-3/4 bg-slate-800 rounded opacity-10"></div>
                                <div className="h-4 w-full bg-slate-800 rounded opacity-5"></div>
                                <div className="h-4 w-5/6 bg-slate-800 rounded opacity-5"></div>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <div className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg">確認しました</div>
                            </div>
                        </div>
                    </div>
                    <div className="order-1 md:order-2">
                        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-xl mb-6">
                            <i className="fas fa-magic"></i>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black mb-6">
                            回覧板は、<br />
                            "待つ"ものから"届く"ものへ。
                        </h2>
                        <p className="text-slate-500 text-lg leading-relaxed mb-8">
                            Saitama BASEなら、地域のお知らせがLINEやアプリに直接届きます。
                            旅行中でも、仕事中でも、大切な情報を見逃すことはありません。
                            「次は誰に回すんだっけ？」という悩みからも解放されます。
                        </p>
                        <ul className="space-y-4">
                            <li className="flex items-center gap-3 font-bold text-slate-700">
                                <i className="fas fa-check-circle text-emerald-500"></i>
                                いつでもどこでもスマホで確認
                            </li>
                            <li className="flex items-center gap-3 font-bold text-slate-700">
                                <i className="fas fa-check-circle text-emerald-500"></i>
                                既読ボタンを押すだけで完了
                            </li>
                            <li className="flex items-center gap-3 font-bold text-slate-700">
                                <i className="fas fa-check-circle text-emerald-500"></i>
                                過去のお知らせも検索可能
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Feature 2: Points & Rewards */}
            <section className="py-24 px-6">
                <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
                    <div>
                        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center text-xl mb-6">
                            <i className="fas fa-coins"></i>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black mb-6">
                            地域活動に参加して、<br />
                            街をもっと好きになる。
                        </h2>
                        <p className="text-slate-500 text-lg leading-relaxed mb-8">
                            回覧板を見る、ゴミ拾いに参加する、イベントを手伝う。
                            あなたのちょっとした地域貢献が「ポイント」として貯まります。
                            貯まったポイントは、地元の素敵なお店でクーポンとして使えます。
                        </p>
                        <div className="flex gap-4">
                            <div className="flex-1 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <div className="text-4xl font-black text-amber-500 mb-2">PTS</div>
                                <div className="font-bold text-slate-700 text-sm">活動に応じて<br />ポイント獲得</div>
                            </div>
                            <div className="flex-1 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <div className="text-4xl font-black text-rose-500 mb-2">GIFT</div>
                                <div className="font-bold text-slate-700 text-sm">地域のお店で<br />お得に利用</div>
                            </div>
                        </div>
                    </div>
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-l from-amber-200 to-rose-200 rounded-full blur-3xl opacity-30 transform translate-x-10"></div>
                        <div className="grid grid-cols-2 gap-4 relative">
                            <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100 transform translate-y-8">
                                <div className="h-32 bg-slate-100 rounded-xl mb-3"></div>
                                <div className="font-bold text-slate-800">ランチ100円OFF</div>
                                <div className="text-xs text-slate-400">カフェ・ド・サイタマ</div>
                            </div>
                            <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100">
                                <div className="h-32 bg-slate-100 rounded-xl mb-3"></div>
                                <div className="font-bold text-slate-800">特製デザート</div>
                                <div className="text-xs text-slate-400">リストランテ大宮</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-32 px-6">
                <div className="max-w-4xl mx-auto bg-slate-900 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 rounded-full blur-[100px] opacity-30"></div>

                    <h2 className="text-3xl md:text-5xl font-black text-white mb-8 relative z-10">
                        あなたの街での暮らしを、<br />
                        もっとスマートに。
                    </h2>
                    <p className="text-slate-400 mb-10 text-lg relative z-10">
                        Saitama BASEは、地域と人をつなぐ新しいプラットフォームです。<br />
                        まずはLINEログインで、体験してみてください。
                    </p>

                    <button
                        onClick={onLogin}
                        className="px-10 py-5 bg-[#06C755] text-white rounded-2xl font-black text-xl shadow-lg shadow-emerald-900/50 hover:bg-[#05b34c] hover:scale-105 transition-all relative z-10 flex items-center justify-center gap-3 mx-auto"
                    >
                        <i className="fab fa-line text-3xl"></i>
                        無料で始める
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-100 py-12 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2 font-black text-xl text-slate-900">
                        <span className="w-6 h-6 bg-slate-900 rounded flex items-center justify-center text-white text-xs">S</span>
                        Saitama BASE
                    </div>
                    <p className="text-slate-400 text-sm font-bold">
                        &copy; 2025 Saitama BASE All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
