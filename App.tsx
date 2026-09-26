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
  History,
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
  recipe?: string;
}

interface InBodyRecord {
  date: string;
  weight: number;
  muscleMass: number;
  bodyFatRatio: number;
  bmr: number;
}

interface UserProfile {
  id: string;
  name: string;
  age: number;
  gender: 'female' | 'male';
  height: number;
  weight: number;
  muscleMass: number; // 骨格筋量 (kg)
  bodyFatRatio: number; // 体脂肪率 (%)
  targetWeight: number;
  targetMonths: number;
  pal: number;
  metabolismType: 'lipid' | 'carb' | 'muscle';
  metabolismTypeName: string;
  bmr: number; // 基礎代謝量 (InBody優先)
  isInbodyMeasured: boolean; // InBody実測値かどうかのフラグ
  tdee: number;
  targetCalories: number;
  targetP: number;
  targetF: number;
  targetC: number;
  todayMeals: MealItem[];
  inbodyHistory: InBodyRecord[];
  adviceMessage: string;
}

// ハリス・ベネディクト改訂式またはInBody実測BMRに基づくロジカル目標設定
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
  metabolismType: 'lipid' | 'carb' | 'muscle',
  inbodyBmr?: number
) => {
  // 1. 基礎代謝量（InBody実測値がある場合はそれを優先、なければハリス・ベネディクト式）
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
    targetCalories = bmr; // BMR最低保障ガード
  }

  let pRatio = 0.25, fRatio = 0.25, cRatio = 0.5;
  if (metabolismType === 'lipid') {
    pRatio = 0.3; fRatio = 0.18; cRatio = 0.52;
  } else if (metabolismType === 'carb') {
    pRatio = 0.3; fRatio = 0.3; cRatio = 0.4;
  } else {
    pRatio = 0.35; fRatio = 0.25; cRatio = 0.4;
  }

  // 筋肉量が多い場合（体脂肪率低め）はタンパク質比率を少し引き上げ
  if (muscleMass > 0 && bodyFatRatio > 0 && bodyFatRatio < 22) {
    pRatio += 0.03;
    fRatio -= 0.03;
  }

  const targetP = Math.round((targetCalories * pRatio) / 4);
  const targetF = Math.round((targetCalories * fRatio) / 9);
  const targetC = Math.round((targetCalories * cRatio) / 4);

  return { targetCalories, targetP, targetF, targetC, bmr, tdee, isInbody };
};

