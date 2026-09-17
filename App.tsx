import React, { useState } from 'react';
import { Camera, Plus, BarChart3, MessageSquare, CheckCircle2, User, Flame, Sparkles } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'today' | 'analysis'>('today');
  const [activeUser, setActiveUser] = useState('Aさん');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col antialiased">
      {/* トースト通知 */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
              S
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800 leading-tight">サクラ整骨院 PFC管理</h1>
              <p className="text-[10px] text-slate-500">会員様向け食事指導＆LINEアシスト</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={activeUser}
              onChange={(e) => {
                setActiveUser(e.target.value);
                showToast(`「${e.target.value}」のデータに切り替えました`);
              }}
              className="bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Aさん">Aさん (脂質代謝タイプ)</option>
              <option value="Bさん">Bさん (糖質タイプ)</option>
            </select>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
        {/* 本日のサマリー */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
                {activeUser} 様の本日データ
              </span>
              <h2 className="text-xl font-black text-slate-800 mt-2">PFCバランス＆カロリー進捗</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => showToast('AIカメラ解析モーダルを起動（デモ）')}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>AI写真解析</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">総摂取カロリー</span>
                <Flame className="w-5 h-5 text-amber-400" />
              </div>
              <div className="my-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black">1,450</span>
                  <span className="text-xs text-slate-400">/ 1,800 kcal</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: '80%' }}></div>
                </div>
              </div>
              <span className="text-xs text-amber-400 font-bold">達成度 80%</span>
            </div>

            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-700">P（タンパク質）</span>
                  <span className="text-xs font-bold text-indigo-600">85g / 110g</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
                  <div className="bg-indigo-500 h-full" style={{ width: '77%' }}></div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-700">F（脂質）</span>
                  <span className="text-xs font-bold text-amber-600">42g / 50g</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
                  <div className="bg-amber-500 h-full" style={{ width: '84%' }}></div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-700">C（炭水化物）</span>
                  <span className="text-xs font-bold text-emerald-600">180g / 220g</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: '81%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LINE返信アシスト */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">LINE指導メッセージ自動生成</h3>
              <p className="text-xs text-emerald-100 mt-1">
                {activeUser} 様の代謝タイプに合わせた最適なアドバイス文を作成できます。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => showToast('LINEアドバイス文をコピーしました')}
            className="px-4 py-2.5 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-bold transition-all shrink-0"
          >
            返信文を生成してコピー
          </button>
        </div>
      </main>

      {/* フッター */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        サクラ整骨院 PFC Balance Manager
      </footer>
    </div>
  );
}
