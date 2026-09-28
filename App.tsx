import React, { useState } from 'react';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

// AI解析用の型定義
interface MealAnalysisResult {
  mealName: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  description?: string;
}

// 登録された食事記録の型定義
interface MealRecord {
  id: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  mealName: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  description?: string;
  createdAt: string;
}

// システムプロンプト（時間帯による数値変動を遮断する厳格ルール）
const SYSTEM_INSTRUCTION = `
あなたはプロの管理栄養士および分子栄養学の専門家です。
ユーザーから渡された食事内容テキストを分析し、カロリーとPFC（タンパク質・脂質・炭水化物）のバランスを算出してください。

【厳格なルール】
1. 食事の摂取タイミング（朝食・昼食・夕食・間食など）や時間帯情報は、カロリーおよびPFCの計算結果に一切影響させてはなりません。
2. 同じ食事内容であれば、朝・昼・夜どの時間帯であっても、常に同一の標準的な栄養数値を算出してください。
3. 一般的な一人前の標準的な量を基準とし、客観的かつ再現性のある数値を出力してください。
`;

// レスポンスのJSON構造定義
const mealAnalysisSchema = {
  type: SchemaType.OBJECT,
  properties: {
    mealName: {
      type: SchemaType.STRING,
      description: "推定される標準的な料理名",
    },
    calories: {
      type: SchemaType.NUMBER,
      description: "総カロリー (kcal)",
    },
    protein: {
      type: SchemaType.NUMBER,
      description: "タンパク質 (g)",
    },
    fat: {
      type: SchemaType.NUMBER,
      description: "脂質 (g)",
    },
    carbs: {
      type: SchemaType.NUMBER,
      description: "炭水化物 (g)",
    },
    description: {
      type: SchemaType.STRING,
      description: "食材や内訳の簡潔な補足説明",
    },
  },
  required: ["mealName", "calories", "protein", "fat", "carbs"],
};

export default function App() {
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [records, setRecords] = useState<MealRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 食事分析の実行ハンドラー
  const handleAnalyzeAndAdd = async () => {
    if (!inputText.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('VITE_GEMINI_API_KEY が設定されていません。');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: SYSTEM_INSTRUCTION,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: mealAnalysisSchema,
          temperature: 0.1, // ランダム性を極力排除して一貫性を確保
        },
      });

      // 入力文字列から時間帯（朝・昼・夜等）のプレフィックスを除去し、純粋な料理名のみを抽出
      const cleanedInput = inputText
        .replace(/^(朝食|昼食|夕食|夜食|間食|朝|昼|夜)[:：\s]*/, '')
        .trim();

      const userPrompt = `以下の食事内容のカロリーおよびPFCバランスを分析してください。\n食事内容: ${cleanedInput}`;

      const result = await model.generateContent(userPrompt);
      const responseText = result.response.text();
      const parsedData: MealAnalysisResult = JSON.parse(responseText);

      // レコードとして保存（時間帯タグは保存用に付与し、AI計算には影響させない）
      const newRecord: MealRecord = {
        id: Date.now().toString(),
        mealType,
        mealName: parsedData.mealName || cleanedInput,
        calories: parsedData.calories,
        protein: parsedData.protein,
        fat: parsedData.fat,
        carbs: parsedData.carbs,
        description: parsedData.description,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setRecords((prev) => [newRecord, ...prev]);
      setInputText('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'AI分析中にエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  // 1日の合計値計算
  const totals = records.reduce(
    (acc, cur) => ({
      calories: acc.calories + cur.calories,
      protein: acc.protein + cur.protein,
      fat: acc.fat + cur.fat,
      carbs: acc.carbs + cur.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  const getMealTypeLabel = (type: string) => {
    switch (type) {
      case 'breakfast': return '朝食';
      case 'lunch': return '昼食';
      case 'dinner': return '夕食';
      case 'snack': return '間食';
      default: return type;
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
        食事栄養アナライザー（スタッフ専用）
      </h1>

      {/* 入力フォーム */}
      <div style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', marginRight: '10px' }}>区分:</label>
          <select
            value={mealType}
            onChange={(e) => setMealType(e.target.value as any)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="breakfast">朝食</option>
            <option value="lunch">昼食</option>
            <option value="dinner">夕食</option>
            <option value="snack">間食</option>
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>食事内容:</label>
          <input
            type="text"
            placeholder="例: 生姜焼き定食"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isLoading) handleAnalyzeAndAdd();
            }}
          />
        </div>

        <button
          onClick={handleAnalyzeAndAdd}
          disabled={isLoading || !inputText.trim()}
          style={{
            backgroundColor: isLoading ? '#ccc' : '#0070f3',
            color: '#fff',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          {isLoading ? 'AI解析中...' : 'AI分析して記録追加'}
        </button>

        {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      </div>

      {/* 当日の合計PFC表示 */}
      <div style={{ backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 10px 0' }}>本日の合計</h2>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div><strong>カロリー:</strong> {Math.round(totals.calories)} kcal</div>
          <div><strong>P (タンパク質):</strong> {Math.round(totals.protein * 10) / 10} g</div>
          <div><strong>F (脂質):</strong> {Math.round(totals.fat * 10) / 10} g</div>
          <div><strong>C (炭水化物):</strong> {Math.round(totals.carbs * 10) / 10} g</div>
        </div>
      </div>

      {/* 記録リスト */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>記録一覧</h2>
        {records.length === 0 ? (
          <p style={{ color: '#888' }}>まだ記録はありません。</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {records.map((rec) => (
              <div key={rec.id} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '6px', backgroundColor: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 'bold', color: '#0070f3' }}>
                    [{getMealTypeLabel(rec.mealType)}] {rec.mealName}
                  </span>
                  <span style={{ color: '#888', fontSize: '12px' }}>{rec.createdAt}</span>
                </div>
                <div style={{ fontSize: '14px', marginBottom: '5px' }}>
                  <strong>カロリー:</strong> {rec.calories} kcal | 
                  <strong> P:</strong> {rec.protein}g | 
                  <strong> F:</strong> {rec.fat}g | 
                  <strong> C:</strong> {rec.carbs}g
                </div>
                {rec.description && (
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    {rec.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
