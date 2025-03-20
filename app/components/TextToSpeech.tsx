"use client";
import { useState, useEffect } from "react";

// 音声オプションの型定義
type VoiceOption = {
  id: string;
  gender: "male" | "female";
  display: string;
};

// 各言語で利用可能な声のマッピング
const VOICE_OPTIONS: { [key: string]: VoiceOption[] } = {
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

const TextToSpeech = () => {
  const [text, setText] = useState("こんにちは、Azure Speech APIです！");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("ja-JP");
  const [voice, setVoice] = useState(VOICE_OPTIONS["ja-JP"][0].id);
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>(VOICE_OPTIONS["ja-JP"]);
  const [pinyin, setPinyin] = useState<string>("");
  const [showPinyin, setShowPinyin] = useState<boolean>(false);
  const [audioData, setAudioData] = useState<Blob | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // テキスト、言語、または声が変更されたときに音声データをフェッチ
  useEffect(() => {
    if (!text.trim()) return;

    // カウントダウンを初期化
    setCountdown(3);

    // カウントダウンの表示を更新するインターバル
    const countdownInterval = setInterval(() => {
      setCountdown((prevCount) => {
        if (prevCount === null || prevCount <= 0.1) return null;
        return Math.round((prevCount - 0.1) * 10) / 10;
      });
    }, 100);

    // 前回のフェッチから1秒待ってからフェッチを開始（タイピング中の頻繁なリクエストを防ぐ）
    const timer = setTimeout(() => {
      clearInterval(countdownInterval);
      setCountdown(null);
      fetchAudioData();
    }, 3000);

    return () => {
      clearTimeout(timer);
      clearInterval(countdownInterval);
    };
  }, [text, language, voice]);

  // 言語が変更されたときに利用可能な声を更新
  useEffect(() => {
    const voices = VOICE_OPTIONS[language] || [];
    setAvailableVoices(voices);
    setVoice(voices.length > 0 ? voices[0].id : "");

    // 中国語以外が選択された場合はピンイン表示をクリア
    if (language !== "zh-CN") {
      setPinyin("");
      setShowPinyin(false);
    } else {
      setShowPinyin(true);
    }
  }, [language]);

  // 音声データをフェッチする関数
  const fetchAudioData = async () => {
    if (!text.trim() || isFetching) return;

    setIsFetching(true);
    try {
      const response = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language, voice }),
      });

      if (!response.ok) throw new Error("音声データの取得に失敗しました");

      // ピンイン情報をヘッダーから取得
      const pinyinHeader = response.headers.get("X-Pinyin");
      if (pinyinHeader) {
        setPinyin(decodeURIComponent(pinyinHeader));
      }

      // 音声データを保存
      const blob = await response.blob();
      setAudioData(blob);
    } catch (error) {
      console.error("エラー:", error);
      setAudioData(null);
    } finally {
      setIsFetching(false);
    }
  };

  // 音声を再生する関数
  const handleSpeak = () => {
    if (!audioData) return;

    setLoading(true);
    try {
      const audioUrl = URL.createObjectURL(audioData);
      const audio = new Audio(audioUrl);

      // 再生が終了したらローディング状態を解除
      audio.onended = () => {
        setLoading(false);
      };

      audio.play();
    } catch (error) {
      console.error("再生エラー:", error);
      setLoading(false);
    }
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);

    if (newLanguage === "en-US") {
      setText("Hello, this is Azure Speech API!");
    } else if (newLanguage === "zh-CN") {
      setText("你好，这是Azure语音API！");
    } else if (newLanguage === "fr-FR") {
      setText("Bonjour, c'est l'API Azure Speech !");
    } else {
      setText("こんにちは、Azure Speech APIです！");
    }
  };

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setVoice(e.target.value);
  };

  // テキスト変更ハンドラの更新
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  return (
    <div className="p-4">
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block mb-2">言語を選択:</label>
          <select
            value={language}
            onChange={handleLanguageChange}
            className="w-full p-2 border rounded"
          >
            <option value="ja-JP">日本語</option>
            <option value="en-US">英語</option>
            <option value="zh-CN">中国語（簡体字）</option>
            <option value="fr-FR">フランス語</option>
          </select>
        </div>

        <div>
          <label className="block mb-2">話者を選択:</label>
          <select
            value={voice}
            onChange={handleVoiceChange}
            className="w-full p-2 border rounded"
          >
            {availableVoices.map(voiceOption => (
              <option key={voiceOption.id} value={voiceOption.id}>
                {voiceOption.display}
              </option>
            ))}
          </select>
        </div>
      </div>

      <textarea
        value={text}
        onChange={handleTextChange}
        className="w-full p-2 border"
        rows={4}
        disabled={loading}
      />

      {/* 中国語の場合はピンインを表示 */}
      {showPinyin && (
        <div className="mt-2 p-3 bg-gray-100 rounded text-gray-700 font-medium">
          <p className="mb-1 text-sm text-gray-500">ピンイン:</p>
          {pinyin ? (
            <p>{pinyin}</p>
          ) : (
            <p className="italic text-gray-400">入力すると自動的にピンインが表示されます</p>
          )}
        </div>
      )}

      <div className="mt-2 flex items-center">
        <button
          onClick={handleSpeak}
          className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          disabled={isFetching || loading || !audioData}
        >
          {loading ? "再生中..." : "読み上げる"}
        </button>

        {isFetching && (
          <span className="ml-3 text-gray-500 inline-flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            音声データを準備中...
          </span>
        )}

        {countdown !== null && (
          <span className="ml-3 text-blue-500 font-medium">
            {countdown}秒後にデータ取得開始...
          </span>
        )}
      </div>
    </div>
  );
};

export default TextToSpeech;
