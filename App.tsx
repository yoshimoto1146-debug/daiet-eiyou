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
  height: number; // cm
  weight: number; // kg
  bodyFatRatio: number; // %
  targetWeight: number; // kg
  targetMonths: number; // 達成目標期間（ヶ月）
  metabolismType: 'lipid' | 'carb' | 'muscle';
  metabolismTypeName: string;
  targetCalories: number;
  targetP: number;
  targetF: number;
  targetC: number;
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
  // 1. 基礎代謝量 (BMR) - ハリス・ベネディクト改訂式
  let bmr = 0;
  if (gender === 'male') {
    bmr = 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age;
  } else {
    bmr = 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age;
  }

  // 2. 総消費カロリー (TDEE) - 身体活動レベル（普通 1.45 で計算）
  const tdee = bmr * 1.45;

  // 3. 落とすべき体脂肪量 (kg)
  const weightToLose = Math.max(weight - targetWeight, 0);

  // 4. 総削減必要カロリー（体脂肪1kg = 約7200kcal）
  const totalDeficitCalories = weightToLose * 7200;

  // 5. 1日あたりの目標アンダーカロリー
  const days = targetMonths * 30;
  const dailyDeficit = days > 0 ? totalDeficitCalories / days : 0;

  // 6. 目標摂取カロリー（BMR未満には落とさない安全設計）
  let targetCalories = Math.round(tdee - dailyDeficit);
  if (targetCalories < bmr) {
    targetCalories = Math.round(bmr); // 基礎代謝を下回らない
  }

  // 7. PFCバランス自動調整（代謝タイプ別）
  let pRatio = 0.25;
  let fRatio = 0.25;
  let cRatio = 0.5;

  if (metabolismType === 'lipid') {
    // 脂質代謝低下タイプ：脂質を抑えてPとCを確保
    pRatio = 0.3;
    fRatio = 0.18;
    cRatio = 0.52;
  } else if (metabolismType === 'carb') {
    // 糖質吸収過多タイプ：炭水化物を抑えてPとFを確保
    pRatio = 0.3;
    fRatio = 0.3;
    cRatio = 0.4;
  } else {
    // 筋肉維持・高代謝タイプ
    pRatio = 0.35;
    fRatio = 0.25;
    cRatio = 0.4;
  }

  const targetP = Math.round((targetCalories * pRatio) / 4); // 1g = 4kcal
  const targetF = Math.round((targetCalories * fRatio) / 9); // 1g = 9kcal
  const targetC = Math.round((targetCalories * cRatio) / 4); // 1g = 4kcal

  return { targetCalories, targetP, targetF, targetC, bmr: Math.round(bmr), tdee: Math.round(tdee) };
};

// 初期ユーザーデータ
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
    todayMeals: [
      { id: 'm1', category: '朝食', name: '鮭塩焼き・玄米ご飯・味噌汁', calories: 420, p: 28, f: 10, c: 55 },
      { id: 'm2', category: '昼食', name: '蒸し鶏と彩り野菜のサラダボウル', calories: 480, p: 35, f: 12, c: 58 },
      { id: 'm3', category: '間食', name: 'ギリシャヨーグルト・素焼きアーモンド', calories: 150, p: 12, f: 5, c: 12 },
    ],
    adviceMessage: '佐藤様は脂質代謝低下タイプです。夕食の脂質を抑えられており非常に素晴らしい進捗です！夜間はPFCのうちタンパク質を意識して補給してください。',
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
    todayMeals: [
      { id: 'm5', category: '朝食', name: 'プロテイン・オートミールボウル', calories: 450, p: 35, f: 8, c: 60 },
      { id: 'm6', category: '昼食', name: '牛肉赤身ステーキ定食（ご飯少なめ）', calories: 750, p: 48, f: 28, c: 75 },
    ],
    adviceMessage: '田中様は糖質タイプです。本日の炭水化物は目標範囲内に抑えられています。食後の軽いウォーキングで血糖値の上昇を抑制しましょう！',
  },
};

