import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

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

export async function POST(request: NextRequest) {
    try {
        const { menus, memo } = await request.json();

        if (!menus || !memo) {
            return NextResponse.json(
                { error: "メニューとメモを入力してください" },
                { status: 400 }
            );
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "APIキーが設定されていません" },
                { status: 500 }
            );
        }

        const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
                temperature: 0.7,
                topP: 0.95,
                maxOutputTokens: 2048,
            },
        });

        const userPrompt = `# Input Data
メニュー: ${Array.isArray(menus) ? menus.join("、") : menus}
メモ: ${memo}`;

        const result = await model.generateContent([
            { text: SYSTEM_PROMPT },
            { text: userPrompt },
        ]);

        const responseText = result.response.text();

        // JSON部分を抽出（```json ... ``` で囲まれている場合にも対応）
        let jsonStr = responseText;
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
        }

        // JSON先頭・末尾だけを取り出す
        const braceStart = jsonStr.indexOf("{");
        const braceEnd = jsonStr.lastIndexOf("}");
        if (braceStart !== -1 && braceEnd !== -1) {
            jsonStr = jsonStr.substring(braceStart, braceEnd + 1);
        }

        const parsed = JSON.parse(jsonStr);

        return NextResponse.json({
            karte_text: parsed.karte_text || "",
            sns_text: parsed.sns_text || "",
        });
    } catch (error) {
        console.error("Generation error:", error);
        return NextResponse.json(
            { error: "生成中にエラーが発生しました。もう一度お試しください。" },
            { status: 500 }
        );
    }
}
