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
  Calculator,
  Target,
  AlertTriangle,
  HeartPulse,
  ChefHat,
  CheckSquare,
  Activity,
  BookOpen,
  ShieldCheck,
  Copy,
  Scan,
  Database,
  UserPlus,
  Dna,
} from 'lucide-react';

type MealCategory = '朝食' | '昼食' | '夕食' | '間食';

type GeneType = 
  | 'carb_risk'       // ① 糖質代謝リスクタイプ
  | 'lipid_risk'      // ② 脂質代謝リスクタイプ
  | 'protein_risk'    // ③ 蛋白分解・筋肉分解リスクタイプ
  | 'micronutrient'   // ④ 微量栄養素（葉酸・鉄・ビタミンC）吸収低下タイプ
  | 'exercise_resistant'; // ⑤ 運動減量抵抗性タイプ

interface MealItem {
  id: string;
  category: MealCategory;
  name: string;
  calories: number;
  p: number;
  f: number;
  c: number;
  recipe?: string;
}

interface InBodyRecord {
  date: string;
  weight: number;
  muscleMass: number;
  bodyFatRatio: number;
  bmr: number;
}

interface GeneProfile {
  type: GeneType;
  typeName: string;
  folicAcidLow: boolean;
  vitaminCLow: boolean;
  ironLow: boolean;
  zincLow: boolean;
  leucineLow: boolean;
  exerciseEffectLow: boolean;
}

interface UserProfile {
  id: string;
  name: string;
  age: number;
  gender: 'female' | 'male';
  height: number;
  weight: number;
  muscleMass: number;
  bodyFatRatio: number;
  targetWeight: number;
  targetMonths: number;
  pal: number;
  geneProfile: GeneProfile;
  bmr: number;
  isInbodyMeasured: boolean;
  tdee: number;
  targetCalories: number;
  targetP: number;
  targetF: number;
  targetC: number;
  todayMeals: MealItem[];
  inbodyHistory: InBodyRecord[];
  adviceMessage: string;
}

// 遺伝子タイプごとのPFC比率 & ハリス・ベネディクト個別計算
const calculateLogicalTargetsWithHB = (
  gender: 'female' | 'male',
  age: number,
  height: number,
  weight: number,
  muscleMass: number,
  bodyFatRatio: number,
  targetWeight: number,
  targetMonths: number,
  pal: number,
  geneProfile: GeneProfile,
  inbodyBmr?: number
) => {
  let bmr = 0;
  let isInbody = false;

  if (inbodyBmr && inbodyBmr > 500) {
    bmr = inbodyBmr;
    isInbody = true;
  } else if (gender === 'male') {
    bmr = Math.round(88.362 + 13.397 * weight + 4.799 * height - 5.677 * age);
  } else {
    bmr = Math.round(447.593 + 9.247 * weight + 3.098 * height - 4.33 * age);
  }

  const tdee = Math.round(bmr * (pal || 1.45));
  const weightToLose = Math.max(weight - targetWeight, 0);
  const totalDeficitCalories = weightToLose * 7200;
  const days = targetMonths * 30;
  const dailyDeficit = days > 0 ? totalDeficitCalories / days : 0;

  let targetCalories = Math.round(tdee - dailyDeficit);
  if (targetCalories < bmr) {
    targetCalories = bmr;
  }

  let pRatio = 0.25, fRatio = 0.25, cRatio = 0.5;

  switch (geneProfile.type) {
    case 'lipid_risk':
      pRatio = 0.30; fRatio = 0.18; cRatio = 0.52;
      break;
    case 'carb_risk':
      pRatio = 0.30; fRatio = 0.30; cRatio = 0.40;
      break;
    case 'protein_risk':
      pRatio = 0.35; fRatio = 0.22; cRatio = 0.43;
      break;
    case 'micronutrient':
      pRatio = 0.28; fRatio = 0.22; cRatio = 0.50;
      break;
    case 'exercise_resistant':
      pRatio = 0.32; fRatio = 0.23; cRatio = 0.45;
      break;
  }

  const targetP = Math.round((targetCalories * pRatio) / 4);
  const targetF = Math.round((targetCalories * fRatio) / 9);
  const targetC = Math.round((targetCalories * cRatio) / 4);

  return { targetCalories, targetP, targetF, targetC, bmr, tdee, isInbody };
};