export default function App() {
  const [users, setUsers] = useState<Record<string, UserProfile>>(INITIAL_USERS);
  const [selectedUserId, setSelectedUserId] = useState<string>('userA');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 目標設定モーダル用の状態
  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);
  const [calcForm, setCalcForm] = useState<UserProfile>(INITIAL_USERS['userA']);

  // AI解析モーダル
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'image' | 'text'>('image');
  const [pastedText, setPastedText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MealCategory>('昼食');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<MealItem | null>(null);

  // 編集モーダル
  const [editingMeal, setEditingMeal] = useState<MealItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUser = users[selectedUserId];

  // カロリー・PFC動的計算
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

  // 目標再計算実行＆保存
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
    showToast('ロジカル目標数値の自動更新が完了しました！');
  };

  const openCalcModal = () => {
    setCalcForm(currentUser);
    setIsCalcModalOpen(true);
  };

  // AI解析実行
  const runAiAnalysis = () => {
    if (activeTab === 'image' && !selectedImage) {
      alert('画像を選択してください');
      return;
    }
    if (activeTab === 'text' && !pastedText.trim()) {
      alert('文章を入力してください');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    setTimeout(() => {
      setIsAnalyzing(false);
      if (activeTab === 'text') {
        setAnalysisResult({
          id: `ai-${Date.now()}`,
          category: selectedCategory,
          name: `解析: ${pastedText.slice(0, 15)}...`,
          calories: 520,
          p: 32,
          f: 14,
          c: 65,
        });
      } else {
        setAnalysisResult({
          id: `ai-${Date.now()}`,
          category: selectedCategory,
          name: '解析: 豚生姜焼き定食・小鉢セット',
          calories: 680,
          p: 38,
          f: 22,
          c: 78,
        });
      }
      showToast('AI解析が完了しました');
    }, 1200);
  };

  // 食事追加
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

  // 食事削除
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

  // 食事編集保存
  const handleSaveEdit = () => {
    if (!editingMeal) return;
    setUsers((prev) => ({
      ...prev,
      [selectedUserId]: {
        ...prev[selectedUserId],
        todayMeals: prev[selectedUserId].todayMeals.map((m) => (m.id === editingMeal.id ? editingMeal : m)),
      },
    }));
    setEditingMeal(null);
    showToast('修正内容を更新しました');
  };

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
              <p className="text-[10px] text-slate-500 font-medium">ロジカルダイエット理論 準拠システム</p>
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
        {/* プロフィール ＆ 目標設定ボタン */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-1 rounded-full">
                {currentUser.metabolismTypeName}
              </span>
              <span className="text-xs text-slate-400">
                {currentUser.height}cm / {currentUser.weight}kg (目標: {currentUser.targetWeight}kg / {currentUser.targetMonths}ヶ月)
              </span>
            </div>
            <h2 className="text-2xl font-black text-white mt-2">{currentUser.name} 様の分析ダッシュボード</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openCalcModal}
              className="px-4 py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 border border-slate-600"
            >
              <Calculator className="w-4 h-4 text-emerald-400" />
              <span>目標カロリー自動計算</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAiModalOpen(true)}
              className="px-4 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>LINEスクショ/文章 AI解析</span>
            </button>
          </div>
        </div>

        {/* PFC・カロリー */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-800 text-base">ロジカル目標摂取カロリー＆PFC達成度</h3>
            </div>
            <span className="text-xs font-bold text-slate-500">
              目標: <strong className="text-emerald-600">{currentUser.targetCalories}</strong> kcal/日
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* カロリー */}
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
                      onClick={() => setEditingMeal(meal)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
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
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">自動計算ロジック連動</span>
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

      {/* 目標自動計算モーダル */}
      {isCalcModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-slate-800 text-base">ロジカル目標カロリー自動計算</h3>
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

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">代謝タイプ選択</label>
                <select
                  value={calcForm.metabolismType}
                  onChange={(e) => {
                    const val = e.target.value as 'lipid' | 'carb' | 'muscle';
                    const nameMap = {
                      lipid: '脂質代謝低下タイプ',
                      carb: '糖質吸収過多タイプ',
                      muscle: '筋肉維持・高代謝タイプ',
                    };
                    setCalcForm({ ...calcForm, metabolismType: val, metabolismTypeName: nameMap[val] });
                  }}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold"
                >
                  <option value="lipid">脂質代謝低下タイプ (F抑えめ/P&C多め)</option>
                  <option value="carb">糖質吸収過多タイプ (C抑えめ/P&F多め)</option>
                  <option value="muscle">筋肉維持・高代謝タイプ (高タンパク質)</option>
                </select>
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
                再計算して目標保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI解析モーダル */}
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

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">時間区分を選択:</label>
              <div className="grid grid-cols-4 gap-2">
                {(['朝食', '昼食', '夕食', '間食'] as MealCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`py-2 rounded-xl text-xs font-bold border ${
                      selectedCategory === cat ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-600'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
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
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
                  <div className="bg-white p-2 rounded-xl">P: {analysisResult.p}g</div>
                  <div className="bg-white p-2 rounded-xl">F: {analysisResult.f}g</div>
                  <div className="bg-white p-2 rounded-xl">C: {analysisResult.c}g</div>
                </div>
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
        サクラ整骨院 PFC Balance Manager
      </footer>
    </div>
  );
}