// PFC全適正化判定 連動型 LINEアドバイス作成ロジック
const generateLineAdvice = (
  user: UserProfile,
  newMeal: MealItem
): string => {
  const futureTotalCal = user.todayMeals.reduce((acc, m) => acc + m.calories, 0) + newMeal.calories;
  const futureTotalP = user.todayMeals.reduce((acc, m) => acc + m.p, 0) + newMeal.p;
  const futureTotalF = user.todayMeals.reduce((acc, m) => acc + m.f, 0) + newMeal.f;
  const futureTotalC = user.todayMeals.reduce((acc, m) => acc + m.c, 0) + newMeal.c;

  const pRatio = futureTotalP / user.targetP;
  const fRatio = futureTotalF / user.targetF;
  const cRatio = futureTotalC / user.targetC;

  const isPPerfect = pRatio >= 0.85 && pRatio <= 1.15;
  const isFPerfect = fRatio >= 0.70 && fRatio <= 1.10;
  const isCPerfect = cRatio >= 0.70 && cRatio <= 1.10;

  const isPFCAllPerfect = isPPerfect && isFPerfect && isCPerfect;
  const bmrSourceTag = user.isInbodyMeasured ? '（InBody実測基準）' : '（推定基準）';

  if (futureTotalCal > user.targetCalories + 150) {
    const calOver = futureTotalCal - user.targetCalories;
    return `【サクラ整骨院 栄養フィードバック】\n${user.name}様、ご投稿ありがとうございます！しっかり記録してくださり素晴らしいです！\n\n本日の合計は【${futureTotalCal} kcal】となり、目標より【+${calOver} kcal】高めのペースとなっております。\nですが、1日で脂肪が増えるわけではありませんのでご安心ください！脂肪定着までに約48時間のタイムラグがあります。\n\n明日はお水や白湯をしっかり摂り、脂質（F）と炭水化物（C）を控えめにしたクリーンな和食でリセットしていきましょう！`;
  }

  if (futureTotalCal < user.bmr) {
    return `【サクラ整骨院 栄養フィードバック】\n${user.name}様、お忙しい中記録してくださり感謝いたします！\n\n1点大切なアドバイスです。本日の合計が【${futureTotalCal} kcal】となっており、${user.name}様の基礎代謝量${bmrSourceTag}【${user.bmr} kcal】を下回っています。\n食べなさすぎると体が「省エネモード（停滞期）」に入り、脂肪が燃えにくくなってしまいます。\n\n今夜または明日の朝、ゆで卵やプロテイン、ギリシャヨーグルトなどを少し足して、基礎代謝分はしっかり補給してあげてくださいね！`;
  }

  if (isPFCAllPerfect) {
    return `【サクラ整骨院 栄養フィードバック】\n${user.name}様、お食事の投稿ありがとうございます！素晴らしい成果です！\n\n本日のPFCバランスは完璧です！\n・P（タンパク質）: ${futureTotalP}g（目標: ${user.targetP}g）\n・F（脂質）: ${futureTotalF}g（目標: ${user.targetF}g）\n・C（炭水化物）: ${futureTotalC}g（目標: ${user.targetC}g）\n\n基礎代謝${bmrSourceTag}【${user.bmr} kcal】を安全にクリアしながら、体脂肪だけを効率よく燃焼できる状態が作れています。明日もこの調子でいきましょう！`;
  }

  if (pRatio < 0.85) {
    const pGap = Math.round(user.targetP - futureTotalP);
    return `【サクラ整骨院 栄養フィードバック】\n${user.name}様、本日も記録ありがとうございます！カロリーコントロールは非常に良好です！\n\nPFCバランスの精度をさらに上げるポイントとして、本日はタンパク質（P）があと【約${pGap}g】不足気味です。\n（本日: P ${futureTotalP}g / 目標: ${user.targetP}g）\n\n骨盤矯正やEMSでのボディメイク効果を高めるため、明日は朝食に卵を足したりプロテインを取り入れてみてくださいね！`;
  }

  return `【サクラ整骨院 栄養フィードバック】\n${user.name}様、お写真の投稿ありがとうございます！\n\n本日の合計は【${futureTotalCal} kcal】（目標: ${user.targetCalories} kcal）と、基礎代謝${bmrSourceTag}【${user.bmr} kcal】をクリアした適正範囲内で推移しています。\n（P: ${futureTotalP}g / F: ${futureTotalF}g / C: ${futureTotalC}g）\n\nこの調子で水分補給も忘れずに取り組んでいきましょう！`;
};

