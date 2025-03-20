"use client";
import { useState, useEffect } from "react";

// 音声オプションの型定義
type VoiceOption = {
    id: string;
    gender: "male" | "female";
    display: string;
};

const AzureLanguage: { [key: string]: string } = {
    "japanese": "ja-JP",
    "english": "en-US",
    "chinese": "zh-CN",
    "french": "fr-FR"
}

// 各言語で利用可能な声のマッピング
const VOICE_OPTIONS: { [key: string]: VoiceOption[] } = {
    "japanese": [
        { id: "ja-JP-NanamiNeural", gender: "female", display: "七海（女性）" },
        { id: "ja-JP-KeitaNeural", gender: "male", display: "圭太（男性）" },
        { id: "ja-JP-AoiNeural", gender: "female", display: "葵（女性）" },
        { id: "ja-JP-DaichiNeural", gender: "male", display: "大地（男性）" },
        { id: "ja-JP-MayuNeural", gender: "female", display: "まゆ（女性）" },
        { id: "ja-JP-ShioriNeural", gender: "female", display: "志織（女性）" }
    ],
    "english": [
        { id: "en-US-JennyNeural", gender: "female", display: "Jenny (女性)" },
        { id: "en-US-GuyNeural", gender: "male", display: "Guy (男性)" },
        { id: "en-US-AriaNeural", gender: "female", display: "Aria (女性)" },
        { id: "en-US-DavisNeural", gender: "male", display: "Davis (男性)" },
        { id: "en-US-AmberNeural", gender: "female", display: "Amber (女性)" },
        { id: "en-US-AndrewNeural", gender: "male", display: "Andrew (男性)" }
    ],
    "chinese": [
        { id: "zh-CN-XiaoxiaoNeural", gender: "female", display: "晓晓 (女性)" },
        { id: "zh-CN-YunjianNeural", gender: "male", display: "云健 (男性)" },
        { id: "zh-CN-XiaoyiNeural", gender: "female", display: "晓伊 (女性)" },
        { id: "zh-CN-YunyangNeural", gender: "male", display: "云扬 (男性)" },
        { id: "zh-CN-XiaochenNeural", gender: "female", display: "晓辰 (女性)" },
        { id: "zh-CN-YunxiNeural", gender: "male", display: "云希 (男性)" }
    ],
    "french": [
        { id: "fr-FR-DeniseNeural", gender: "female", display: "Denise (女性)" },
        { id: "fr-FR-HenriNeural", gender: "male", display: "Henri (男性)" },
        { id: "fr-FR-EloiseNeural", gender: "female", display: "Eloise (女性)" },
        { id: "fr-FR-JacquelineNeural", gender: "female", display: "Jacqueline (女性)" },
        { id: "fr-FR-JeromeNeural", gender: "male", display: "Jerome (男性)" },
        { id: "fr-FR-YvesNeural", gender: "male", display: "Yves (男性)" }
    ]
};

const TextToSpeechForApp = ({ text = "hello world, this is a test message, please check if the text is being read correctly", language = "english" }: { text: string, language: string }) => {
    const [loading, setLoading] = useState(false);
    const [voice, setVoice] = useState(VOICE_OPTIONS[language][0].id);
    const [audioData, setAudioData] = useState<Blob | null>(null);
    const [isFetching, setIsFetching] = useState(true);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    const availableVoices = VOICE_OPTIONS[language];

    // テキスト、言語、または声が変更されたときに音声データをフェッチ
    useEffect(() => {
        if (!text.trim()) return;

        fetchAudioData();

    }, [voice]);

    // 音声データをフェッチする関数
    const fetchAudioData = async () => {
        if (!text.trim()) return;

        setIsFetching(true);
        try {
            const response = await fetch("/api/azure/text-to-speech", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, language: AzureLanguage[language], voice }),
            });

            if (!response.ok) throw new Error("音声データの取得に失敗しました");

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
            setAudioUrl(audioUrl);
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

    const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setVoice(e.target.value);
    };

    return (
        <>
            <div className="flex items-center gap-x-2">
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
                <button
                    onClick={handleSpeak}
                    className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={isFetching || loading || !audioData}
                >
                    {isFetching ? "準備中..." : !audioData ? "音声エラー" : loading ? "再生中..." : "読み上げる"}
                </button>
                <audio controls autoPlay src={audioUrl}></audio>
            </div>
        </>

    );
};

export default TextToSpeechForApp;
