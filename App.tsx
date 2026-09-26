import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx'; // Excelバイナリ解析用ライブラリ
import {
  CheckCircle2,
  Flame,
  User,
  X,
  Sparkles,
  Image as ImageIcon,
  Trash2,
  Calculator,
  AlertTriangle,
  Activity,
  Copy,
  Scan,
  Database,
  UserPlus,
  Dna,
  FileSpreadsheet,
  Upload,
  FileText,
  MessageSquare,
  ShieldCheck,
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

// 遺伝子タイプごとのPFC比率 & 個別目標計算
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

  // 🧬 遺伝子解析タイプに応じた目標PFC比率
  let pRatio = 0.25, fRatio = 0.25, cRatio = 0.50;

  switch (geneProfile.type) {
    case 'lipid_risk':
      pRatio = 0.30; fRatio = 0.18; cRatio = 0.52; // 脂質18%制限
      break;
    case 'carb_risk':
      pRatio = 0.30; fRatio = 0.30; cRatio = 0.40; // 炭水化物40%制限
      break;
    case 'protein_risk':
      pRatio = 0.35; fRatio = 0.22; cRatio = 0.43; // タンパク質35%強化
      break;
    case 'micronutrient':
      pRatio = 0.28; fRatio = 0.22; cRatio = 0.50; // 微量栄養素補正
      break;
    case 'exercise_resistant':
      pRatio = 0.32; fRatio = 0.23; cRatio = 0.45; // 食事重視コントロール
      break;
  }

  const targetP = Math.round((targetCalories * pRatio) / 4);
  const targetF = Math.round((targetCalories * fRatio) / 9);
  const targetC = Math.round((targetCalories * cRatio) / 4);

  return { targetCalories, targetP, targetF, targetC, bmr, tdee, isInbody };
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
    todayMeals: [],
    inbodyHistory: [],
    adviceMessage: '【サクラ整骨院 栄養フィードバック】\n佐藤佳代様、遺伝子検査（chatGENE）結果に基づきカルテを統合管理しています。',
  },
};

