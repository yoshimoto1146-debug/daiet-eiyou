import React, { useState, useRef } from 'react';
import { Camera, Plus, CheckCircle2, Flame, User, Utensils, MessageSquare, ArrowRight, Upload, FileText, X, Sparkles, Image as ImageIcon } from 'lucide-react';

// ユーザープロファイルの型定義
interface MealItem {
  id: string;
  time: string;
  name: string;
  calories: number;
  p: number;
  f: number;
  c: number;
}

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
  todayMeals: MealItem[];
  adviceMessage: string;
}

// 初期ユーザーデータ（例：会員様2名分）
const INITIAL_USERS: Record<string, UserProfile> = {
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
    todayMeals: [
      { id: 'm1', time: '08:00', name: '朝食: 鮭塩焼き・玄米ご飯・味噌汁', calories: 420, p: 28, f: 10, c: 55 },
      { id: 'm2', time: '12:30', name: '昼食: 蒸し鶏と彩り野菜のサラダボウル', calories: 480, p: 35, f: 12, c: 58 },
      { id: 'm3', time: '15:30', name: '間食: ギリシャヨーグルト・素焼きアーモンド', calories: 150, p: 12, f: 5, c: 12 },
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
    todayMeals: [
      { id: 'm5', time: '07:30', name: '朝食: プロテイン・オートミールボウル', calories: 450, p: 35, f: 8, c: 60 },
      { id: 'm6', time: '12:00', name: '昼食: 牛肉赤身ステーキ定食（ご飯少なめ）', calories: 750, p: 48, f: 28, c: 75 },
    ],
    adviceMessage: '田中様は糖質タイプです。本日の炭水化物は目標範囲内に抑えられています。食後の軽いウォーキングで血糖値の上昇を抑制しましょう！',
  },
};

