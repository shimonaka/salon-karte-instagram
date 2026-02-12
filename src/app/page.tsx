"use client";

import { useState, useCallback } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

const MENUS = [
  { id: "cut", label: "✂️ カット", emoji: "✂️" },
  { id: "color", label: "🎨 カラー", emoji: "🎨" },
  { id: "perm", label: "💫 パーマ", emoji: "💫" },
  { id: "treatment", label: "✨ トリートメント", emoji: "✨" },
  { id: "spa", label: "💆 スパ", emoji: "💆" },
  { id: "other", label: "📋 その他", emoji: "📋" },
];

interface GenerationResult {
  karte_text: string;
  sns_text: string;
}

const SYSTEM_PROMPT = `# Role
あなたは優秀な美容師のアシスタントです。ベテラン美容師かつSNSマーケターとして振る舞ってください。

# Instructions
入力された施術メニューとメモを元に、以下の2つのセクションを含むJSONのみを出力してください。
余計な説明やマークダウンは一切不要です。純粋なJSONのみを返してください。

1. "karte_text": 
   - 目的: サロン内部のカルテ記録用
   - トーン: 事務的、簡潔、事実ベース
   - フォーマット: 箇条書き（各項目を改行で区切る）
   - 内容: 施術内容、薬剤レシピ（メモにある場合）、特記事項
   - 感情は排除し、事実のみを記載

2. "sns_text":
   - 目的: Instagramのフィード投稿用
   - トーン: 親しみやすく、トレンド感のある口調。女性客に響く、おしゃれな文体
   - 内容: ヘアスタイルの魅力、施術のこだわり、お客様とのエピソード（メモにあれば）
   - 絵文字を適度に使用
   - 末尾: 関連性の高いハッシュタグを15個程度（例: #美容室 #ヘアカラー #透明感カラー 等）

# Output Format (JSON only)
{
  "karte_text": "...",
  "sns_text": "..."
}`;