// PFC全適正化 ＋ 遺伝子特性補強 連動型 LINEアドバイス作成
const generateLineAdvice = (user: UserProfile, newMeal: MealItem): string => {
  const futureTotalCal = user.todayMeals.reduce((acc, m) => acc + m.calories, 0) + newMeal.calories;
  const futureTotalP = user.todayMeals.reduce((acc, m) => acc + m.p, 0) + newMeal.p;
  const futureTotalF = user.todayMeals.reduce((acc, m) => acc + m.f, 0) + newMeal.f;
  const futureTotalC = user.todayMeals.reduce((acc, m) => acc + m.c, 0) + newMeal.c;

  const pRatio = futureTotalP / user.targetP;
  const fRatio = futureTotalF / user.targetF;
  const cRatio = futureTotalC / user.targetC;

  const isPFCAllPerfect = (pRatio >= 0.85 && pRatio <= 1.15) && (fRatio >= 0.70 && fRatio <= 1.10) && (cRatio >= 0.70 && cRatio <= 1.10);
  const gene = user.geneProfile;

  let geneNutrientAdvice = '';
  if (gene.folicAcidLow || gene.ironLow) {
    geneNutrientAdvice = '※遺伝子解析（chatGENE）に基づき、赤血球・代謝に必要な「鉄分・葉酸」を意識して緑黄色野菜や海藻を添えてくださいね。';
  } else if (gene.leucineLow) {
    geneNutrientAdvice = '※筋肉維持遺伝子の補強のため、BCAA（ロイシン）を含む鶏胸肉・卵・プロテインを継続補給しましょう。';
  } else if (gene.vitaminCLow) {
    geneNutrientAdvice = '※ビタミンC吸収濃度が低めの体質ですので、食後にブロッコリーやキウイ等を添えるとコラーゲン合成力が高まります。';
  }

  if (futureTotalCal > user.targetCalories + 150) {
    const calOver = futureTotalCal - user.targetCalories;
    return `【サクラ整骨院 栄養フィードバック】\n${user.name}様、ご投稿ありがとうございます！しっかり記録してくださり素晴らしいです！\n\n本日の合計は【${futureTotalCal} kcal】となり、目標より【+${calOver} kcal】高めとなっております。\n脂肪定着までに約48時間のタイムラグがありますのでご安心ください！\n\n明日はお水や白湯を意識して摂り、脂質（F）と炭水化物（C）を少し控えめにした和食でリセットしていきましょう！\n${geneNutrientAdvice}`;
  }

  if (futureTotalCal < user.bmr) {
    return `【サクラ整骨院 栄養フィードバック】\n${user.name}様、お忙しい中記録してくださり感謝いたします！\n\n1点大切なアドバイスです。本日の合計が【${futureTotalCal} kcal】となっており、${user.name}様の基礎代謝量【${user.bmr} kcal】を下回っています。\n食べなさすぎると体が「省エネモード（停滞期）」に入り、脂肪が燃えにくくなってしまいます。\n\n今夜または明日の朝、ゆで卵やプロテインなどを少し足して補給してあげてくださいね！`;
  }

  if (isPFCAllPerfect) {
    return `【サクラ整骨院 栄養フィードバック】\n${user.name}様、お食事の投稿ありがとうございます！素晴らしい成果です！\n\n【遺伝子最適化（${gene.typeName}）PFCバランス達成】\n・P（タンパク質）: ${futureTotalP}g（目標: ${user.targetP}g）\n・F（脂質）: ${futureTotalF}g（目標: ${user.targetF}g）\n・C（炭水化物）: ${futureTotalC}g（目標: ${user.targetC}g）\n\n基礎代謝【${user.bmr} kcal】をクリアしつつ、体脂肪だけを狙い撃ちで燃焼できる完璧な状態です！明日もこの調子でいきましょう！\n${geneNutrientAdvice}`;
  }

  if (pRatio < 0.85) {
    const pGap = Math.round(user.targetP - futureTotalP);
    return `【サクラ整骨院 栄養フィードバック】\n${user.name}様、本日も記録ありがとうございます！カロリーコントロールは非常に良好です！\n\nあと一歩向上させるポイントとして、本日はタンパク質（P）があと【約${pGap}g】不足気味です。（本日: P ${futureTotalP}g / 目標: ${user.targetP}g）\n明日は朝食に卵を足したりプロテインを取り入れてみてくださいね！\n${geneNutrientAdvice}`;
  }

  return `【サクラ整骨院 栄養フィードバック】\n${user.name}様、お写真の投稿ありがとうございます！\n\n本日の合計は【${futureTotalCal} kcal】（目標: ${user.targetCalories} kcal）と適正範囲内で推移しています。\n（P: ${futureTotalP}g / F: ${futureTotalF}g / C: ${futureTotalC}g）\n\n${geneNutrientAdvice}`;
};

