import React, { useState, useRef } from 'react';
import {
  Camera,
  Plus,
  CheckCircle2,
  Flame,
  User,
  Utensils,
  MessageSquare,
  ArrowRight,
  Upload,
  FileText,
  X,
  Sparkles,
  Image as ImageIcon,
  Trash2,
  Edit2,
  Calculator,
  Target,
  Trophy,
  Zap,
  Shield,
  Award,
} from 'lucide-react';

type MealCategory = '朝食' | '昼食' | '夕食' | '間食';

interface MealItem {
  id: string;
  category: MealCategory;
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
  gender: 'female' | 'male';
  height: number;
  weight: number;
  bodyFatRatio: number;
  targetWeight: number;
  targetMonths: number;
  metabolismType: 'lipid' | 'carb' | 'muscle';
  metabolismTypeName: string;
  targetCalories: number;
  targetP: number;
  targetF: number;
  targetC: number;
  accumulatedDeficitCalories: number; // 累計カット（消費）成功カロリー
  todayMeals: MealItem[];
  adviceMessage: string;
}

// ロジカルダイエット自動計算関数
const calculateLogicalTargets = (
  gender: 'female' | 'male',
  age: number,
  height: number,
  weight: number,
  bodyFatRatio: number,
  targetWeight: number,
  targetMonths: number,
  metabolismType: 'lipid' | 'carb' | 'muscle'
) => {
  let bmr = 0;
  if (gender === 'male') {
    bmr = 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age;
  } else {
    bmr = 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age;
  }

  const tdee = bmr * 1.45;
  const weightToLose = Math.max(weight - targetWeight, 0);
  const totalDeficitCalories = weightToLose * 7200;
  const days = targetMonths * 30;
  const dailyDeficit = days > 0 ? totalDeficitCalories / days : 0;

  let targetCalories = Math.round(tdee - dailyDeficit);
  if (targetCalories < bmr) {
    targetCalories = Math.round(bmr);
  }

  let pRatio = 0.25, fRatio = 0.25, cRatio = 0.5;
  if (metabolismType === 'lipid') {
    pRatio = 0.3; fRatio = 0.18; cRatio = 0.52;
  } else if (metabolismType === 'carb') {
    pRatio = 0.3; fRatio = 0.3; cRatio = 0.4;
  } else {
    pRatio = 0.35; fRatio = 0.25; cRatio = 0.4;
  }

  const targetP = Math.round((targetCalories * pRatio) / 4);
  const targetF = Math.round((targetCalories * fRatio) / 9);
  const targetC = Math.round((targetCalories * cRatio) / 4);

  return { targetCalories, targetP, targetF, targetC, bmr: Math.round(bmr), tdee: Math.round(tdee), totalDeficitCalories };
};

// ゲーム用ランク計算関数
const getGameRank = (accumulatedCalories: number, totalGoalCalories: number) => {
  const burnedFatKg = (accumulatedCalories / 7200).toFixed(2);
  const butterCount = Math.floor(accumulatedCalories / 1500); // バター1箱約1500kcal相当
  const expLevel = Math.floor(accumulatedCalories / 1000) + 1;
  const progressPercent = Math.min(Math.round((accumulatedCalories / Math.max(totalGoalCalories, 1)) * 100), 100);

  let title = '減量チャレンジャー';
  if (expLevel >= 20) title = 'ロジカル・マスター';
  else if (expLevel >= 15) title = '代謝コマンダー';
  else if (expLevel >= 10) title = '体脂肪ハンター';
  else if (expLevel >= 5) title = 'アンダーカロリーナイト';

  return { burnedFatKg, butterCount, expLevel, title, progressPercent };
};

