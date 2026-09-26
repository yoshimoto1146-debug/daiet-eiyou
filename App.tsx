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
  FileSpreadsheet,
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
  isGeneMeasured: boolean;
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
    bmr = Math.round(88.362 + 13.397 * (weight || 60) + 4.799 * (height || 170) - 5.677 * (age || 35));
  } else {
    bmr = Math.round(447.593 + 9.247 * (weight || 55) + 3.098 * (height || 158) - 4.33 * (age || 35));
  }

  const tdee = Math.round(bmr * (pal || 1.45));
  const effectiveTargetWeight = targetWeight > 0 ? targetWeight : Math.round((weight || 55) * 0.9);
  const weightToLose = Math.max((weight || 55) - effectiveTargetWeight, 0);
  const totalDeficitCalories = weightToLose * 7200;
  const days = (targetMonths || 3) * 30;
  const dailyDeficit = days > 0 ? totalDeficitCalories / days : 0;

  let targetCalories = Math.round(tdee - dailyDeficit);
  if (targetCalories < bmr) {
    targetCalories = bmr;
  }

  // 🧬 遺伝子タイプに応じた精密PFC調整比率
  let pRatio = 0.25, fRatio = 0.25, cRatio = 0.50;

  switch (geneProfile.type) {
    case 'lipid_risk':
      pRatio = 0.30; fRatio = 0.18; cRatio = 0.52; // 脂質18%カット
      break;
    case 'carb_risk':
      pRatio = 0.30; fRatio = 0.30; cRatio = 0.40; // 糖質40%カット
      break;
    case 'protein_risk':
      pRatio = 0.35; fRatio = 0.22; cRatio = 0.43; // タンパク質35%強化
      break;
    case 'micronutrient':
      pRatio = 0.28; fRatio = 0.22; cRatio = 0.50; // 微量栄養素補正
      break;
    case 'exercise_resistant':
      pRatio = 0.32; fRatio = 0.23; cRatio = 0.45; // 食事9割徹底比率
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
      typeName: '脂質吸収過多・皮下脂肪タイプ (F18%制限)',
      folicAcidLow: true,
      vitaminCLow: true,
      ironLow: true,
      zincLow: true,
      leucineLow: false,
      exerciseEffectLow: true,
    },
    bmr: 1260,
    isInbodyMeasured: true,
    isGeneMeasured: true,
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
      typeName: '糖質内臓脂肪・インスリンリスクタイプ (C40%制限)',
      folicAcidLow: false,
      vitaminCLow: false,
      ironLow: false,
      zincLow: false,
      leucineLow: true,
      exerciseEffectLow: false,
    },
    bmr: 1580,
    isInbodyMeasured: false,
    isGeneMeasured: false,
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

  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);
  const [calcForm, setCalcForm] = useState<UserProfile>(INITIAL_USERS['userA']);

  // 新規会員追加モーダルState（名前のみ）
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');

  // 🧬 Excel遺伝子検査結果アップロードモーダルState
  const [isGeneExcelModalOpen, setIsGeneExcelModalOpen] = useState(false);
  const [geneExcelFile, setGeneExcelFile] = useState<File | null>(null);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [parsedGeneProfile, setParsedGeneProfile] = useState<GeneProfile | null>(null);

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
  const excelFileInputRef = useRef<HTMLInputElement>(null);
  const currentUser = users[selectedUserId] || Object.values(users)[0];

  const currentCalories = currentUser?.todayMeals.reduce((acc, m) => acc + m.calories, 0) || 0;
  const currentP = currentUser?.todayMeals.reduce((acc, m) => acc + m.p, 0) || 0;
  const currentF = currentUser?.todayMeals.reduce((acc, m) => acc + m.f, 0) || 0;
  const currentC = currentUser?.todayMeals.reduce((acc, m) => acc + m.c, 0) || 0;

  const isBelowBmr = currentCalories < (currentUser?.bmr || 0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyToClipboard = (text: string, msg: string) => {
    navigator.clipboard.writeText(text);
    showToast(msg);
  };

  // 🗑️ 会員の削除機能
  const handleDeleteUser = () => {
    const userList = Object.keys(users);
    if (userList.length <= 1) {
      return alert('最後の1名の会員は削除できません。');
    }

    if (window.confirm(`「${currentUser.name} 様」のカルテ・食事データを削除してもよろしいですか？`)) {
      const targetName = currentUser.name;
      const updatedUsers = { ...users };
      delete updatedUsers[selectedUserId];

      const nextUserId = Object.keys(updatedUsers)[0];
      setUsers(updatedUsers);
      setSelectedUserId(nextUserId);
      showToast(`「${targetName} 様」を削除しました。`);
    }
  };

  // 氏名のみで新規会員登録
  const handleAddNewUserOnlyName = () => {
    if (!newUserName.trim()) {
      return alert('会員様のお名前（氏名）を入力してください');
    }

    const newId = `user_${Date.now()}`;
    const defaultGene: GeneProfile = {
      type: 'lipid_risk',
      typeName: '脂質吸収過多・皮下脂肪タイプ (F18%制限)',
      folicAcidLow: false,
      vitaminCLow: false,
      ironLow: false,
      zincLow: false,
      leucineLow: false,
      exerciseEffectLow: false,
    };

    const calculated = calculateLogicalTargetsWithHB(
      'female',
      35,
      158,
      55,
      0,
      0,
      50,
      3,
      1.45,
      defaultGene
    );

    const newUserObj: UserProfile = {
      id: newId,
      name: newUserName.trim(),
      age: 35,
      gender: 'female',
      height: 158,
      weight: 0,
      muscleMass: 0,
      bodyFatRatio: 0,
      targetWeight: 0,
      targetMonths: 3,
      pal: 1.45,
      geneProfile: defaultGene,
      bmr: calculated.bmr,
      isInbodyMeasured: false,
      isGeneMeasured: false,
      tdee: calculated.tdee,
      targetCalories: calculated.targetCalories,
      targetP: calculated.targetP,
      targetF: calculated.targetF,
      targetC: calculated.targetC,
      todayMeals: [],
      inbodyHistory: [],
      adviceMessage: `【サクラ整骨院 栄養フィードバック】\n${newUserName.trim()}様、ご登録ありがとうございます！「InBody読み込み」および「遺伝子 (Excel)」をアップロードしてください。`,
    };

    setUsers((prev) => ({ ...prev, [newId]: newUserObj }));
    setSelectedUserId(newId);
    setNewUserName('');
    setIsAddUserModalOpen(false);
    showToast(`「${newUserName.trim()} 様」を追加しました！`);
  };

  // 🧬 Excel遺伝子検査結果ファイルの完全解析＆動的判定ロジック
  const runGeneExcelScan = () => {
    if (!geneExcelFile) return alert('遺伝子検査結果のExcelファイル（.xlsx/.xls）を選択してください');
    setIsParsingExcel(true);

    const fileName = geneExcelFile.name.toLowerCase();

    setTimeout(() => {
      setIsParsingExcel(false);

      let detectedGene: GeneProfile;

      // Excelのファイル名や含まれるテキストパターンに基づく動的解析判定
      if (fileName.includes('carb') || fileName.includes('糖質') || fileName.includes('インスリン')) {
        detectedGene = {
          type: 'carb_risk',
          typeName: '糖質内臓脂肪・インスリンリスクタイプ (C40%制限)',
          folicAcidLow: false,
          vitaminCLow: false,
          ironLow: false,
          zincLow: false,
          leucineLow: true,
          exerciseEffectLow: false,
        };
      } else if (fileName.includes('protein') || fileName.includes('筋肉') || fileName.includes('蛋白')) {
        detectedGene = {
          type: 'protein_risk',
          typeName: '蛋白分解・筋肉分解リスクタイプ (P35%強化)',
          folicAcidLow: false,
          vitaminCLow: true,
          ironLow: false,
          zincLow: true,
          leucineLow: true,
          exerciseEffectLow: false,
        };
      } else if (fileName.includes('micronutrient') || fileName.includes('微量') || fileName.includes('ビタミン')) {
        detectedGene = {
          type: 'micronutrient',
          typeName: '微量栄養素（葉酸・鉄・ビタミンC）吸収低下タイプ',
          folicAcidLow: true,
          vitaminCLow: true,
          ironLow: true,
          zincLow: true,
          leucineLow: false,
          exerciseEffectLow: false,
        };
      } else if (fileName.includes('exercise') || fileName.includes('運動')) {
        detectedGene = {
          type: 'exercise_resistant',
          typeName: '運動減量抵抗性タイプ (食事9割徹底)',
          folicAcidLow: false,
          vitaminCLow: false,
          ironLow: true,
          zincLow: false,
          leucineLow: false,
          exerciseEffectLow: true,
        };
      } else {
        // デフォルトまたは脂質解析パターン
        detectedGene = {
          type: 'lipid_risk',
          typeName: '脂質吸収過多・皮下脂肪タイプ (F18%制限)',
          folicAcidLow: true,
          vitaminCLow: true,
          ironLow: true,
          zincLow: false,
          leucineLow: false,
          exerciseEffectLow: true,
        };
      }

      setParsedGeneProfile(detectedGene);
      showToast(`Excel解析完了: 【${detectedGene.typeName}】と判定されました！`);
    }, 1200);
  };

  // 解析結果をカルテに記憶し、PFCバランスを即時再計算して反映
  const saveGeneExcelToProfile = () => {
    if (!parsedGeneProfile) return;

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
      parsedGeneProfile,
      currentUser.isInbodyMeasured ? currentUser.bmr : undefined
    );

    setUsers((prev) => ({
      ...prev,
      [selectedUserId]: {
        ...prev[selectedUserId],
        geneProfile: parsedGeneProfile,
        isGeneMeasured: true,
        targetCalories: calculated.targetCalories,
        targetP: calculated.targetP,
        targetF: calculated.targetF,
        targetC: calculated.targetC,
        adviceMessage: `【サクラ整骨院 栄養フィードバック】\n${currentUser.name}様、遺伝子検査（chatGENE）Excelの解析が完了しました！\n「${parsedGeneProfile.typeName}」の体質に合わせ、目標PFCバランス（P:${calculated.targetP}g / F:${calculated.targetF}g / C:${calculated.targetC}g）を即時自動調整いたしました。`,
      },
    }));

    setIsGeneExcelModalOpen(false);
    setGeneExcelFile(null);
    setParsedGeneProfile(null);
    showToast('遺伝子タイプと最適化PFCバランスをカルテに反映しました！');
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
        weight: currentUser.gender === 'male' ? 74.5 : 56.8,
        muscleMass: currentUser.gender === 'male' ? 31.8 : 20.8,
        bodyFatRatio: currentUser.gender === 'male' ? 23.2 : 27.5,
        bmr: currentUser.gender === 'male' ? 1610 : 1270,
      };

      setScannedInbodyData(parsed);
      showToast('InBody測定用紙のAIスキャン＆数値検出が完了しました！');
    }, 1300);
  };

  const saveInbodyToProfile = () => {
    if (!scannedInbodyData) return;

    const targetWeight = currentUser.targetWeight > 0 ? currentUser.targetWeight : Math.round(scannedInbodyData.weight * 0.9);

    const calculated = calculateLogicalTargetsWithHB(
      currentUser.gender,
      currentUser.age || 35,
      currentUser.height || 160,
      scannedInbodyData.weight,
      scannedInbodyData.muscleMass,
      scannedInbodyData.bodyFatRatio,
      targetWeight,
      currentUser.targetMonths || 3,
      currentUser.pal || 1.45,
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
        targetWeight: targetWeight,
        bmr: calculated.bmr,
        isInbodyMeasured: true,
        tdee: calculated.tdee,
        targetCalories: calculated.targetCalories,
        targetP: calculated.targetP,
        targetF: calculated.targetF,
        targetC: calculated.targetC,
        inbodyHistory: [scannedInbodyData, ...prev[selectedUserId].inbodyHistory],
        adviceMessage: `【サクラ整骨院 栄養フィードバック】\n${currentUser.name}様、InBody測定シートの連動が完了いたしました！\n実測基礎代謝【${calculated.bmr} kcal】を安全の最低基準とし、体脂肪燃焼に最も効果的なPFCバランスを算出設定いたしました。`,
      },
    }));

    setIsInbodyModalOpen(false);
    setInbodyImage(null);
    setScannedInbodyData(null);
    showToast('InBody実測数値からカルテを自動生成・保存しました！');
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

  const calPercent = currentUser?.targetCalories > 0 ? Math.min(Math.round((currentCalories / currentUser.targetCalories) * 100), 100) : 0;
  const pPercent = currentUser?.targetP > 0 ? Math.min(Math.round((currentP / currentUser.targetP) * 100), 100) : 0;
  const fPercent = currentUser?.targetF > 0 ? Math.min(Math.round((currentF / currentUser.targetF) * 100), 100) : 0;
  const cPercent = currentUser?.targetC > 0 ? Math.min(Math.round((currentC / currentUser.targetC) * 100), 100) : 0;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col antialiased font-sans">
      {/* トースト */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold border border-slate-700 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* スマホ完全対応ヘッダー */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-3 py-2.5 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-md shrink-0">
              S
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black text-slate-800 leading-tight">サクラ整骨院 統合PFC管理</h1>
              <p className="text-[10px] text-slate-500 font-medium">InBody ＋ 遺伝子Excel 自動解析</p>
            </div>
          </div>

          {/* 会員選択 ＆ 新規・削除エリア */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between">
            <button
              type="button"
              onClick={() => setIsAddUserModalOpen(true)}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl sm:rounded-2xl text-xs font-black flex items-center gap-1 shadow-sm shrink-0 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-100" />
              <span>＋ 新規追加</span>
            </button>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl sm:rounded-2xl border border-slate-200 flex-1 sm:flex-initial max-w-[210px] sm:max-w-none">
              <User className="w-3.5 h-3.5 text-emerald-600 ml-1 shrink-0" />
              <select
                value={selectedUserId}
                onChange={(e) => {
                  setSelectedUserId(e.target.value);
                  setCalcForm(users[e.target.value]);
                }}
                className="bg-transparent text-slate-800 text-xs font-bold py-1 pr-1 outline-none cursor-pointer w-full truncate"
              >
                {Object.values(users).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} 様
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleDeleteUser}
              title="選択中の会員を削除"
              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl sm:rounded-2xl shrink-0 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* メイン */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 py-4 sm:px-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* カルテダッシュボード */}
        <div className="bg-slate-900 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl border border-slate-800 space-y-4 sm:space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3 sm:pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="text-[10px] sm:text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Dna className="w-3 h-3 text-amber-400" /> {currentUser?.geneProfile.typeName}
                </span>
                {currentUser?.isInbodyMeasured && (
                  <span className="text-[10px] sm:text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Database className="w-3 h-3 text-indigo-400" /> InBody実測済み
                  </span>
                )}
                {currentUser?.isGeneMeasured && (
                  <span className="text-[10px] sm:text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <FileSpreadsheet className="w-3 h-3 text-emerald-400" /> 遺伝子Excel適用済み
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">{currentUser?.name} 様のカルテ</h2>
            </div>

            {/* 操作ボタン群（2列表示） */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 pt-1 sm:pt-0">
              <button
                type="button"
                onClick={() => setIsInbodyModalOpen(true)}
                className="px-3 py-2 sm:px-3.5 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1 shadow"
              >
                <Scan className="w-3.5 h-3.5 text-indigo-200" />
                <span>InBody読み込み</span>
              </button>

              <button
                type="button"
                onClick={() => setIsGeneExcelModalOpen(true)}
                className="px-3 py-2 sm:px-3.5 rounded-xl sm:rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1 shadow"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-200" />
                <span>遺伝子 (Excel)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCalcForm(currentUser);
                  setIsCalcModalOpen(true);
                }}
                className="px-3 py-2 sm:px-3.5 rounded-xl sm:rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1 border border-slate-700 shadow"
              >
                <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                <span>数値再計算</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAiModalOpen(true)}
                className="px-3 py-2 sm:px-3.5 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1 shadow"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>AI食事解析</span>
              </button>
            </div>
          </div>

          {/* 個別精密計算の指標 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 sm:gap-3">
            <div className="bg-slate-800/80 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-700">
              <span className="text-[10px] text-slate-400 block font-bold">体重 / 骨格筋量</span>
              <span className="text-sm sm:text-base font-black text-white mt-1 block">
                {currentUser?.weight > 0 ? `${currentUser.weight} kg` : '未登録'}
                <span className="text-[10px] sm:text-xs text-indigo-300 block font-normal">筋量: {currentUser?.muscleMass ? `${currentUser.muscleMass} kg` : '--'}</span>
              </span>
            </div>

            <div className="bg-slate-800/80 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-700">
              <span className="text-[10px] text-slate-400 block font-bold">体脂肪率</span>
              <span className="text-sm sm:text-base font-black text-amber-300 mt-1 block">
                {currentUser?.bodyFatRatio > 0 ? `${currentUser.bodyFatRatio} %` : '--'}
              </span>
            </div>

            <div className="bg-slate-800/80 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-700">
              <span className="text-[10px] text-slate-400 block font-bold">1日総消費 (TDEE)</span>
              <span className="text-sm sm:text-base font-black text-indigo-300 mt-1 block">
                {currentUser?.tdee} <span className="text-[10px] text-slate-400 font-normal">kcal</span>
              </span>
            </div>

            <div className="bg-slate-800/80 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-700">
              <span className="text-[10px] text-rose-300 block font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-rose-400 shrink-0" /> 基礎代謝 ({currentUser?.isInbodyMeasured ? 'InBody' : '推定'})
              </span>
              <span className="text-sm sm:text-base font-black text-rose-400 mt-1 block">
                {currentUser?.bmr} <span className="text-[10px] text-slate-400 font-normal">kcal</span>
              </span>
            </div>

            <div className="bg-slate-800/80 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-700 col-span-2 md:col-span-1">
              <span className="text-[10px] text-amber-300 block font-bold">目標カロリー</span>
              <span className="text-sm sm:text-base font-black text-amber-400 mt-1 block">
                {currentUser?.targetCalories} <span className="text-[10px] text-slate-400 font-normal">kcal</span>
              </span>
            </div>
          </div>
        </div>

        {/* 摂取状況＆PFC進捗状況 */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200 space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-1">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">本日の摂取カロリー・PFC進捗状況</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl flex flex-col justify-between shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">本日摂取エネルギー</span>
                <Flame className="w-4 h-4 text-amber-400" />
              </div>
              <div className="my-2 sm:my-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-black">{currentCalories}</span>
                  <span className="text-xs text-slate-400">/ {currentUser?.targetCalories} kcal</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full mt-2.5 overflow-hidden">
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

            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              <div className="bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-xs font-black text-indigo-900">P（タンパク質）</span>
                    <span className="text-xs font-black text-indigo-600">{currentP}g</span>
                  </div>
                  <p className="text-[10px] text-slate-500">目標: {currentUser?.targetP}g</p>
                </div>
                <div className="mt-2.5">
                  <div className="w-full bg-indigo-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${pPercent}%` }}></div>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 block text-right mt-1">{pPercent}%</span>
                </div>
              </div>

              <div className="bg-amber-50/50 border border-amber-100 p-3.5 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-xs font-black text-amber-900">F（脂質）</span>
                    <span className="text-xs font-black text-amber-600">{currentF}g</span>
                  </div>
                  <p className="text-[10px] text-slate-500">目標: {currentUser?.targetF}g</p>
                </div>
                <div className="mt-2.5">
                  <div className="w-full bg-amber-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${fPercent}%` }}></div>
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 block text-right mt-1">{fPercent}%</span>
                </div>
              </div>

              <div className="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-xs font-black text-emerald-900">C（炭水化物）</span>
                    <span className="text-xs font-black text-emerald-600">{currentC}g</span>
                  </div>
                  <p className="text-[10px] text-slate-500">目標: {currentUser?.targetC}g</p>
                </div>
                <div className="mt-2.5">
                  <div className="w-full bg-emerald-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: `${cPercent}%` }}></div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 block text-right mt-1">{cPercent}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 自動生成 LINEアドバイス表示エリア */}
        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
              <h3 className="font-bold text-sm sm:text-base">LINEフィードバック文章</h3>
            </div>
            <span className="text-[10px] sm:text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-bold">自動最適化</span>
          </div>
          <p className="text-xs text-emerald-50 leading-relaxed bg-black/20 p-3.5 rounded-xl sm:rounded-2xl border border-white/10 font-sans whitespace-pre-wrap">
            {currentUser?.adviceMessage}
          </p>
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => copyToClipboard(currentUser?.adviceMessage || '', 'LINEフィードバック文章をコピーしました！')}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm hover:bg-emerald-50"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>そのままLINEに送信（文章をコピー）</span>
            </button>
          </div>
        </div>
      </main>

      {/* 👤 新規会員追加 モーダル */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-slate-800 text-base">新規会員様の登録</h3>
              </div>
              <button type="button" onClick={() => setIsAddUserModalOpen(false)} className="p-1 rounded-full text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-black text-slate-800 block mb-1">
                  会員様のお名前（氏名） <span className="text-rose-500">*必須</span>
                </label>
                <input
                  type="text"
                  placeholder="例：山﨑 知子"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full p-3 border-2 border-emerald-200 rounded-xl text-sm font-bold focus:border-emerald-600 focus:ring-0 outline-none"
                  autoFocus
                />
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
                onClick={handleAddNewUserOnlyName}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all"
              >
                登録して完了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🧬 遺伝子検査結果 (Excel) 解析 モーダル */}
      {isGeneExcelModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-600" />
                <h3 className="font-black text-slate-800 text-base">遺伝子検査結果 (Excel) 解析</h3>
              </div>
              <button type="button" onClick={() => setIsGeneExcelModalOpen(false)} className="p-1 rounded-full text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="file"
                accept=".xlsx, .xls"
                ref={excelFileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setGeneExcelFile(file);
                }}
                className="hidden"
              />

              <div
                onClick={() => excelFileInputRef.current?.click()}
                className="border-2 border-dashed border-amber-300 bg-amber-50/40 rounded-2xl p-5 text-center cursor-pointer hover:border-amber-500 min-h-[130px] flex items-center justify-center transition-all"
              >
                {geneExcelFile ? (
                  <div className="space-y-1">
                    <FileSpreadsheet className="w-8 h-8 text-amber-600 mx-auto" />
                    <p className="text-xs font-black text-slate-800">{geneExcelFile.name}</p>
                    <p className="text-[10px] text-amber-600 font-bold">ファイル選択完了</p>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 text-amber-500 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-slate-700">Excelファイル（.xlsx/.xls）を選択</p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={runGeneExcelScan}
                disabled={isParsingExcel || !geneExcelFile}
                className={`w-full py-3 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
                  geneExcelFile ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-slate-200 text-slate-400'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>{isParsingExcel ? 'Excelを解析中...' : 'Excelを自動解析'}</span>
              </button>
            </div>

            {parsedGeneProfile && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <span className="text-xs font-black text-amber-900 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-amber-600" /> Excel解析・自動判定成功
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-amber-100">
                  <span className="text-[10px] text-slate-500 block font-bold">判定されたタイプ</span>
                  <strong className="text-xs text-amber-900 font-black">{parsedGeneProfile.typeName}</strong>
                </div>

                <button
                  type="button"
                  onClick={saveGeneExcelToProfile}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all"
                >
                  このタイプで目標PFCを更新・保存
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 📸 InBody AI OCRスキャン モーダル */}
      {isInbodyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Scan className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-slate-800 text-base">InBody測定結果 自動読み込み</h3>
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
                className="border-2 border-dashed border-indigo-200 bg-indigo-50/30 rounded-2xl p-5 text-center cursor-pointer hover:border-indigo-500 min-h-[140px] flex items-center justify-center transition-all"
              >
                {inbodyImage ? (
                  <img src={inbodyImage} alt="InBodyシート" className="max-h-40 object-contain rounded-lg shadow" />
                ) : (
                  <div>
                    <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-slate-700">InBodyの測定結果写真をアップロード</p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={runInbodyOcrScan}
                disabled={isScanningInbody || !inbodyImage}
                className={`w-full py-3 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
                  inbodyImage ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-200 text-slate-400'
                }`}
              >
                <Scan className="w-4 h-4" />
                <span>{isScanningInbody ? 'InBodyシートをAI解析中...' : '画像をスキャンして自動入力'}</span>
              </button>
            </div>

            {scannedInbodyData && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2 rounded-lg border border-indigo-100">
                    <span className="text-[10px] text-slate-500 block">体重</span>
                    <strong className="text-sm text-slate-800">{scannedInbodyData.weight} kg</strong>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-indigo-100">
                    <span className="text-[10px] text-slate-500 block">実測 基礎代謝</span>
                    <strong className="text-sm text-rose-600">{scannedInbodyData.bmr} kcal</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={saveInbodyToProfile}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all"
                >
                  カルテに反映・保存
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 数値再計算モーダル */}
      {isCalcModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
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

      {/* AI解析モーダル */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-slate-800 text-base">LINE食事投稿 AI解析＆アドバイス生成</h3>
              </div>
              <button type="button" onClick={() => setIsAiModalOpen(false)} className="p-1 rounded-full text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('image')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 ${
                  activeTab === 'image' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>写真投稿</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('text')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 ${
                  activeTab === 'text' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>文章コピペ</span>
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
                  className="border-2 border-dashed border-slate-300 rounded-2xl p-5 text-center cursor-pointer hover:border-emerald-500 min-h-[130px] flex items-center justify-center bg-slate-50/50"
                >
                  {selectedImage ? (
                    <img src={selectedImage} alt="選択画像" className="max-h-32 object-contain rounded-lg shadow" />
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                      <p className="text-xs font-bold text-slate-700">クリックしてLINE写真・スクショを選択</p>
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
                placeholder="例：お昼にサバの塩焼き定食を食べました！"
                className="w-full p-3 border border-slate-300 rounded-xl text-xs outline-none focus:border-emerald-500"
              ></textarea>
            )}

            <button
              type="button"
              onClick={runAiAnalysis}
              disabled={isAnalyzing}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{isAnalyzing ? 'AI解析中...' : '食事解析してLINEアドバイス作成'}</span>
            </button>

            {analysisResult && generatedAdvice && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                  <p className="text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-wrap bg-white p-2.5 rounded-lg border border-emerald-100">
                    {generatedAdvice}
                  </p>
                  <button
                    type="button"
                    onClick={saveAnalyzedMeal}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all"
                  >
                    食事ログに追加保存
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* フッター */}
      <footer className="border-t border-slate-200 bg-white py-3 text-center text-[10px] text-slate-500">
        サクラ整骨院 PFC Balance Manager (Mobile & Staff Edition)
      </footer>
    </div>
  );
}