const INITIAL_USERS: Record<string, UserProfile> = {
  userA: {
    id: 'userA',
    name: '佐藤 佳代',
    age: 38,
    gender: 'female',
    height: 158,
    weight: 58,
    muscleMass: 20.5,
    bodyFatRatio: 28,
    targetWeight: 52,
    targetMonths: 3,
    pal: 1.45,
    geneProfile: {
      type: 'lipid_risk',
      typeName: '脂質吸収過多・皮下脂肪タイプ',
      folicAcidLow: true,
      vitaminCLow: true,
      ironLow: true,
      zincLow: true,
      leucineLow: false,
      exerciseEffectLow: true,
    },
    bmr: 1260,
    isInbodyMeasured: false,
    tdee: 1827,
    targetCalories: 1347,
    targetP: 101,
    targetF: 27,
    targetC: 175,
    todayMeals: [
      {
        id: 'm1',
        category: '朝食',
        name: '鮭塩焼き・玄米ご飯・味噌汁',
        calories: 420,
        p: 28,
        f: 10,
        c: 55,
        recipe: '鮭をノンオイルで焼き、温かい玄米ご飯となめこの味噌汁を添える。',
      },
    ],
    inbodyHistory: [{ date: '2026-08-01', weight: 59.5, muscleMass: 20.1, bodyFatRatio: 29.2, bmr: 1245 }],
    adviceMessage: '【サクラ整骨院 栄養フィードバック】\n佐藤佳代様、本日の食事記録ありがとうございます！遺伝子タイプ（脂質吸収過多）に合わせて脂質を抑えた素晴らしいバランスです。',
  },
  userB: {
    id: 'userB',
    name: '田中 健太郎',
    age: 45,
    gender: 'male',
    height: 172,
    weight: 76,
    muscleMass: 31.2,
    bodyFatRatio: 24,
    targetWeight: 69,
    targetMonths: 3,
    pal: 1.45,
    geneProfile: {
      type: 'carb_risk',
      typeName: '糖質内臓脂肪・インスリンリスクタイプ',
      folicAcidLow: false,
      vitaminCLow: false,
      ironLow: false,
      zincLow: false,
      leucineLow: true,
      exerciseEffectLow: false,
    },
    bmr: 1580,
    isInbodyMeasured: false,
    tdee: 2291,
    targetCalories: 1731,
    targetP: 130,
    targetF: 58,
    targetC: 173,
    todayMeals: [],
    inbodyHistory: [],
    adviceMessage: '【サクラ整骨院 栄養フィードバック】\n田中健太郎様、遺伝子特性（糖質リスク）に基づき低GI・高タンパクな食生活を意識していきましょう！',
  },
};