const INITIAL_USERS: Record<string, UserProfile> = {
  userA: {
    id: 'userA',
    name: '佐藤 佳代',
    age: 38,
    gender: 'female',
    height: 158,
    weight: 58,
    bodyFatRatio: 28,
    targetWeight: 52,
    targetMonths: 3,
    metabolismType: 'lipid',
    metabolismTypeName: '脂質代謝低下タイプ',
    targetCalories: 1450,
    targetP: 108,
    targetF: 29,
    targetC: 188,
    accumulatedDeficitCalories: 12800, // 約1.7kg相当の消費成功
    todayMeals: [
      { id: 'm1', category: '朝食', name: '鮭塩焼き・玄米ご飯・味噌汁', calories: 420, p: 28, f: 10, c: 55 },
      { id: 'm2', category: '昼食', name: '蒸し鶏と彩り野菜のサラダボウル', calories: 480, p: 35, f: 12, c: 58 },
      { id: 'm3', category: '間食', name: 'ギリシャヨーグルト・素焼きアーモンド', calories: 150, p: 12, f: 5, c: 12 },
    ],
    adviceMessage: '佐藤様は脂質代謝低下タイプです。現在バター約8箱分の体脂肪撃退に成功しています！この調子でクエストを進めましょう！',
  },
  userB: {
    id: 'userB',
    name: '田中 健太郎',
    age: 45,
    gender: 'male',
    height: 172,
    weight: 76,
    bodyFatRatio: 24,
    targetWeight: 69,
    targetMonths: 3,
    metabolismType: 'carb',
    metabolismTypeName: '糖質吸収過多タイプ',
    targetCalories: 1850,
    targetP: 138,
    targetF: 61,
    targetC: 185,
    accumulatedDeficitCalories: 21500, // 約3kg相当の消費成功
    todayMeals: [
      { id: 'm5', category: '朝食', name: 'プロテイン・オートミールボウル', calories: 450, p: 35, f: 8, c: 60 },
      { id: 'm6', category: '昼食', name: '牛肉赤身ステーキ定食（ご飯少なめ）', calories: 750, p: 48, f: 28, c: 75 },
    ],
    adviceMessage: '田中様は糖質タイプです。レベル22突破！現在の体脂肪撃退ペースは非常に論理的かつ好調です！',
  },
};

