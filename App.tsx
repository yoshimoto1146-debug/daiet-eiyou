import React, { useState } from 'react';
import { Camera, Plus, CheckCircle2, Flame, User, Utensils, MessageSquare, ArrowRight, ShieldCheck } from 'lucide-react';

// ユーザープロファイルの型定義
interface UserProfile {
  id: string;
  name: string;
  age: number;
  gender: string;
  metabolismType: 'lipid' | 'carb' | 'muscle' | 'stress' | 'low';
  metabolismTypeName: string;
  targetCalories: number;
  targetP: number;
  targetF: number;
  targetC: number;
  currentCalories: number;
  currentP: number;
  currentF: number;
  currentC: number;
  todayMeals: { id: string; time: string; name: string; calories: number; p: number; f: number; c: number }[];
  adviceMessage: string;
}

// 初期ユーザーデータ（例：会員様2名分）
const USERS_DATA: Record<string, UserProfile> = {
  userA: {
    id: 'userA',
    name: '佐藤 佳代',
    age: 38,
    gender: '女性',
    metabolismType: 'lipid',
    metabolismTypeName: '脂質代謝低下タイプ',
    targetCalories: 1650,
    targetP: 95,
    targetF: 35,
    targetC: 235,
    currentCalories: 1320,
    currentP: 82,
    currentF: 30,
    currentC: 180,
    todayMeals: [
      { id: 'm1', time: '08:00', name: '朝食: 鮭塩焼き・玄米ご飯・味噌汁', calories: 420, p: 28, f: 10, c: 55 },
      { id: 'm2', time: '12:30', name: '昼食: 蒸し鶏と彩り野菜のサラダボウル', calories: 480, p: 35, f: 12, c: 58 },
      { id: 'm3', time: '15:30', name: '間食: ギリシャヨーグルト・素焼きアーモンド', calories: 150, p: 12, f: 5, c: 12 },
      { id: 'm4', time: '19:00', name: '夕食: 豆腐ハンバーグ・ブロッコリー', calories: 270, p: 7, f: 3, c: 55 },
    ],
    adviceMessage: '佐藤様は脂質代謝低下タイプです。夕食の脂質を抑えられており非常に素晴らしい進捗です！夜間はPFCのうちタンパク質を意識して補給してください。',
  },
  userB: {
    id: 'userB',
    name: '田中 健太郎',
    age: 45,
    gender: '男性',
    metabolismType: 'carb',
    metabolismTypeName: '糖質吸収過多タイプ',
    targetCalories: 2100,
    targetP: 130,
    targetF: 55,
    targetC: 270,
    currentCalories: 1850,
    currentP: 110,
    currentF: 58,
    currentC: 220,
    todayMeals: [
      { id: 'm5', time: '07:30', name: '朝食: プロテイン・オートミールボウル', calories: 450, p: 35, f: 8, c: 60 },
      { id: 'm6', time: '12:00', name: '昼食: 牛肉赤身ステーキ定食（ご飯少なめ）', calories: 750, p: 48, f: 28, c: 75 },
      { id: 'm7', time: '19:30', name: '夕食: 刺身盛り合わせ・枝豆・ハイボール1杯', calories: 650, p: 27, f: 22, c: 85 },
    ],
    adviceMessage: '田中様は糖質タイプです。本日の炭水化物は目標範囲内に抑えられています。食後の軽いウォーキングで血糖値の上昇を抑制しましょう！',
  },
};