export default function App() {
  const [users, setUsers] = useState<Record<string, UserProfile>>(INITIAL_USERS);
  const [selectedUserId, setSelectedUserId] = useState<string>('userA');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // モーダル表示State
  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);
  const [calcForm, setCalcForm] = useState<UserProfile>(INITIAL_USERS['userA']);

  // 新規会員追加モーダルState
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    age: 38,
    gender: 'female' as 'female' | 'male',
    height: 158,
    weight: 58,
    targetWeight: 52,
    targetMonths: 3,
    pal: 1.45,
    geneType: 'lipid_risk' as GeneType,
  });

  const [isGeneModalOpen, setIsGeneModalOpen] = useState(false);
  const [geneForm, setGeneForm] = useState<GeneProfile>(INITIAL_USERS['userA'].geneProfile);

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'image' | 'text'>('image');
  const [pastedText, setPastedText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MealCategory>('昼食');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<MealItem | null>(null);
  const [generatedAdvice, setGeneratedAdvice] = useState<string>('');

  const [isInbodyModalOpen, setIsInbodyModalOpen] = useState(false);
  const [inbodyImage, setInbodyImage] = useState<string | null>(null);
  const [isScanningInbody, setIsScanningInbody] = useState(false);
  const [scannedInbodyData, setScannedInbodyData] = useState<InBodyRecord | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inbodyFileInputRef = useRef<HTMLInputElement>(null);
  const currentUser = users[selectedUserId];

  const currentCalories = currentUser.todayMeals.reduce((acc, m) => acc + m.calories, 0);
  const currentP = currentUser.todayMeals.reduce((acc, m) => acc + m.p, 0);
  const currentF = currentUser.todayMeals.reduce((acc, m) => acc + m.f, 0);
  const currentC = currentUser.todayMeals.reduce((acc, m) => acc + m.c, 0);

  const isBelowBmr = currentCalories < currentUser.bmr;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyToClipboard = (text: string, msg: string) => {
    navigator.clipboard.writeText(text);
    showToast(msg);
  };

  // 氏名入力による新規会員の追加保存
  const handleAddNewUser = () => {
    if (!newUserForm.name.trim()) {
      return alert('会員様のお名前（氏名）を入力してください');
    }

    const newId = `user_${Date.now()}`;
    const defaultGene: GeneProfile = {
      type: newUserForm.geneType,
      typeName:
        newUserForm.geneType === 'lipid_risk' ? '脂質吸収過多・皮下脂肪タイプ' :
        newUserForm.geneType === 'carb_risk' ? '糖質内臓脂肪・インスリンリスクタイプ' :
        newUserForm.geneType === 'protein_risk' ? '蛋白分解・筋肉分解リスクタイプ' :
        newUserForm.geneType === 'micronutrient' ? '微量栄養素（葉酸・鉄・ビタミンC）吸収低下タイプ' :
        '運動減量抵抗性タイプ',
      folicAcidLow: false,
      vitaminCLow: false,
      ironLow: false,
      zincLow: false,
      leucineLow: false,
      exerciseEffectLow: false,
    };

    const calculated = calculateLogicalTargetsWithHB(
      newUserForm.gender,
      newUserForm.age,
      newUserForm.height,
      newUserForm.weight,
      0,
      0,
      newUserForm.targetWeight,
      newUserForm.targetMonths,
      newUserForm.pal,
      defaultGene
    );

    const newUserObj: UserProfile = {
      id: newId,
      name: newUserForm.name,
      age: newUserForm.age,
      gender: newUserForm.gender,
      height: newUserForm.height,
      weight: newUserForm.weight,
      muscleMass: 0,
      bodyFatRatio: 0,
      targetWeight: newUserForm.targetWeight,
      targetMonths: newUserForm.targetMonths,
      pal: newUserForm.pal,
      geneProfile: defaultGene,
      bmr: calculated.bmr,
      isInbodyMeasured: false,
      tdee: calculated.tdee,
      targetCalories: calculated.targetCalories,
      targetP: calculated.targetP,
      targetF: calculated.targetF,
      targetC: calculated.targetC,
      todayMeals: [],
      inbodyHistory: [],
      adviceMessage: `【サクラ整骨院 栄養フィードバック】\n${newUserForm.name}様、本日から個別PFC管理ダイエットスタートです！しっかりサポートいたします。`,
    };

    setUsers((prev) => ({ ...prev, [newId]: newUserObj }));
    setSelectedUserId(newId);
    setNewUserForm({ ...newUserForm, name: '' });
    setIsAddUserModalOpen(false);
    showToast(`新会員「${newUserForm.name} 様」を追加登録しました！`);
  };

  const handleSaveGeneProfile = () => {
    const typeNames: Record<GeneType, string> = {
      lipid_risk: '脂質吸収過多・皮下脂肪タイプ',
      carb_risk: '糖質内臓脂肪・インスリンリスクタイプ',
      protein_risk: '蛋白分解・筋肉分解リスクタイプ',
      micronutrient: '微量栄養素（葉酸・鉄・ビタミンC）吸収低下タイプ',
      exercise_resistant: '運動減量抵抗性タイプ',
    };

    const updatedGene: GeneProfile = {
      ...geneForm,
      typeName: typeNames[geneForm.type],
    };

    const calculated = calculateLogicalTargetsWithHB(
      currentUser.gender,
      currentUser.age,
      currentUser.height,
      currentUser.weight,
      currentUser.muscleMass,
      currentUser.bodyFatRatio,
      currentUser.targetWeight,
      currentUser.targetMonths,
      currentUser.pal,
      updatedGene,
      currentUser.isInbodyMeasured ? currentUser.bmr : undefined
    );

    setUsers((prev) => ({
      ...prev,
      [selectedUserId]: {
        ...prev[selectedUserId],
        geneProfile: updatedGene,
        targetCalories: calculated.targetCalories,
        targetP: calculated.targetP,
        targetF: calculated.targetF,
        targetC: calculated.targetC,
      },
    }));

    setIsGeneModalOpen(false);
    showToast('遺伝子検査データ（chatGENE）に基づく設定を更新しました！');
  };

  const handleSaveLogicalTargets = () => {
    const calculated = calculateLogicalTargetsWithHB(
      calcForm.gender,
      calcForm.age,
      calcForm.height,
      calcForm.weight,
      calcForm.muscleMass,
      calcForm.bodyFatRatio,
      calcForm.targetWeight,
      calcForm.targetMonths,
      calcForm.pal,
      calcForm.geneProfile,
      calcForm.isInbodyMeasured ? calcForm.bmr : undefined
    );

    setUsers((prev) => ({
      ...prev,
      [selectedUserId]: {
        ...calcForm,
        bmr: calculated.bmr,
        tdee: calculated.tdee,
        targetCalories: calculated.targetCalories,
        targetP: calculated.targetP,
        targetF: calculated.targetF,
        targetC: calculated.targetC,
      },
    }));

    setIsCalcModalOpen(false);
    showToast('目標期間・数値の再計算が完了しました！');
  };

  const runInbodyOcrScan = () => {
    if (!inbodyImage) return alert('InBodyの測定結果シート画像を選択してください');
    setIsScanningInbody(true);
    setTimeout(() => {
      setIsScanningInbody(false);
      const parsed: InBodyRecord = {
        date: new Date().toISOString().split('T')[0],
        weight: currentUser.gender === 'female' ? 57.2 : 75.1,
        muscleMass: currentUser.gender === 'female' ? 21.1 : 32.4,
        bodyFatRatio: currentUser.gender === 'female' ? 26.8 : 22.5,
        bmr: currentUser.gender === 'female' ? 1285 : 1620,
      };
      setScannedInbodyData(parsed);
      showToast('InBodyシートのAIスキャンが完了しました！');
    }, 1200);
  };

  const saveInbodyToProfile = () => {
    if (!scannedInbodyData) return;
    const calculated = calculateLogicalTargetsWithHB(
      currentUser.gender,
      currentUser.age,
      currentUser.height,
      scannedInbodyData.weight,
      scannedInbodyData.muscleMass,
      scannedInbodyData.bodyFatRatio,
      currentUser.targetWeight,
      currentUser.targetMonths,
      currentUser.pal,
      currentUser.geneProfile,
      scannedInbodyData.bmr
    );

    setUsers((prev) => ({
      ...prev,
      [selectedUserId]: {
        ...prev[selectedUserId],
        weight: scannedInbodyData.weight,
        muscleMass: scannedInbodyData.muscleMass,
        bodyFatRatio: scannedInbodyData.bodyFatRatio,
        bmr: calculated.bmr,
        isInbodyMeasured: true,
        tdee: calculated.tdee,
        targetCalories: calculated.targetCalories,
        targetP: calculated.targetP,
        targetF: calculated.targetF,
        targetC: calculated.targetC,
        inbodyHistory: [scannedInbodyData, ...prev[selectedUserId].inbodyHistory],
      },
    }));

    setIsInbodyModalOpen(false);
    showToast('InBody測定データを保存しました！');
  };

  const runAiAnalysis = () => {
    if (activeTab === 'image' && !selectedImage) return alert('画像を選択してください');
    if (activeTab === 'text' && !pastedText.trim()) return alert('文章を入力してください');

    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      const parsedMeal: MealItem = {
        id: `ai-${Date.now()}`,
        category: selectedCategory,
        name: activeTab === 'text' ? `解析: ${pastedText.slice(0, 18)}` : '解析: 豚生姜焼き定食・小鉢セット',
        calories: 580,
        p: 34,
        f: 18,
        c: 68,
        recipe: '豚ロース薄切り肉を玉ねぎ・生姜醤油で炒める。キャベツの千切りと冷奴を添える。',
      };
      setAnalysisResult(parsedMeal);
      setGeneratedAdvice(generateLineAdvice(currentUser, parsedMeal));
      showToast('AI解析＆LINE文章生成が完了しました！');
    }, 1200);
  };

  const saveAnalyzedMeal = () => {
    if (!analysisResult) return;
    setUsers((prev) => ({
      ...prev,
      [selectedUserId]: {
        ...prev[selectedUserId],
        todayMeals: [...prev[selectedUserId].todayMeals, analysisResult],
        adviceMessage: generatedAdvice || prev[selectedUserId].adviceMessage,
      },
    }));
    showToast('食事ログに追加し、アドバイスを更新しました！');
    setIsAiModalOpen(false);
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
              <h1 className="text-base font-black text-slate-800 leading-tight">サクラ整骨院 遺伝子・InBody統合PFC管理</h1>
              <p className="text-[10px] text-slate-500 font-medium">chatGENE遺伝子解析 ＋ InBody連動（スタッフ専用）</p>
            </div>
          </div>

          {/* 会員選択 ＆ 新規会員追加エリア */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddUserModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-emerald-100" />
              <span>＋ 新規会員追加</span>
            </button>

            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-sm">
              <User className="w-4 h-4 text-emerald-600 ml-1" />
              <select
                value={selectedUserId}
                onChange={(e) => {
                  setSelectedUserId(e.target.value);
                  setCalcForm(users[e.target.value]);
                  setGeneForm(users[e.target.value].geneProfile);
                }}
                className="bg-transparent text-slate-800 text-xs font-bold py-1 pr-2 outline-none cursor-pointer"
              >
                {Object.values(users).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} 様 ({u.geneProfile.typeName})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* メイン */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
        {/* カルテダッシュボード */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-0.5 rounded-full flex items-center gap-1">
                  <Dna className="w-3.5 h-3.5 text-amber-400" /> {currentUser.geneProfile.typeName}
                </span>
                {currentUser.isInbodyMeasured && (
                  <span className="text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-0.5 rounded-full flex items-center gap-1">
                    <Database className="w-3 h-3 text-indigo-400" /> InBody実測連動
                  </span>
                )}
                <span className="text-xs text-slate-400">{currentUser.age}歳 / {currentUser.gender === 'female' ? '女性' : '男性'} / {currentUser.height}cm</span>
              </div>
              <h2 className="text-2xl font-black text-white">{currentUser.name} 様の統合精度カルテ</h2>
            </div>

            {/* ボタン群 */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setGeneForm(currentUser.geneProfile);
                  setIsGeneModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow"
              >
                <Dna className="w-4 h-4 text-amber-200" />
                <span>🧬 遺伝子検査データ設定</span>
              </button>

              <button
                type="button"
                onClick={() => setIsInbodyModalOpen(true)}
                className="px-3.5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow"
              >
                <Scan className="w-4 h-4 text-indigo-200" />
                <span>📸 InBody結果読み込み</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCalcForm(currentUser);
                  setIsCalcModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 border border-slate-700 shadow"
              >
                <Calculator className="w-4 h-4 text-emerald-400" />
                <span>数値再計算</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAiModalOpen(true)}
                className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>AI食事解析</span>
              </button>
            </div>
          </div>

          {/* 個別精密計算の指標 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700">
              <span className="text-[10px] text-slate-400 block font-bold">体重 / 骨格筋量</span>
              <span className="text-base font-black text-white mt-1 block">
                {currentUser.weight} <span className="text-xs text-slate-400 font-normal">kg</span>
                <span className="text-xs text-indigo-300 block font-normal">筋量: {currentUser.muscleMass || '--'} kg</span>
              </span>
            </div>

            <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700">
              <span className="text-[10px] text-slate-400 block font-bold">体脂肪率</span>
              <span className="text-base font-black text-amber-300 mt-1 block">
                {currentUser.bodyFatRatio} <span className="text-xs text-slate-400 font-normal">%</span>
              </span>
            </div>

            <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700">
              <span className="text-[10px] text-slate-400 block font-bold">1日総消費 (TDEE)</span>
              <span className="text-base font-black text-indigo-300 mt-1 block">
                {currentUser.tdee} <span className="text-xs text-slate-400 font-normal">kcal</span>
              </span>
            </div>

            <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700">
              <span className="text-[10px] text-rose-300 block font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-rose-400" /> 基礎代謝 ({currentUser.isInbodyMeasured ? 'InBody' : '推定'})
              </span>
              <span className="text-base font-black text-rose-400 mt-1 block">
                {currentUser.bmr} <span className="text-xs text-slate-400 font-normal">kcal</span>
              </span>
            </div>

            <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700">
              <span className="text-[10px] text-amber-300 block font-bold">目標カロリー</span>
              <span className="text-base font-black text-amber-400 mt-1 block">
                {currentUser.targetCalories} <span className="text-xs text-slate-400 font-normal">kcal</span>
              </span>
            </div>
          </div>
        </div>

        {/* 摂取状況＆PFC全適正化バランス */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-800 text-base">本日の摂取カロリー・PFC進捗状況</h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">※遺伝子タイプ（{currentUser.geneProfile.typeName}）最適化基準</span>
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
                    className={`h-full rounded-full transition-all duration-500 ${
                      isBelowBmr ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-400 to-emerald-400'
                    }`}
                    style={{ width: `${calPercent}%` }}
                  ></div>
                </div>
              </div>

              {isBelowBmr ? (
                <div className="bg-rose-500/20 text-rose-300 text-[10px] font-bold p-2 rounded-xl border border-rose-500/30 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>基礎代謝未満（要補給指示）</span>
                </div>
              ) : (
                <div className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold p-2 rounded-xl border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>安全摂取域クリア</span>
                </div>
              )}
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

        {/* 自動生成 LINEアドバイス表示エリア */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              <h3 className="font-bold text-base">遺伝子＆PFC判定 LINEフィードバック文章</h3>
            </div>
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">chatGENE最適化</span>
          </div>
          <p className="text-xs text-emerald-50 leading-relaxed bg-black/20 p-4 rounded-2xl border border-white/10 font-sans whitespace-pre-wrap">
            {currentUser.adviceMessage}
          </p>
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => copyToClipboard(currentUser.adviceMessage, 'LINEフィードバック文章をコピーしました！')}
              className="px-4 py-2.5 rounded-xl bg-white text-emerald-800 text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-emerald-50"
            >
              <Copy className="w-4 h-4" />
              <span>そのままLINEに送信（文章をコピー）</span>
            </button>
          </div>
        </div>
      </main>

      {/* 👤 新規会員追加 モーダル */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-slate-800 text-base">新規会員様の追加登録</h3>
              </div>
              <button type="button" onClick={() => setIsAddUserModalOpen(false)} className="p-1 rounded-full text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  会員様のお名前（氏名） <span className="text-rose-500">*必須</span>
                </label>
                <input
                  type="text"
                  placeholder="例：山﨑 知子"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">性別</label>
                  <select
                    value={newUserForm.gender}
                    onChange={(e) => setNewUserForm({ ...newUserForm, gender: e.target.value as 'female' | 'male' })}
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
                    value={newUserForm.age}
                    onChange={(e) => setNewUserForm({ ...newUserForm, age: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">身長 (cm)</label>
                  <input
                    type="number"
                    value={newUserForm.height}
                    onChange={(e) => setNewUserForm({ ...newUserForm, height: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">現在体重 (kg)</label>
                  <input
                    type="number"
                    value={newUserForm.weight}
                    onChange={(e) => setNewUserForm({ ...newUserForm, weight: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">目標体重 (kg)</label>
                  <input
                    type="number"
                    value={newUserForm.targetWeight}
                    onChange={(e) => setNewUserForm({ ...newUserForm, targetWeight: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">目標期間</label>
                  <select
                    value={newUserForm.targetMonths}
                    onChange={(e) => setNewUserForm({ ...newUserForm, targetMonths: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    <option value={1}>1ヶ月</option>
                    <option value={2}>2ヶ月</option>
                    <option value={3}>3ヶ月</option>
                    <option value={4}>4ヶ月</option>
                    <option value={5}>5ヶ月</option>
                    <option value={6}>6ヶ月</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleAddNewUser}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all"
              >
                新規登録してカルテ作成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🧬 遺伝子検査データ設定 モーダル */}
      {isGeneModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Dna className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="font-black text-slate-800 text-base">{currentUser.name} 様 遺伝子検査設定</h3>
                  <p className="text-[10px] text-slate-500">chatGENEレポート項目に合わせたリスク登録</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsGeneModalOpen(false)} className="p-1 rounded-full text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">主たる肥満・代謝遺伝子タイプ</label>
                <select
                  value={geneForm.type}
                  onChange={(e) => setGeneForm({ ...geneForm, type: e.target.value as GeneType })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-slate-50"
                >
                  <option value="lipid_risk">① 脂質吸収過多・皮下脂肪タイプ (F制限18%)</option>
                  <option value="carb_risk">② 糖質内臓脂肪・インスリンリスクタイプ (C制限40%)</option>
                  <option value="protein_risk">③ 蛋白分解・筋肉分解リスクタイプ (P強化35%)</option>
                  <option value="micronutrient">④ 微量栄養素（葉酸・鉄・ビタミンC）吸収低下タイプ</option>
                  <option value="exercise_resistant">⑤ 運動減量抵抗性タイプ (食事9割徹底)</option>
                </select>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl space-y-2">
                <span className="font-black text-amber-900 block border-b border-amber-200 pb-1">
                  chatGENE 栄養素・代謝リスクチェック項目
                </span>

                <label className="flex items-center gap-2 text-slate-700 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={geneForm.folicAcidLow}
                    onChange={(e) => setGeneForm({ ...geneForm, folicAcidLow: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  <span>葉酸（ビタミンB9）濃度「低」</span>
                </label>

                <label className="flex items-center gap-2 text-slate-700 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={geneForm.ironLow}
                    onChange={(e) => setGeneForm({ ...geneForm, ironLow: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  <span>鉄分（フェリチン）濃度「低」</span>
                </label>

                <label className="flex items-center gap-2 text-slate-700 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={geneForm.vitaminCLow}
                    onChange={(e) => setGeneForm({ ...geneForm, vitaminCLow: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  <span>ビタミンC濃度「低」</span>
                </label>

                <label className="flex items-center gap-2 text-slate-700 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={geneForm.leucineLow}
                    onChange={(e) => setGeneForm({ ...geneForm, leucineLow: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  <span>ロイシン（BCAA）濃度「低」</span>
                </label>

                <label className="flex items-center gap-2 text-slate-700 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={geneForm.exerciseEffectLow}
                    onChange={(e) => setGeneForm({ ...geneForm, exerciseEffectLow: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  <span>運動による減量効果「低」</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsGeneModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSaveGeneProfile}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold shadow-sm"
              >
                設定保存＆PFC最適化
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 数値再計算モーダル */}
      {isCalcModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-slate-800 text-base">個別計算（HB式＋PAL）＆目標設定</h3>
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
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">身体活動 (PAL)</label>
                  <select
                    value={calcForm.pal}
                    onChange={(e) => setCalcForm({ ...calcForm, pal: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    <option value={1.2}>低い (1.20)</option>
                    <option value={1.45}>やや低い/デスクワーク (1.45)</option>
                    <option value={1.75}>普通/適度な運動 (1.75)</option>
                    <option value={2.0}>高い/立ち仕事 (2.00)</option>
                  </select>
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
                  <label className="text-[11px] font-bold text-emerald-900 block mb-1">目標期間</label>
                  <select
                    value={calcForm.targetMonths}
                    onChange={(e) => setCalcForm({ ...calcForm, targetMonths: Number(e.target.value) })}
                    className="w-full p-2.5 bg-white border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700"
                  >
                    <option value={1}>1ヶ月</option>
                    <option value={2}>2ヶ月</option>
                    <option value={3}>3ヶ月</option>
                    <option value={4}>4ヶ月</option>
                    <option value={5}>5ヶ月</option>
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
                計算して設定更新
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📸 InBody AI OCRスキャン モーダル */}
      {isInbodyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Scan className="w-6 h-6 text-indigo-600" />
                <div>
                  <h3 className="font-black text-slate-800 text-base">InBody測定結果 OCR読み込み</h3>
                  <p className="text-[10px] text-slate-500">写真を撮るだけで基礎代謝・骨格筋量・体脂肪率を自動登録</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsInbodyModalOpen(false)} className="p-1 rounded-full text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="file"
                accept="image/*"
                ref={inbodyFileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setInbodyImage(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
                className="hidden"
              />

              <div
                onClick={() => inbodyFileInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-200 bg-indigo-50/30 rounded-2xl p-6 text-center cursor-pointer hover:border-indigo-500 min-h-[160px] flex items-center justify-center transition-all"
              >
                {inbodyImage ? (
                  <img src={inbodyImage} alt="InBodyシート" className="max-h-44 object-contain rounded-lg shadow" />
                ) : (
                  <div>
                    <Upload className="w-9 h-9 text-indigo-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">InBodyの測定結果シート画像を選択・撮影</p>
                    <p className="text-[10px] text-slate-400 mt-1">※基礎代謝量・体重・骨格筋量・体脂肪率を自動解析します</p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={runInbodyOcrScan}
                disabled={isScanningInbody || !inbodyImage}
                className={`w-full py-3.5 rounded-2xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
                  inbodyImage ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-200 text-slate-400'
                }`}
              >
                <Scan className="w-4 h-4" />
                <span>{isScanningInbody ? 'InBodyシートをAIスキャン中...' : '画像をAIスキャンして自動抽出'}</span>
              </button>
            </div>

            {scannedInbodyData && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-indigo-200/60 pb-2">
                  <span className="text-xs font-black text-indigo-900 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" /> OCRスキャン成功
                  </span>
                  <span className="text-[10px] text-indigo-600 font-bold">{scannedInbodyData.date} 測定</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                    <span className="text-[10px] text-slate-500 block">体重</span>
                    <strong className="text-base text-slate-800">{scannedInbodyData.weight} kg</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                    <span className="text-[10px] text-slate-500 block">骨格筋量</span>
                    <strong className="text-base text-indigo-600">{scannedInbodyData.muscleMass} kg</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                    <span className="text-[10px] text-slate-500 block">体脂肪率</span>
                    <strong className="text-base text-amber-600">{scannedInbodyData.bodyFatRatio} %</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-indigo-100">
                    <span className="text-[10px] text-slate-500 block">実測 基礎代謝 (BMR)</span>
                    <strong className="text-base text-rose-600">{scannedInbodyData.bmr} kcal</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={saveInbodyToProfile}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>この実測データをカルテに更新保存する</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI解析モーダル */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-slate-800 text-lg">LINE食事投稿 AI解析＆アドバイス自動生成</h3>
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
                  activeTab === 'image' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>LINEスクショ/写真投稿</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('text')}
                className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 ${
                  activeTab === 'text' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'
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
                  className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center cursor-pointer hover:border-emerald-500 min-h-[140px] flex items-center justify-center bg-slate-50/50"
                >
                  {selectedImage ? (
                    <img src={selectedImage} alt="選択画像" className="max-h-36 object-contain rounded-lg shadow" />
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-700">クリックしてLINEの写真・スクショを選択</p>
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

            <button
              type="button"
              onClick={runAiAnalysis}
              disabled={isAnalyzing}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{isAnalyzing ? 'AI解析＆文章作成中...' : '食事を解析してLINEアドバイスを作成'}</span>
            </button>

            {analysisResult && generatedAdvice && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md">
                      解析結果: {analysisResult.calories} kcal
                    </span>
                    <div className="text-[11px] font-bold space-x-2 text-slate-600">
                      <span>P:{analysisResult.p}g</span>
                      <span>F:{analysisResult.f}g</span>
                      <span>C:{analysisResult.c}g</span>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-slate-800">{analysisResult.name}</p>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                      <MessageSquare className="w-4 h-4 text-emerald-600" /> 遺伝子＆PFC最適化 LINE文案
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(generatedAdvice, '生成文案をコピーしました')}
                      className="text-[10px] font-bold bg-white text-emerald-700 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm"
                    >
                      <Copy className="w-3 h-3" /> コピー
                    </button>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-wrap bg-white p-3 rounded-xl border border-emerald-100">
                    {generatedAdvice}
                  </p>

                  <button
                    type="button"
                    onClick={saveAnalyzedMeal}
                    className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all"
                  >
                    食事ログに追加してカルテに保存
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* フッター */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        サクラ整骨院 PFC Balance Manager (Staff Edition)
      </footer>
    </div>
  );
}