export default function App() {
  const [users, setUsers] = useState<Record<string, UserProfile>>(INITIAL_USERS);
  const [selectedUserId, setSelectedUserId] = useState<string>('userA');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);
  const [calcForm, setCalcForm] = useState<UserProfile>(INITIAL_USERS['userA']);

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'image' | 'text'>('image');
  const [pastedText, setPastedText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MealCategory>('昼食');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<MealItem | null>(null);

  const [editingMeal, setEditingMeal] = useState<MealItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUser = users[selectedUserId];

  const currentCalories = currentUser.todayMeals.reduce((acc, m) => acc + m.calories, 0);
  const currentP = currentUser.todayMeals.reduce((acc, m) => acc + m.p, 0);
  const currentF = currentUser.todayMeals.reduce((acc, m) => acc + m.f, 0);
  const currentC = currentUser.todayMeals.reduce((acc, m) => acc + m.c, 0);

  const totalGoalDeficit = (currentUser.weight - currentUser.targetWeight) * 7200;
  const gameInfo = getGameRank(currentUser.accumulatedDeficitCalories, totalGoalDeficit);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newUserId = e.target.value;
    setSelectedUserId(newUserId);
    showToast(`「${users[newUserId].name} 様」に切り替えました`);
  };

  const handleSaveLogicalTargets = () => {
    const calculated = calculateLogicalTargets(
      calcForm.gender,
      calcForm.age,
      calcForm.height,
      calcForm.weight,
      calcForm.bodyFatRatio,
      calcForm.targetWeight,
      calcForm.targetMonths,
      calcForm.metabolismType
    );

    setUsers((prev) => ({
      ...prev,
      [selectedUserId]: {
        ...calcForm,
        targetCalories: calculated.targetCalories,
        targetP: calculated.targetP,
        targetF: calculated.targetF,
        targetC: calculated.targetC,
      },
    }));

    setIsCalcModalOpen(false);
    showToast('ロジカル目標の更新が完了しました！');
  };

  const openCalcModal = () => {
    setCalcForm(currentUser);
    setIsCalcModalOpen(true);
  };

  const runAiAnalysis = () => {
    if (activeTab === 'image' && !selectedImage) return alert('画像を選択してください');
    if (activeTab === 'text' && !pastedText.trim()) return alert('文章を入力してください');

    setIsAnalyzing(true);
    setAnalysisResult(null);

    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisResult({
        id: `ai-${Date.now()}`,
        category: selectedCategory,
        name: activeTab === 'text' ? `解析: ${pastedText.slice(0, 15)}...` : '解析: 豚生姜焼き定食・小鉢セット',
        calories: 580,
        p: 34,
        f: 18,
        c: 68,
      });
      showToast('AI解析が完了しました');
    }, 1200);
  };

  const saveAnalyzedMeal = () => {
    if (!analysisResult) return;
    setUsers((prev) => ({
      ...prev,
      [selectedUserId]: {
        ...prev[selectedUserId],
        todayMeals: [...prev[selectedUserId].todayMeals, analysisResult],
      },
    }));
    showToast('食事ログに追加しました');
    setIsAiModalOpen(false);
    setSelectedImage(null);
    setPastedText('');
    setAnalysisResult(null);
  };

  const handleDeleteMeal = (mealId: string) => {
    if (window.confirm('この食事データを削除してよろしいですか？')) {
      setUsers((prev) => ({
        ...prev,
        [selectedUserId]: {
          ...prev[selectedUserId],
          todayMeals: prev[selectedUserId].todayMeals.filter((m) => m.id !== mealId),
        },
      }));
      showToast('データを削除しました');
    }
  };

  const calPercent = Math.min(Math.round((currentCalories / currentUser.targetCalories) * 100), 100);
  const pPercent = Math.min(Math.round((currentP / currentUser.targetP) * 100), 100);
  const fPercent = Math.min(Math.round((currentF / currentUser.targetF) * 100), 100);
  const cPercent = Math.min(Math.round((currentC / currentUser.targetC) * 100), 100);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col antialiased font-sans">
      {/* トースト */}
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
              <p className="text-[10px] text-slate-500 font-medium">ロジカルダイエットゲーミフィケーション</p>
            </div>
          </div>

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

      {/* メイン */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
        {/* 🎮 ゲーム風ステータス・進捗ダッシュボード */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Trophy className="w-64 h-64 text-amber-400" />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-slate-900 font-black text-2xl shadow-lg border-2 border-amber-300">
                Lv.{gameInfo.expLevel}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 px-3 py-0.5 rounded-full flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    {gameInfo.title}
                  </span>
                  <span className="text-xs text-slate-400">{currentUser.metabolismTypeName}</span>
                </div>
                <h2 className="text-2xl font-black text-white mt-1">{currentUser.name} 様のクエスト進捗</h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openCalcModal}
                className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 border border-slate-700"
              >
                <Calculator className="w-4 h-4 text-emerald-400" />
                <span>目標設定</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAiModalOpen(true)}
                className="px-4 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>AI食事解析</span>
              </button>
            </div>
          </div>

          {/* 消費実績可視化カード 3連 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center gap-4">
              <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-300 block">累計撃退エネルギー</span>
                <span className="text-xl font-black text-amber-300">
                  {currentUser.accumulatedDeficitCalories.toLocaleString()} <span className="text-xs text-white">kcal</span>
                </span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center gap-4">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-300 block">純粋体脂肪カット量</span>
                <span className="text-xl font-black text-emerald-400">
                  -{gameInfo.burnedFatKg} <span className="text-xs text-white">kg</span>
                </span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center gap-4">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-300 block">身近な例え（バター換算）</span>
                <span className="text-xl font-black text-amber-400">
                  バター約 {gameInfo.butterCount} 箱分 <span className="text-xs text-white">消滅</span>
                </span>
              </div>
            </div>
          </div>

          {/* クエスト達成プログレスバー */}
          <div className="space-y-2 relative z-10 bg-black/20 p-4 rounded-2xl border border-white/5">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                【最終目標】体脂肪 {currentUser.weight - currentUser.targetWeight}kg 撃退クエスト
              </span>
              <span className="text-amber-400 font-black">{gameInfo.progressPercent}% 達成</span>
            </div>
            <div className="w-full bg-slate-800 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div
                className="bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 h-full rounded-full transition-all duration-700 shadow-lg"
                style={{ width: `${gameInfo.progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* PFC・本日カロリー */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-800 text-base">本日のエネルギー＆PFCクエスト</h3>
            </div>
            <span className="text-xs font-bold text-slate-500">
              上限目標: <strong className="text-emerald-600">{currentUser.targetCalories}</strong> kcal/日
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col justify-between shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">本日摂取エネルギー</span>
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
                <span>消化率</span>
                <span className="text-amber-400">{calPercent}%</span>
              </div>
            </div>

            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
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

        {/* 食事ログ */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Utensils className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-800 text-base">{currentUser.name} 様の本日ログ</h3>
            </div>
            <span className="text-xs text-slate-400 font-bold">{currentUser.todayMeals.length} 件記録</span>
          </div>

          <div className="space-y-2">
            {currentUser.todayMeals.map((meal) => (
              <div
                key={meal.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all gap-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-lg shrink-0">
                    {meal.category}
                  </span>
                  <span className="text-xs font-bold text-slate-800">{meal.name}</span>
                </div>

                <div className="flex items-center gap-4 text-xs font-medium text-slate-600 justify-between sm:justify-end">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-slate-800">{meal.calories} kcal</span>
                    <div className="flex gap-2 text-[11px]">
                      <span className="text-indigo-600 font-bold">P:{meal.p}g</span>
                      <span className="text-amber-600 font-bold">F:{meal.f}g</span>
                      <span className="text-emerald-600 font-bold">C:{meal.c}g</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
                    <button
                      type="button"
                      onClick={() => handleDeleteMeal(meal.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LINE指導 */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              <h3 className="font-bold text-base">ロジカルLINE指導アシスタント</h3>
            </div>
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">ゲーム判定連動</span>
          </div>
          <p className="text-xs text-emerald-100 leading-relaxed bg-black/10 p-3.5 rounded-2xl border border-white/10">
            {currentUser.adviceMessage}
          </p>
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => showToast('アドバイス文章をコピーしました')}
              className="px-4 py-2.5 rounded-xl bg-white text-emerald-800 text-xs font-bold flex items-center gap-1.5"
            >
              <span>LINEアドバイス文をコピー</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>

      {/* モーダル群 (略同機能) */}
      {isCalcModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-slate-800 text-base">ロジカル目標自動計算</h3>
              </div>
              <button type="button" onClick={() => setIsCalcModalOpen(false)} className="p-1 rounded-full text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">性別</label>
                  <select
                    value={calcForm.gender}
                    onChange={(e) => setCalcForm({ ...calcForm, gender: e.target.value as 'female' | 'male' })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    <option value="female">女性</option>
                    <option value="male">男性</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">年齢</label>
                  <input
                    type="number"
                    value={calcForm.age}
                    onChange={(e) => setCalcForm({ ...calcForm, age: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">身長 (cm)</label>
                  <input
                    type="number"
                    value={calcForm.height}
                    onChange={(e) => setCalcForm({ ...calcForm, height: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">体重 (kg)</label>
                  <input
                    type="number"
                    value={calcForm.weight}
                    onChange={(e) => setCalcForm({ ...calcForm, weight: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">体脂肪率 (%)</label>
                  <input
                    type="number"
                    value={calcForm.bodyFatRatio}
                    onChange={(e) => setCalcForm({ ...calcForm, bodyFatRatio: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                <div>
                  <label className="text-[11px] font-bold text-emerald-900 block mb-1">目標体重 (kg)</label>
                  <input
                    type="number"
                    value={calcForm.targetWeight}
                    onChange={(e) => setCalcForm({ ...calcForm, targetWeight: Number(e.target.value) })}
                    className="w-full p-2.5 bg-white border border-emerald-200 rounded-xl text-xs font-black text-emerald-700"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-emerald-900 block mb-1">達成目標期間</label>
                  <select
                    value={calcForm.targetMonths}
                    onChange={(e) => setCalcForm({ ...calcForm, targetMonths: Number(e.target.value) })}
                    className="w-full p-2.5 bg-white border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700"
                  >
                    <option value={1}>1ヶ月</option>
                    <option value={2}>2ヶ月</option>
                    <option value={3}>3ヶ月</option>
                    <option value={6}>6ヶ月</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCalcModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSaveLogicalTargets}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm"
              >
                目標設定を保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AIモーダル */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-slate-800 text-lg">LINE食事内容 AI解析</h3>
              </div>
              <button type="button" onClick={() => setIsAiModalOpen(false)} className="p-1 rounded-full text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('image')}
                className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 ${
                  activeTab === 'image' ? 'bg-white text-emerald-700' : 'text-slate-500'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>LINEスクショ/画像</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('text')}
                className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 ${
                  activeTab === 'text' ? 'bg-white text-emerald-700' : 'text-slate-500'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>LINE文章コピペ</span>
              </button>
            </div>

            {activeTab === 'image' && (
              <div className="space-y-3">
                <input type="file" accept="image/*" ref={fileInputRef} onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setSelectedImage(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }} className="hidden" />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center cursor-pointer hover:border-emerald-500 min-h-[140px] flex items-center justify-center"
                >
                  {selectedImage ? (
                    <img src={selectedImage} alt="選択画像" className="max-h-36 object-contain rounded-lg" />
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-700">クリックしてLINEスクショを選択</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'text' && (
              <textarea
                rows={3}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="例：お昼にサバの塩焼き定食とごはん普通盛りを食べました！"
                className="w-full p-3.5 border border-slate-300 rounded-2xl text-xs outline-none focus:border-emerald-500"
              ></textarea>
            )}

            {!analysisResult && (
              <button
                type="button"
                onClick={runAiAnalysis}
                disabled={isAnalyzing}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                {isAnalyzing ? 'AI解析中...' : 'AI解析を実行する'}
              </button>
            )}

            {analysisResult && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 bg-emerald-200/60 px-2.5 py-1 rounded-md">
                    【{analysisResult.category}】解析結果
                  </span>
                  <span className="text-xs font-bold text-slate-800">{analysisResult.calories} kcal</span>
                </div>
                <p className="text-xs font-bold text-slate-800">{analysisResult.name}</p>
                <button
                  type="button"
                  onClick={saveAnalyzedMeal}
                  className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-xs"
                >
                  この食事ログを追加する
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* フッター */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        サクラ整骨院 PFC Balance Manager (Gamified Edition)
      </footer>
    </div>
  );
}