export default function App() {
  const [users, setUsers] = useState<Record<string, UserProfile>>(INITIAL_USERS);
  const [selectedUserId, setSelectedUserId] = useState<string>('userA');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isGeneExcelModalOpen, setIsGeneExcelModalOpen] = useState(false);
  const [geneExcelFile, setGeneExcelFile] = useState<File | null>(null);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [parsedGeneProfile, setParsedGeneProfile] = useState<GeneProfile | null>(null);

  const excelFileInputRef = useRef<HTMLInputElement>(null);
  const currentUser = users[selectedUserId] || Object.values(users)[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 🧬 Excelのセルデータを直接1行ずつ読み込んで本格分析する関数
  const runGeneExcelScan = async () => {
    if (!geneExcelFile) return alert('遺伝子検査のExcelファイル（.xlsx/.xls）を選択してください');
    setIsParsingExcel(true);

    try {
      const data = await geneExcelFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

      let foundGeneCount = 0;
      let folicAcidLow = false;
      let vitaminCLow = false;
      let ironLow = false;
      let zincLow = false;
      let leucineLow = false;
      let exerciseEffectLow = false;

      let lipidScore = 0;
      let carbScore = 0;

      // Excelの全行をループして項目名と判定・スコアをチェック
      rows.forEach((row) => {
        const itemName = String(row['項目名'] || row['項目'] || '');
        const judge = String(row['判定'] || '');
        const score = Number(row['スコア'] || 0);

        if (itemName) {
          foundGeneCount++;

          if (itemName.includes('葉酸') && (judge.includes('低') || score < 40)) folicAcidLow = true;
          if (itemName.includes('ビタミンC') && (judge.includes('低') || score < 40)) vitaminCLow = true;
          if (itemName.includes('鉄') && (judge.includes('低') || score < 40)) ironLow = true;
          if (itemName.includes('亜鉛') && (judge.includes('低') || score < 40)) zincLow = true;
          if (itemName.includes('ロイシン') && (judge.includes('低') || score < 40)) leucineLow = true;
          if (itemName.includes('運動による減量効果') && (judge.includes('低') || score < 40)) exerciseEffectLow = true;

          if (itemName.includes('脂質') || itemName.includes('皮下脂肪')) lipidScore += score;
          if (itemName.includes('糖質') || itemName.includes('内臓脂肪') || itemName.includes('血糖')) carbScore += score;
        }
      });

      setIsParsingExcel(false);

      // 無関係なExcel（遺伝子項目が検知されないファイル）の判定ガード
      if (foundGeneCount === 0) {
        alert('⚠️ 選択されたExcelファイル内に「遺伝子検査項目」が見つかりませんでした。chatGENE等の結果データをご選択ください。');
        setParsedGeneProfile(null);
        return;
      }

      // 解析結果に基づく主要タイプの決定
      let detectedType: GeneType = 'micronutrient';
      let typeName = '微量栄養素（葉酸・鉄・ビタミンC）吸収低下タイプ';

      if (folicAcidLow || ironLow || vitaminCLow) {
        detectedType = 'micronutrient';
        typeName = '微量栄養素（葉酸・鉄・ビタミンC）吸収低下タイプ';
      } else if (leucineLow) {
        detectedType = 'protein_risk';
        typeName = '蛋白分解・筋肉分解リスクタイプ (P35%強化)';
      } else if (carbScore > lipidScore) {
        detectedType = 'carb_risk';
        typeName = '糖質内臓脂肪・インスリンリスクタイプ (C40%制限)';
      } else {
        detectedType = 'lipid_risk';
        typeName = '脂質吸収過多・皮下脂肪タイプ (F18%制限)';
      }

      const profile: GeneProfile = {
        type: detectedType,
        typeName,
        folicAcidLow,
        vitaminCLow,
        ironLow,
        zincLow,
        leucineLow,
        exerciseEffectLow,
      };

      setParsedGeneProfile(profile);
      showToast(`Excel全${foundGeneCount}項目を解析！【${typeName}】と判定されました。`);
    } catch (err) {
      setIsParsingExcel(false);
      alert('Excelファイルの読み込み中にエラーが発生しました。ファイル形式をご確認ください。');
    }
  };

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
        adviceMessage: `【サクラ整骨院 栄養フィードバック】\n${currentUser.name}様、遺伝子検査（chatGENE）Excel解析が完了しました！\n「${parsedGeneProfile.typeName}」の体質に合わせ、目標PFC（P:${calculated.targetP}g / F:${calculated.targetF}g / C:${calculated.targetC}g）を自動更新保存いたしました。`,
      },
    }));

    setIsGeneExcelModalOpen(false);
    setGeneExcelFile(null);
    setParsedGeneProfile(null);
    showToast('解析結果をカルテに反映・目標PFCを自動更新しました！');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* トースト表示 */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200 p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="font-black text-lg text-slate-800">サクラ整骨院 遺伝子Excel自動読み取りカルテ</h1>
          <button
            type="button"
            onClick={() => setIsGeneExcelModalOpen(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>🧬 遺伝子検査Excelを読み込む</span>
          </button>
        </div>
      </header>

      {/* メイン画面 */}
      <main className="max-w-4xl mx-auto w-full p-4 space-y-4">
        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <Dna className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-bold text-amber-300">{currentUser.geneProfile.typeName}</span>
          </div>
          <h2 className="text-2xl font-black">{currentUser.name} 様の統合目標</h2>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="bg-slate-800 p-3 rounded-2xl border border-slate-700">
              <span className="text-[10px] text-slate-400 block font-bold">目標P (タンパク質)</span>
              <strong className="text-lg text-indigo-400">{currentUser.targetP} g</strong>
            </div>
            <div className="bg-slate-800 p-3 rounded-2xl border border-slate-700">
              <span className="text-[10px] text-slate-400 block font-bold">目標F (脂質)</span>
              <strong className="text-lg text-amber-400">{currentUser.targetF} g</strong>
            </div>
            <div className="bg-slate-800 p-3 rounded-2xl border border-slate-700">
              <span className="text-[10px] text-slate-400 block font-bold">目標C (炭水化物)</span>
              <strong className="text-lg text-emerald-400">{currentUser.targetC} g</strong>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200">
          <h3 className="font-bold text-sm text-slate-800 mb-2">生成アドバイス文章</h3>
          <p className="text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100 text-slate-700 whitespace-pre-wrap">
            {currentUser.adviceMessage}
          </p>
        </div>
      </main>

      {/* 🧬 Excel解析モーダル */}
      {isGeneExcelModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-slate-800 text-base">Excelデータ解析</h3>
              <button type="button" onClick={() => setIsGeneExcelModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <input
              type="file"
              accept=".xlsx, .xls"
              ref={excelFileInputRef}
              onChange={(e) => setGeneExcelFile(e.target.files?.[0] || null)}
              className="hidden"
            />

            <div
              onClick={() => excelFileInputRef.current?.click()}
              className="border-2 border-dashed border-amber-300 bg-amber-50/40 rounded-2xl p-6 text-center cursor-pointer hover:border-amber-500"
            >
              {geneExcelFile ? (
                <p className="text-xs font-black text-slate-800">{geneExcelFile.name}</p>
              ) : (
                <p className="text-xs font-bold text-slate-600">クリックして遺伝子Excelファイルを選択</p>
              )}
            </div>

            <button
              type="button"
              onClick={runGeneExcelScan}
              disabled={isParsingExcel || !geneExcelFile}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow"
            >
              {isParsingExcel ? 'セルデータを解析中...' : 'Excelデータを直接自動解析'}
            </button>

            {parsedGeneProfile && (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl space-y-3">
                <span className="text-xs font-black text-emerald-900">解析完了結果</span>
                <p className="text-xs font-black text-slate-800">{parsedGeneProfile.typeName}</p>
                <button
                  type="button"
                  onClick={saveGeneExcelToProfile}
                  className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold"
                >
                  カルテのPFC目標値を更新保存
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
