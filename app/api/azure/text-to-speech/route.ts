import { NextRequest, NextResponse } from "next/server";
import pinyin from "pinyin";

const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY!;
const AZURE_REGION = process.env.AZURE_SPEECH_REGION!;

// ピンイン変換ヘルパー関数
function textToPinyin(text: string): string {
  return pinyin(text, {
    style: pinyin.STYLE_TONE, // 声調付きのピンイン
    heteronym: false // 同音異義語を表示しない
  }).flat().join(' ');
}

// 音声オプションの型定義
type VoiceOption = {
  id: string;
  gender: "male" | "female";
  display: string;
};

type VoiceOptions = {
  [key: string]: VoiceOption[];
};

// 各言語で利用可能な声のマッピング
const VOICE_OPTIONS: VoiceOptions = {
  "ja-JP": [
    { id: "ja-JP-NanamiNeural", gender: "female", display: "七海（女性）" },
    { id: "ja-JP-KeitaNeural", gender: "male", display: "圭太（男性）" },
    { id: "ja-JP-AoiNeural", gender: "female", display: "葵（女性）" },
    { id: "ja-JP-DaichiNeural", gender: "male", display: "大地（男性）" },
    { id: "ja-JP-MayuNeural", gender: "female", display: "まゆ（女性）" },
    { id: "ja-JP-ShioriNeural", gender: "female", display: "志織（女性）" }
  ],
  "en-US": [
    { id: "en-US-JennyNeural", gender: "female", display: "Jenny (女性)" },
    { id: "en-US-GuyNeural", gender: "male", display: "Guy (男性)" },
    { id: "en-US-AriaNeural", gender: "female", display: "Aria (女性)" },
    { id: "en-US-DavisNeural", gender: "male", display: "Davis (男性)" },
    { id: "en-US-AmberNeural", gender: "female", display: "Amber (女性)" },
    { id: "en-US-AndrewNeural", gender: "male", display: "Andrew (男性)" }
  ],
  "zh-CN": [
    { id: "zh-CN-XiaoxiaoNeural", gender: "female", display: "晓晓 (女性)" },
    { id: "zh-CN-YunjianNeural", gender: "male", display: "云健 (男性)" },
    { id: "zh-CN-XiaoyiNeural", gender: "female", display: "晓伊 (女性)" },
    { id: "zh-CN-YunyangNeural", gender: "male", display: "云扬 (男性)" },
    { id: "zh-CN-XiaochenNeural", gender: "female", display: "晓辰 (女性)" },
    { id: "zh-CN-YunxiNeural", gender: "male", display: "云希 (男性)" }
  ],
  "fr-FR": [
    { id: "fr-FR-DeniseNeural", gender: "female", display: "Denise (女性)" },
    { id: "fr-FR-HenriNeural", gender: "male", display: "Henri (男性)" },
    { id: "fr-FR-EloiseNeural", gender: "female", display: "Eloise (女性)" },
    { id: "fr-FR-JacquelineNeural", gender: "female", display: "Jacqueline (女性)" },
    { id: "fr-FR-JeromeNeural", gender: "male", display: "Jerome (男性)" },
    { id: "fr-FR-YvesNeural", gender: "male", display: "Yves (男性)" }
  ]
};

export async function POST(req: NextRequest) {
  try {
    const { text, language, voice } = await req.json();
    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // 中国語の場合はピンインを生成
    let pinyin: string | null = null;
    if (language === 'zh-CN') {
      pinyin = textToPinyin(text);
    }

    // 言語に基づいて音声を選択
    let voiceName: string;
    const langCode = language as string;

    // 指定された音声IDがある場合はそれを使用
    if (voice && VOICE_OPTIONS[langCode]?.some((v: VoiceOption) => v.id === voice)) {
      voiceName = voice;
    } else {
      // デフォルトの音声を選択（各言語の最初の選択肢）
      voiceName = VOICE_OPTIONS[langCode]?.[0]?.id || "ja-JP-NanamiNeural";
    }

    // Azure Speech API のエンドポイント
    const url = `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

    // API リクエスト用のヘッダー
    const headers = {
      "Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
    };

    // SSML（Speech Synthesis Markup Language）でリクエストボディを作成
    const ssml = `
      <speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${langCode}'>
        <voice name='${voiceName}'>${text}</voice>
      </speak>`;

    // API にリクエストを送信
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: ssml,
    });

    if (!response.ok) {
      console.error(`Azure APIエラー: ${response.status} ${response.statusText}`);
      const errorBody = await response.text().catch(() => "エラーボディの取得に失敗");
      console.error("エラーの詳細:", errorBody);
      throw new Error("Failed to fetch audio from Azure Speech API");
    }

    // 取得した音声データを返す
    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "X-Pinyin": pinyin ? encodeURIComponent(pinyin) : "" // ピンイン情報をヘッダーに追加
      },
    });
  } catch (error) {
    console.error("❌ APIエラー:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