export default function Home() {
  const [selectedMenus, setSelectedMenus] = useState<string[]>([]);
  const [memo, setMemo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [karteCopied, setKarteCopied] = useState(false);
  const [snsCopied, setSnsCopied] = useState(false);

  const toggleMenu = useCallback((menuId: string) => {
    setSelectedMenus((prev) =>
      prev.includes(menuId)
        ? prev.filter((id) => id !== menuId)
        : [...prev, menuId]
    );
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 2500);
  }, []);

  const copyToClipboard = useCallback(
    async (text: string, type: "karte" | "sns") => {
      try {
        await navigator.clipboard.writeText(text);
        if (type === "karte") {
          setKarteCopied(true);
          setTimeout(() => setKarteCopied(false), 2000);
        } else {
          setSnsCopied(true);
          setTimeout(() => setSnsCopied(false), 2000);
        }
        showToast("📋 コピーしました！");
      } catch {
        showToast("⚠️ コピーに失敗しました");
      }
    },
    [showToast]
  );

  const handleInstagramOpen = useCallback(
    async (text: string) => {
      await copyToClipboard(text, "sns");
      setTimeout(() => {
        window.location.href = "instagram://library";
      }, 500);
    },
    [copyToClipboard]
  );

  const handleGenerate = useCallback(async () => {
    if (selectedMenus.length === 0) {
      setError("施術メニューを1つ以上選択してください");
      return;
    }
    if (!memo.trim()) {
      setError("施術メモを入力してください");
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      setError("APIキーが設定されていません。環境変数を確認してください。");
      return;
    }

    setError("");
    setIsLoading(true);
    setResult(null);
    setKarteCopied(false);
    setSnsCopied(false);

    try {
      const menuLabels = selectedMenus.map(
        (id) => MENUS.find((m) => m.id === id)?.label.replace(/^[^\s]+\s/, "") || id
      );

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      });

      const userPrompt = `# Input Data
メニュー: ${menuLabels.join("、")}
メモ: ${memo.trim()}`;

      const result = await model.generateContent([
        { text: SYSTEM_PROMPT },
        { text: userPrompt },
      ]);

      const responseText = result.response.text();

      let jsonStr = responseText;
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      const braceStart = jsonStr.indexOf("{");
      const braceEnd = jsonStr.lastIndexOf("}");
      if (braceStart !== -1 && braceEnd !== -1) {
        jsonStr = jsonStr.substring(braceStart, braceEnd + 1);
      }

      const parsed = JSON.parse(jsonStr);

      setResult({
        karte_text: parsed.karte_text || "",
        sns_text: parsed.sns_text || "",
      });
    } catch (err) {
      console.error("Generation error:", err);
      setError(
        "生成に失敗しました。時間をおいて再試行してください。"
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedMenus, memo]);

  const handleReset = useCallback(() => {
    setSelectedMenus([]);
    setMemo("");
    setResult(null);
    setError("");
    setKarteCopied(false);
    setSnsCopied(false);
  }, []);

  return (
    <main className="min-h-screen pb-8">
      {/* Header */}
      <header className="pt-8 pb-4 px-5 text-center">
        <div className="animate-fade-in-up">
          <h1
            className="text-2xl font-extrabold tracking-tight"
            style={{
              background: "linear-gradient(135deg, #b76e79 0%, #8e4f58 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ✨ Salon AI Writer
          </h1>
          <p className="text-sm mt-1.5" style={{ color: "#9a7a80" }}>
            カルテ & SNS投稿文を瞬時に作成
          </p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 space-y-5">
        {/* ===== Input Section ===== */}
        <section className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          {/* Menu Selection */}
          <div className="mb-5">
            <label className="block text-sm font-bold mb-3" style={{ color: "#8e4f58" }}>
              📌 施術メニュー
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {MENUS.map((menu) => (
                <button
                  key={menu.id}
                  type="button"
                  onClick={() => toggleMenu(menu.id)}
                  className={`menu-toggle text-center ${selectedMenus.includes(menu.id) ? "active" : ""
                    }`}
                >
                  {menu.label}
                </button>
              ))}
            </div>
          </div>

          {/* Memo Input */}
          <div className="mb-5">
            <label className="block text-sm font-bold mb-2" style={{ color: "#8e4f58" }}>
              📝 施術メモ
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="アディクシー サファイア7、3%ワンメイク。肩上ボブ。猫の話で盛り上がった。"
              rows={4}
              className="w-full rounded-xl p-4 text-sm leading-relaxed resize-none"
              style={{
                background: "rgba(255,255,255,0.6)",
                border: "1.5px solid rgba(183,110,121,0.2)",
                color: "#2d2d2d",
              }}
            />
            <p className="text-xs mt-1.5" style={{ color: "#b0909a" }}>
              💡 音声入力でサクッと入力できます
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="mb-4 p-3 rounded-lg text-sm font-medium animate-slide-down"
              style={{
                background: "rgba(239,68,68,0.08)",
                color: "#dc2626",
                border: "1px solid rgba(239,68,68,0.15)",
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="btn-generate"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-1">
                生成中
                <span className="loading-dot" />
                <span className="loading-dot" />
                <span className="loading-dot" />
              </span>
            ) : (
              "✨ 日報 ・ 投稿文を作成"
            )}
          </button>
        </section>

        {/* ===== Result Section ===== */}
        {result && (
          <>
            {/* Karte Result */}
            <section
              className="glass-card p-5 animate-fade-in-up"
              style={{ animationDelay: "0.05s" }}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold" style={{ color: "#8e4f58" }}>
                  📋 カルテ用テキスト
                </h2>
              </div>
              <div
                className="result-text p-4 rounded-xl mb-4"
                style={{
                  background: "rgba(253,242,244,0.5)",
                  border: "1px solid rgba(183,110,121,0.1)",
                }}
              >
                {result.karte_text}
              </div>
              <button
                onClick={() => copyToClipboard(result.karte_text, "karte")}
                className={`btn-copy ${karteCopied ? "copied" : ""}`}
              >
                {karteCopied ? "✅ コピー完了" : "📋 テキストをコピー"}
              </button>
            </section>

            {/* SNS Result */}
            <section
              className="glass-card p-5 animate-fade-in-up"
              style={{ animationDelay: "0.15s" }}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold" style={{ color: "#8e4f58" }}>
                  📸 Instagram用テキスト
                </h2>
              </div>
              <div
                className="result-text p-4 rounded-xl mb-4"
                style={{
                  background: "rgba(253,242,244,0.5)",
                  border: "1px solid rgba(183,110,121,0.1)",
                }}
              >
                {result.sns_text}
              </div>
              <div className="space-y-2.5">
                <button
                  onClick={() => copyToClipboard(result.sns_text, "sns")}
                  className={`btn-copy ${snsCopied ? "copied" : ""}`}
                >
                  {snsCopied ? "✅ コピー完了" : "📋 テキストをコピー"}
                </button>
                <button
                  onClick={() => handleInstagramOpen(result.sns_text)}
                  className="btn-instagram"
                >
                  📸 インスタへ投稿（コピーして起動）
                </button>
              </div>
            </section>

            {/* Reset */}
            <div className="text-center pt-2 pb-4 animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
              <button
                onClick={handleReset}
                className="text-sm font-medium px-6 py-2.5 rounded-full transition-all duration-200 hover:opacity-80"
                style={{
                  color: "#9a7a80",
                  background: "rgba(255,255,255,0.5)",
                  border: "1px solid rgba(183,110,121,0.15)",
                }}
              >
                🔄 新しい施術を入力
              </button>
            </div>
          </>
        )}
      </div>

      {/* Toast */}
      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
    </main>
  );
}