export default function App() {
  const [users, setUsers] = useState<Record<string, UserProfile>>(INITIAL_USERS);
  const [selectedUserId, setSelectedUserId] = useState<string>('userA');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // モーダル関連の状態
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'image' | 'text'>('image');
  const [pastedText, setPastedText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<MealItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUser = users[selectedUserId];

  // 合計カロリー・PFC動的計算
  const currentCalories = currentUser.todayMeals.reduce((acc, m) => acc + m.calories, 0);
  const currentP = currentUser.todayMeals.reduce((acc, m) => acc + m.p, 0);
  const currentF = currentUser.todayMeals.reduce((acc, m) => acc + m.f, 0);
  const currentC = currentUser.todayMeals.reduce((acc, m) => acc + m.c, 0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newUserId = e.target.value;
    setSelectedUserId(newUserId);
    showToast(`「${users[newUserId].name} 様」に切り替えました`);
  };

  // 画像アップロード処理
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // AI解析実行（テキスト/スクショ共通）
  const runAiAnalysis = () => {
    if (activeTab === 'image' && !selectedImage) {
      alert('LINEのスクリーンショットまたは食事画像を選択してください');
      return;
    }
    if (activeTab === 'text' && !pastedText.trim()) {
      alert('LINEの文章を貼り付けてください');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    // AI解析のシミュレーション（1.5秒後に結果生成）
    setTimeout(() => {
      setIsAnalyzing(false);
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      if (activeTab === 'text') {
        setAnalysisResult({
          id: `ai-${Date.now()}`,
          time: timeStr,
          name: `LINE送信内容: ${pastedText.slice(0, 18)}...`,
          calories: 520,
          p: 32,
          f: 14,
          c: 65,
        });
      } else {
        setAnalysisResult({
          id: `ai-${Date.now()}`,
          time: timeStr,
          name: 'LINE画像解析: 豚の生姜焼き定食・小鉢',
          calories: 680,
          p: 38,
          f: 22,
          c: 78,
        });
      }
      showToast('AI解析が完了しました！');
    }, 1500);
  };

  // 解析結果を食事ログに追加
  const saveAnalyzedMeal = () => {
    if (!analysisResult) return;

    setUsers((prev) => ({
      ...prev,
      [selectedUserId]: {
        ...prev[selectedUserId],
        todayMeals: [...prev[selectedUserId].todayMeals, analysisResult],
      },
    }));

    showToast(`「${analysisResult.name}」を食事ログに追加しました！`);
    // モーダル初期化＆リセット
    setIsAiModalOpen(false);
    setSelectedImage(null);
    setPastedText('');
    setAnalysisResult(null);
  };

  // カロリーおよびPFC計算率
  const calPercent = Math.min(Math.round((currentCalories / currentUser.targetCalories) * 100), 100);
  const pPercent = Math.min(Math.round((currentP / currentUser.targetP) * 100), 100);
  const fPercent = Math.min(Math.round((currentF / currentUser.targetF) * 100), 100);
  const cPercent = Math.min(Math.round((currentC / currentUser.targetC) * 100), 100);

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

          {/* ユーザー切り替え */}
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
        {/* ユーザープロフィールバー */}
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
              onClick={() => setIsAiModalOpen(true)}
              className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>LINEスクショ/文章 AI解析</span>
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
                  <span className="text-3xl font-black">{currentCalories}</span>
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
                    <span className="text-xs font-black text-indigo-600">{currentP}g</span>
                  </div>
                  <p className="text-[10px] text-slate-500">目標: {currentUser.targetP}g</p>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-indigo-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${pPercent}%` }}></div>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 block text-right mt-1">{pPercent}%</span>
                </div>
              </div>

              {/* F */}
              <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-black text-amber-900">F（脂質）</span>
                    <span className="text-xs font-black text-amber-600">{currentF}g</span>
                  </div>
                  <p className="text-[10px] text-slate-500">目標: {currentUser.targetF}g</p>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-amber-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${fPercent}%` }}></div>
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 block text-right mt-1">{fPercent}%</span>
                </div>
              </div>

              {/* C */}
              <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-black text-emerald-900">C（炭水化物）</span>
                    <span className="text-xs font-black text-emerald-600">{currentC}g</span>
                  </div>
                  <p className="text-[10px] text-slate-500">目標: {currentUser.targetC}g</p>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-emerald-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: `${cPercent}%` }}></div>
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

      {/* LINEスクショ＆文章 AI解析モーダル */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-slate-800 text-lg">LINE食事内容 AI自動解析</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAiModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* タブ切り替え */}
            <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('image')}
                className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'image' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>LINEスクショ / 写真</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('text')}
                className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'text' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>LINE文章コピペ</span>
              </button>
            </div>

            {/* タブ1: 画像アップロード */}
            {activeTab === 'image' && (
              <div className="space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/30 transition-all flex flex-col items-center justify-center min-h-[160px]"
                >
                  {selectedImage ? (
                    <div className="relative w-full h-40">
                      <img src={selectedImage} alt="選択画像" className="w-full h-full object-contain rounded-lg" />
                      <span className="absolute bottom-1 right-1 bg-slate-900/80 text-white text-[10px] px-2 py-0.5 rounded">タップして変更</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <p className="text-xs font-bold text-slate-700">クリックしてLINEのスクショ・画像を選択</p>
                      <p className="text-[10px] text-slate-400 mt-1">PNG, JPGファイルに対応</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* タブ2: テキスト貼り付け */}
            {activeTab === 'text' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">LINEで送られてきたテキストを貼り付け:</label>
                <textarea
                  rows={4}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="例：今日のお昼は「サバの塩焼き定食、ごはん普通盛り、お味噌汁」を食べました！"
                  className="w-full p-3.5 border border-slate-300 rounded-2xl text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                ></textarea>
              </div>
            )}

            {/* 解析実行ボタン */}
            {!analysisResult && (
              <button
                type="button"
                onClick={runAiAnalysis}
                disabled={isAnalyzing}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>AIがカロリー＆PFCを解析中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>AI解析を実行する</span>
                  </>
                )}
              </button>
            )}

            {/* 解析結果プレビュー＆追加 */}
            {analysisResult && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 bg-emerald-200/60 px-2.5 py-1 rounded-md">
                    AI解析完了
                  </span>
                  <span className="text-xs font-bold text-slate-600">{analysisResult.calories} kcal</span>
                </div>
                <p className="text-xs font-bold text-slate-800">{analysisResult.name}</p>
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
                  <div className="bg-white p-2 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-indigo-600 block">P (タンパク質)</span>
                    <span className="text-slate-800">{analysisResult.p}g</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-amber-600 block">F (脂質)</span>
                    <span className="text-slate-800">{analysisResult.f}g</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-emerald-600 block">C (炭水化物)</span>
                    <span className="text-slate-800">{analysisResult.c}g</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={saveAnalyzedMeal}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>この食事データを本日のログに追加</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* フッター */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        サクラ整骨院 PFC Balance Manager
      </footer>
    </div>
  );
}