export default function App() {
  const [selectedUserId, setSelectedUserId] = useState<string>('userA');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentUser = USERS_DATA[selectedUserId];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newUserId = e.target.value;
    setSelectedUserId(newUserId);
    showToast(`「${USERS_DATA[newUserId].name} 様」に切り替えました`);
  };

  // カロリーおよびPFC計算
  const calPercent = Math.min(Math.round((currentUser.currentCalories / currentUser.targetCalories) * 100), 100);
  const pPercent = Math.min(Math.round((currentUser.currentP / currentUser.targetP) * 100), 100);
  const fPercent = Math.min(Math.round((currentUser.currentF / currentUser.targetF) * 100), 100);
  const cPercent = Math.min(Math.round((currentUser.currentC / currentUser.targetC) * 100), 100);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col antialiased font-sans">
      {/* トースト通知 */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold border border-slate-700 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-black text-xl shadow-md">
              S
            </div>
            <div>
              <h1 className="text-base font-black text-slate-800 leading-tight">サクラ整骨院 PFC管理</h1>
              <p className="text-[10px] text-slate-500 font-medium">会員様別 パーソナル食事指導システム</p>
            </div>
          </div>

          {/* ユーザー切り替えドロップダウン */}
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
            <User className="w-4 h-4 text-emerald-600 ml-1" />
            <select
              value={selectedUserId}
              onChange={handleUserChange}
              className="bg-transparent text-slate-800 text-xs font-bold py-1 pr-2 outline-none cursor-pointer"
            >
              <option value="userA">佐藤 佳代 様 (脂質タイプ)</option>
              <option value="userB">田中 健太郎 様 (糖質タイプ)</option>
            </select>
          </div>
        </div>
      </header>

      {/* メインエリア */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
        {/* 選択中ユーザーのプロフィールバー */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-1 rounded-full">
                {currentUser.metabolismTypeName}
              </span>
              <span className="text-xs text-slate-400">
                {currentUser.age}歳 / {currentUser.gender}
              </span>
            </div>
            <h2 className="text-2xl font-black text-white mt-2">{currentUser.name} 様の分析ダッシュボード</h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => showToast('AIカメラ撮影画面を起動します')}
              className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>AI写真解析</span>
            </button>
            <button
              type="button"
              onClick={() => showToast('手動入力モーダルを表示します')}
              className="px-4 py-2.5 rounded-2xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>手動記録</span>
            </button>
          </div>
        </div>

        {/* PFC＆カロリー指標 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-base">本日の摂取状況＆PFC目標達成度</h3>
            <span className="text-xs font-bold text-slate-400">目標カロリー: {currentUser.targetCalories} kcal</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* カロリーカード */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col justify-between shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">総摂取カロリー</span>
                <Flame className="w-5 h-5 text-amber-400" />
              </div>
              <div className="my-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black">{currentUser.currentCalories}</span>
                  <span className="text-xs text-slate-400">/ {currentUser.targetCalories} kcal</span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${calPercent}%` }}
                  ></div>
                </div>
              </div>
              <div className="flex justify-between text-xs text-slate-400 font-bold">
                <span>達成度</span>
                <span className="text-amber-400">{calPercent}%</span>
              </div>
            </div>

            {/* PFC 3項目 */}
            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* P */}
              <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-black text-indigo-900">P（タンパク質）</span>
                    <span className="text-xs font-black text-indigo-600">{currentUser.currentP}g</span>
                  </div>
                  <p className="text-[10px] text-slate-500">目標: {currentUser.targetP}g</p>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-indigo-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${pPercent}%` }}></div>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 block text-right mt-1">{pPercent}%</span>
                </div>
              </div>

              {/* F */}
              <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-black text-amber-900">F（脂質）</span>
                    <span className="text-xs font-black text-amber-600">{currentUser.currentF}g</span>
                  </div>
                  <p className="text-[10px] text-slate-500">目標: {currentUser.targetF}g</p>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-amber-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${fPercent}%` }}></div>
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 block text-right mt-1">{fPercent}%</span>
                </div>
              </div>

              {/* C */}
              <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-black text-emerald-900">C（炭水化物）</span>
                    <span className="text-xs font-black text-emerald-600">{currentUser.currentC}g</span>
                  </div>
                  <p className="text-[10px] text-slate-500">目標: {currentUser.targetC}g</p>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-emerald-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${cPercent}%` }}></div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 block text-right mt-1">{cPercent}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 食事履歴リスト */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Utensils className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-base">{currentUser.name} 様の本日ログ一覧</h3>
          </div>

          <div className="space-y-2">
            {currentUser.todayMeals.map((meal) => (
              <div
                key={meal.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 hover:bg-slate-100 transition-all gap-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shrink-0">
                    {meal.time}
                  </span>
                  <span className="text-xs font-bold text-slate-800">{meal.name}</span>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium text-slate-600 self-end sm:self-auto">
                  <span className="font-black text-slate-800">{meal.calories} kcal</span>
                  <div className="flex gap-2 text-[11px]">
                    <span className="text-indigo-600">P:{meal.p}g</span>
                    <span className="text-amber-600">F:{meal.f}g</span>
                    <span className="text-emerald-600">C:{meal.c}g</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LINEアドバイス生成機能 */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              <h3 className="font-bold text-base">LINE指導アシスタント</h3>
            </div>
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">自動最適化</span>
          </div>
          <p className="text-xs text-emerald-100 leading-relaxed bg-black/10 p-3.5 rounded-2xl border border-white/10">
            {currentUser.adviceMessage}
          </p>
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => showToast('アドバイス文章をクリップボードにコピーしました')}
              className="px-4 py-2.5 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>LINEアドバイス文をコピー</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        サクラ整骨院 PFC Balance Manager
      </footer>
    </div>
  );
}