// 推奨フルコース献立自動生成
const generateRecommendedMenu = (user: UserProfile): MealItem[] => {
  const { targetCalories, metabolismType } = user;
  const breakfastCal = Math.round(targetCalories * 0.3);
  const lunchCal = Math.round(targetCalories * 0.4);
  const dinnerCal = Math.round(targetCalories * 0.3);

  if (metabolismType === 'lipid') {
    return [
      {
        id: `rec-b-${Date.now()}`,
        category: '朝食',
        name: '【高タンパク和朝食】鮭の塩焼き・玄米ご飯・なめこ味噌汁・ノンオイルツナ和え',
        calories: breakfastCal,
        p: Math.round((breakfastCal * 0.3) / 4),
        f: Math.round((breakfastCal * 0.18) / 9),
        c: Math.round((breakfastCal * 0.52) / 4),
        recipe: '①鮭はクッキングシートを敷いたフライパンで油を使わずに焼く。②ツナ水煮缶の水気を切り、ポン酢と小ネギで和える。③温かい玄米ご飯（中盛）となめこの味噌汁を添える。',
      },
      {
        id: `rec-l-${Date.now()}`,
        category: '昼食',
        name: '【低脂質クリーンランチ】蒸し鶏胸肉の彩りボウル・もち麦ご飯',
        calories: lunchCal,
        p: Math.round((lunchCal * 0.32) / 4),
        f: Math.round((lunchCal * 0.16) / 9),
        c: Math.round((lunchCal * 0.52) / 4),
        recipe: '①鶏胸肉（皮なし）に酒を振りレンジで3分加熱。②もち麦ご飯の上にレタス・ブロッコリー・蒸し鶏をのせる。③ノンオイル和風ドレッシングをかける。',
      },
      {
        id: `rec-d-${Date.now()}`,
        category: '夕食',
        name: '【夜の代謝キープ食】タラと大根の和風寄せ鍋・小海老の酢の物',
        calories: dinnerCal,
        p: Math.round((dinnerCal * 0.3) / 4),
        f: Math.round((dinnerCal * 0.18) / 9),
        c: Math.round((dinnerCal * 0.52) / 4),
        recipe: '①和風出汁に大根・豆腐・キノコ・タラを入れて煮込む。②ボイル小海老ときゅうりを三杯酢で和える。③具材を中心にしっかり食べる。',
      },
    ];
  } else if (metabolismType === 'carb') {
    return [
      {
        id: `rec-b-${Date.now()}`,
        category: '朝食',
        name: '【低GIエナジー】プロテインオートミールボウル・アーモンド添え',
        calories: breakfastCal,
        p: Math.round((breakfastCal * 0.3) / 4),
        f: Math.round((breakfastCal * 0.28) / 9),
        c: Math.round((breakfastCal * 0.42) / 4),
        recipe: '①オートミール(30g)に水100mlを加えレンジで1.5分加熱。②プロテインを混ぜる。③ミックスベリーと素焼きアーモンド5粒をのせる。',
      },
      {
        id: `rec-l-${Date.now()}`,
        category: '昼食',
        name: '【血糖値安定ランチ】牛赤身ステーキ（150g）・さつまいも・サラダ',
        calories: lunchCal,
        p: Math.round((lunchCal * 0.3) / 4),
        f: Math.round((lunchCal * 0.3) / 9),
        c: Math.round((lunchCal * 0.4) / 4),
        recipe: '①牛モモ赤身肉を極少量のオリーブオイルで焼き、塩コショウで調味。②蒸しさつまいも(100g)を主食代わりに添える。③サラダにはレモン汁をかける。',
      },
      {
        id: `rec-d-${Date.now()}`,
        category: '夕食',
        name: '【満足糖質オフ食】サバの生姜煮・枝豆豆腐・十六穀米（少なめ）',
        calories: dinnerCal,
        p: Math.round((dinnerCal * 0.3) / 4),
        f: Math.round((dinnerCal * 0.3) / 9),
        c: Math.round((dinnerCal * 0.4) / 4),
        recipe: '①サバを醤油・みりん少々・生姜で煮付ける（ラカント推奨）。②枝豆豆腐を添える。③十六穀米は小盛り(100g)にする。',
      },
    ];
  } else {
    return [
      {
        id: `rec-b-${Date.now()}`,
        category: '朝食',
        name: '【筋合成モーニング】目玉焼き2個・全粒粉トースト・ギリシャヨーグルト',
        calories: breakfastCal,
        p: Math.round((breakfastCal * 0.32) / 4),
        f: Math.round((breakfastCal * 0.23) / 9),
        c: Math.round((breakfastCal * 0.45) / 4),
        recipe: '①ノンオイルで目玉焼き2個を作る。②全粒粉食パンをトースト。③無糖ギリシャヨーグルトを添える。',
      },
      {
        id: `rec-l-${Date.now()}`,
        category: '昼食',
        name: '【マッスルパワーランチ】鶏もも肉（皮なし）の照り焼き定食・豚汁',
        calories: lunchCal,
        p: Math.round((lunchCal * 0.35) / 4),
        f: Math.round((lunchCal * 0.25) / 9),
        c: Math.round((lunchCal * 0.4) / 4),
        recipe: '①皮なし鶏もも肉を照り焼きにする。②根菜と豚赤身肉の具だくさん豚汁を作る。③白米は普通盛り(150g)を摂る。',
      },
      {
        id: `rec-d-${Date.now()}`,
        category: '夕食',
        name: '【高タンパクディナー】刺身盛り合わせ・納豆・冷奴・野菜スープ',
        calories: dinnerCal,
        p: Math.round((dinnerCal * 0.35) / 4),
        f: Math.round((dinnerCal * 0.25) / 9),
        c: Math.round((dinnerCal * 0.4) / 4),
        recipe: '①マグロ赤身中心の刺身を盛る。②冷奴と納豆を用意。③キャベツと玉ねぎのノンオイルスープを添える。',
      },
    ];
  }
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
    metabolismType: 'lipid',
    metabolismTypeName: '脂質代謝低下タイプ',
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
    inbodyHistory: [
      { date: '2026-08-01', weight: 59.5, muscleMass: 20.1, bodyFatRatio: 29.2, bmr: 1245 },
    ],
    adviceMessage: '【サクラ整骨院 栄養フィードバック】\n佐藤佳代様、本日の食事記録ありがとうございます！基礎代謝（1,260 kcal）をしっかり超えつつ安全圏内で推移しています。',
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
    metabolismType: 'carb',
    metabolismTypeName: '糖質吸収過多タイプ',
    bmr: 1580,
    isInbodyMeasured: false,
    tdee: 2291,
    targetCalories: 1731,
    targetP: 130,
    targetF: 58,
    targetC: 173,
    todayMeals: [],
    inbodyHistory: [],
    adviceMessage: '【サクラ整骨院 栄養フィードバック】\n田中健太郎様、基礎代謝1,580 kcalを割り込まないよう、タンパク質を中心に補給を行ってください！',
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
  const [generatedAdvice, setGeneratedAdvice] = useState<string>('');

  // InBody OCRモーダルState
  const [isInbodyModalOpen, setIsInbodyModalOpen] = useState(false);
  const [inbodyImage, setInbodyImage] = useState<string | null>(null);
  const [isScanningInbody, setIsScanningInbody] = useState(false);
  const [scannedInbodyData, setScannedInbodyData] = useState<InBodyRecord | null>(null);

  const [isMenuSuggestionModalOpen, setIsMenuSuggestionModalOpen] = useState(false);
  const [suggestedMenu, setSuggestedMenu] = useState<MealItem[]>([]);

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

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newUserId = e.target.value;
    setSelectedUserId(newUserId);
    setCalcForm(users[newUserId]);
    showToast(`「${users[newUserId].name} 様」に切り替えました`);
  };

  // InBody画像OCRスキャン実行
  const runInbodyOcrScan = () => {
    if (!inbodyImage) return alert('InBodyの測定結果シート画像を選択してください');

    setIsScanningInbody(true);
    setScannedInbodyData(null);

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
      showToast('InBodyシートの数値スキャン（OCR）が完了しました！');
    }, 1500);
  };

  // InBodyスキャン結果をカルテに記憶保存
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
      currentUser.metabolismType,
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
    setInbodyImage(null);
    setScannedInbodyData(null);
    showToast('InBody測定データをカルテに更新保存しました！');
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
      calcForm.metabolismType,
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
    showToast('個別計算数値の更新が完了しました！');
  };

  const handleOpenMenuSuggestion = () => {
    const menu = generateRecommendedMenu(currentUser);
    setSuggestedMenu(menu);
    setIsMenuSuggestionModalOpen(true);
  };

  const handleApplySuggestedMenu = () => {
    setUsers((prev) => ({
      ...prev,
      [selectedUserId]: {
        ...prev[selectedUserId],
        todayMeals: [...suggestedMenu],
      },
    }));
    setIsMenuSuggestionModalOpen(false);
    showToast('本日の推奨献立（レシピ付き）を一括登録しました！');
  };

  const runAiAnalysis = () => {
    if (activeTab === 'image' && !selectedImage) return alert('画像を選択してください');
    if (activeTab === 'text' && !pastedText.trim()) return alert('文章を入力してください');

    setIsAnalyzing(true);
    setAnalysisResult(null);

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

      const advice = generateLineAdvice(currentUser, parsedMeal);
      setGeneratedAdvice(advice);

      showToast('AI解析 & PFC全適正化LINEアドバイス作成が完了しました！');
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
    setSelectedImage(null);
    setPastedText('');
    setAnalysisResult(null);
    setGeneratedAdvice('');
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
              <h1 className="text-base font-black text-slate-800 leading-tight">サクラ整骨院 InBody連動PFC管理（スタッフ専用）</h1>
              <p className="text-[10px] text-slate-500 font-medium">InBody OCR自動スキャン ＋ 個体差最適化</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
        </div>
      </header>

      {/* メイン */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
        {/* カルテダッシュボード */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-0.5 rounded-full">
                  {currentUser.metabolismTypeName}
                </span>
                {currentUser.isInbodyMeasured && (
                  <span className="text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-0.5 rounded-full flex items-center gap-1">
                    <Database className="w-3 h-3 text-indigo-400" /> InBody実測値連動中
                  </span>
                )}
                <span className="text-xs text-slate-400">{currentUser.age}歳 / {currentUser.gender === 'female' ? '女性' : '男性'} / {currentUser.height}cm</span>
              </div>
              <h2 className="text-2xl font-black text-white">{currentUser.name} 様の個別精度カルテ</h2>
            </div>

            {/* ボタン群 */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsInbodyModalOpen(true)}
                className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
              >
                <Scan className="w-4 h-4 text-indigo-200" />
                <span>📸 InBodyシート画像読み込み</span>
              </button>

              <button
                type="button"
                onClick={handleOpenMenuSuggestion}
                className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-black text-xs shadow-md transition-all flex items-center gap-2"
              >
                <ChefHat className="w-4 h-4 text-slate-900" />
                <span>🎯 迷ったらコレ！本日の推奨献立</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCalcForm(currentUser);
                  setIsCalcModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all flex items-center gap-2 border border-slate-700"
              >
                <Calculator className="w-4 h-4 text-emerald-400" />
                <span>数値再計算</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAiModalOpen(true)}
                className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all flex items-center gap-2"
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
              <h3 className="font-bold text-slate-800 text-base">本日の摂取カロリー・PFC全適正化進捗状況</h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">※InBody実測骨格筋量・体脂肪率を反映済み</span>
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

        {/* 本日の食事ログ */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Utensils className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-800 text-base">{currentUser.name} 様の本日登録データ</h3>
            </div>
            <span className="text-xs text-slate-400 font-bold">{currentUser.todayMeals.length} 件記録</span>
          </div>

          <div className="space-y-3">
            {currentUser.todayMeals.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">本日の食事ログはまだありません。「🎯 迷ったらコレ！」または「AI食事解析」から登録してください。</p>
            ) : (
              currentUser.todayMeals.map((meal) => (
                <div
                  key={meal.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-lg shrink-0">
                        {meal.category}
                      </span>
                      <span className="text-xs font-black text-slate-800">{meal.name}</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-medium text-slate-600 justify-between sm:justify-end">
                      <div className="flex items-center gap-3">
                        <span className="font-black text-slate-800">{meal.calories} kcal</span>
                        <div className="flex gap-2 text-[11px]">
                          <span className="text-indigo-600 font-bold">P:{meal.p}g</span>
                          <span className="text-amber-600 font-bold">F:{meal.f}g</span>
                          <span className="text-emerald-600 font-bold">C:{meal.c}g</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteMeal(meal.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {meal.recipe && (
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-xs text-slate-600 space-y-1">
                      <span className="font-bold text-emerald-700 flex items-center gap-1 text-[11px]">
                        <BookOpen className="w-3.5 h-3.5" /> 調理手順・ポイント
                      </span>
                      <p className="text-[11px] leading-relaxed text-slate-600">{meal.recipe}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 自動生成 LINEアドバイス表示エリア */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              <h3 className="font-bold text-base">PFC全適正化判定 LINEフィードバック文章</h3>
            </div>
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">InBody精度連動</span>
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

      {/* 🎯 推奨献立モーダル */}
      {isMenuSuggestionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ChefHat className="w-6 h-6 text-amber-500" />
                <div>
                  <h3 className="font-black text-slate-800 text-base">{currentUser.name} 様 専用推奨献立</h3>
                  <p className="text-[10px] text-slate-500">個別目標 ({currentUser.targetCalories} kcal) & 代謝タイプ自動最適化</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsMenuSuggestionModalOpen(false)} className="p-1 rounded-full text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {suggestedMenu.map((item) => (
                <div key={item.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md">
                      {item.category}
                    </span>
                    <span className="text-xs font-black text-slate-800">{item.calories} kcal</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 leading-snug">{item.name}</p>

                  <div className="flex gap-3 text-[11px] pt-1 text-slate-500 font-medium border-b border-slate-200/60 pb-2">
                    <span>P: <strong className="text-indigo-600">{item.p}g</strong></span>
                    <span>F: <strong className="text-amber-600">{item.f}g</strong></span>
                    <span>C: <strong className="text-emerald-600">{item.c}g</strong></span>
                  </div>

                  {item.recipe && (
                    <div className="pt-1">
                      <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1 mb-1">
                        <BookOpen className="w-3.5 h-3.5" /> 🍳 簡単作り方・ポイント
                      </span>
                      <p className="text-[11px] text-slate-600 leading-relaxed bg-white p-2.5 rounded-xl border border-slate-200/80">
                        {item.recipe}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsMenuSuggestionModalOpen(false)}
                className="flex-1 py-3 rounded-2xl border border-slate-300 text-xs font-bold text-slate-600"
              >
                閉じる
              </button>
              <button
                type="button"
                onClick={handleApplySuggestedMenu}
                className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5"
              >
                <CheckSquare className="w-4 h-4 text-emerald-200" />
                <span>この献立を本日のログに一括登録</span>
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
                <h3 className="font-black text-slate-800 text-base">個別計算＆目標設定</h3>
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

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">骨格筋量 (kg)</label>
                  <input
                    type="number"
                    value={calcForm.muscleMass || ''}
                    onChange={(e) => setCalcForm({ ...calcForm, muscleMass: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">体脂肪率 (%)</label>
                  <input
                    type="number"
                    value={calcForm.bodyFatRatio || ''}
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
                  <label className="text-[11px] font-bold text-emerald-900 block mb-1">目標期間</label>
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
                計算して設定更新
              </button>
            </div>
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
              <span>{isAnalyzing ? 'AI解析＆PFC全適正化文章作成中...' : '食事を解析してLINEアドバイスを作成'}</span>
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
                      <MessageSquare className="w-4 h-4 text-emerald-600" /> PFC全適正化 自動作成LINE文案
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
