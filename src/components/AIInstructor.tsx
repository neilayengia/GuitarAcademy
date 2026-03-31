import React, { useState, useEffect, useRef } from "react";
import { Mic, Square, Activity, Volume2, AlertCircle } from "lucide-react";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { useAuth } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";

function floatTo16BitPCM(input: Float32Array) {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export default function AIInstructor() {
  const { profile } = useAuth();
  
  if (profile?.subscription_tier !== 'pro') {
    return <Navigate to="/pricing" replace />;
  }

  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<
    { role: "user" | "ai"; text: string }[]
  >([]);

  const [knowledgeStatus, setKnowledgeStatus] = useState<{
    totalChunks: number;
    sources: { name: string; chunks: number }[];
  } | null>(null);

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);

  // Fetch knowledge base status on mount
  useEffect(() => {
    fetch('/api/status')
      .then(res => res.json())
      .then(data => setKnowledgeStatus(data))
      .catch(() => setKnowledgeStatus(null)); // server not running
  }, []);

  /**
   * Query the local knowledge base for relevant context.
   * Returns formatted text to inject into the system prompt.
   */
  const fetchKnowledgeContext = async (): Promise<string> => {
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'guitar harmony voice leading chords scales improvisation theory',
          topK: 8,
        }),
      });
      if (!res.ok) return '';
      const data = await res.json();
      if (!data.results || data.results.length === 0) return '';

      const context = data.results
        .map((r: any, i: number) => `[${i + 1}] (from ${r.source}):\n${r.text}`)
        .join('\n\n');

      return `\n\n--- REFERENCE MATERIAL FROM USER'S BOOKS ---\nThe following excerpts are from the student's own study materials. Use them to inform your teaching when relevant:\n\n${context}\n\n--- END REFERENCE MATERIAL ---`;
    } catch {
      // Knowledge server not running — that's fine, proceed without it
      return '';
    }
  };

  const connectToInstructor = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Securely fetch the API key at runtime so it's not bundled in the client code
      const credsRes = await fetch('http://localhost:3001/api/credentials');
      if (!credsRes.ok) throw new Error("Failed to fetch credentials from local server.");
      const { apiKey } = await credsRes.json();

      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured on the server.");
      }
      const ai = new GoogleGenAI({ apiKey });

      // 1. Fetch knowledge context (non-blocking — falls back gracefully)
      const knowledgeContext = await fetchKnowledgeContext();

      // 2. Get Microphone Access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        },
      });
      mediaStreamRef.current = stream;

      // 3. Initialize Audio Contexts
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      playbackContextRef.current = new AudioContext({ sampleRate: 24000 });
      nextPlayTimeRef.current = playbackContextRef.current.currentTime;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      // 4. Initialize Gemini Live with knowledge-augmented system prompt
      const basePrompt = "You are an expert guitar instructor from Berklee College of Music. You help students with advanced harmony, voice leading, chord changes, and modal interchange. Listen to their playing and answer their questions concisely and encouragingly.";

      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: basePrompt + knowledgeContext,
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
            setTranscript((prev) => [
              ...prev,
              { role: "ai", text: "Session connected. I'm listening!" },
            ]);

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcm16 = floatTo16BitPCM(inputData);
              const base64Data = arrayBufferToBase64(pcm16.buffer);

              sessionPromise
                .then((session) => {
                  session.sendRealtimeInput({
                    media: {
                      data: base64Data,
                      mimeType: "audio/pcm;rate=16000",
                    },
                  });
                })
                .catch(console.error);
            };

            source.connect(processor);
            processor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle audio output
            const base64Audio =
              message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && playbackContextRef.current) {
              const binaryString = atob(base64Audio);
              const len = binaryString.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const int16Array = new Int16Array(bytes.buffer);
              const float32Array = new Float32Array(int16Array.length);
              for (let i = 0; i < int16Array.length; i++) {
                float32Array[i] = int16Array[i] / 32768.0;
              }

              const audioBuffer = playbackContextRef.current.createBuffer(
                1,
                float32Array.length,
                24000
              );
              audioBuffer.getChannelData(0).set(float32Array);

              const sourceNode = playbackContextRef.current.createBufferSource();
              sourceNode.buffer = audioBuffer;
              sourceNode.connect(playbackContextRef.current.destination);

              const currentTime = playbackContextRef.current.currentTime;
              if (nextPlayTimeRef.current < currentTime) {
                nextPlayTimeRef.current = currentTime;
              }
              sourceNode.start(nextPlayTimeRef.current);
              nextPlayTimeRef.current += audioBuffer.duration;
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              if (playbackContextRef.current) {
                playbackContextRef.current.close();
                playbackContextRef.current = new AudioContext({
                  sampleRate: 24000,
                });
                nextPlayTimeRef.current =
                  playbackContextRef.current.currentTime;
              }
            }
          },
          onclose: () => {
            disconnect();
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setError("Connection error occurred.");
            disconnect();
          },
        },
      });

      sessionRef.current = sessionPromise;
    } catch (err: any) {
      console.error("Failed to connect to AI Instructor:", err);
      setError(err.message || "Failed to access microphone or connect to AI.");
      setIsConnecting(false);
      disconnect();
    }
  };

  const disconnect = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (playbackContextRef.current) {
      playbackContextRef.current.close();
      playbackContextRef.current = null;
    }
    if (sessionRef.current) {
      sessionRef.current
        .then((session: any) => session.close())
        .catch(console.error);
      sessionRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setTranscript((prev) => [
      ...prev,
      { role: "ai", text: "Session ended. Keep practicing!" },
    ]);
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return (
    <div className="flex-1 p-8 flex flex-col h-full bg-[#0f0f0f]">
      <header className="mb-8">
        <p className="text-[11px] tracking-[2px] uppercase text-[#555] mb-2">Live Session</p>
        <h2 className="text-3xl font-bold tracking-tight text-white">
          AI <span className="font-light opacity-30">Instructor</span>
        </h2>
        <p className="text-[#888888] mt-1">
          Real-time voice and audio analysis powered by Gemini.
        </p>
        {knowledgeStatus && knowledgeStatus.totalChunks > 0 ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Knowledge base active — {knowledgeStatus.totalChunks} chunks from{" "}
              {knowledgeStatus.sources.length} source(s)
            </span>
          </div>
        ) : knowledgeStatus !== null ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-[#555]">
            <div className="w-2 h-2 rounded-full bg-[#555]" />
            <span>
              No knowledge loaded — drop PDFs in <code className="text-[#888888]">knowledge/</code> and run{" "}
              <code className="text-[#888888]">npm run knowledge:ingest</code>
            </span>
          </div>
        ) : null}
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Main Interaction Area */}
        <div className="lg:col-span-2 bg-[#1a1a1a] border border-[#222222] rounded-2xl p-8 flex flex-col items-center justify-center relative overflow-hidden">
          {/* Atmospheric Background */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_0%,transparent_70%)] pointer-events-none" />

          {error && (
            <div className="absolute top-4 left-4 right-4 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center gap-3">
              <AlertCircle size={20} />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="relative z-10 flex flex-col items-center">
            <div
              className={`w-48 h-48 rounded-full border-2 flex items-center justify-center mb-8 transition-all duration-500 ${isConnected
                ? "border-white shadow-[0_0_50px_rgba(255,255,255,0.1)] bg-white/5"
                : "border-[#2a2a2a] bg-[#1e1e1e]"
                }`}
            >
              {isConnected ? (
                <div className="relative flex items-center justify-center w-full h-full">
                  <Activity
                    size={64}
                    className="text-white animate-pulse"
                  />
                  {/* Mock Audio Waves */}
                  <div
                    className="absolute inset-0 rounded-full border border-white/20 animate-ping opacity-20"
                    style={{ animationDuration: "2s" }}
                  />
                  <div
                    className="absolute inset-0 rounded-full border border-white/10 animate-ping opacity-10"
                    style={{ animationDuration: "3s", animationDelay: "0.5s" }}
                  />
                </div>
              ) : (
                <Mic size={64} className="text-[#555]" />
              )}
            </div>

            <h3 className="text-2xl font-bold mb-2 text-white">
              {isConnected ? "Listening..." : "Start Session"}
            </h3>
            <p className="text-[#888888] text-center max-w-md mb-8">
              {isConnected
                ? "Play your guitar or ask a question. The AI will analyze your playing and provide instant feedback."
                : "Connect with the AI instructor for real-time feedback on your technique, timing, and harmony."}
            </p>

            {isConnected ? (
              <button
                onClick={disconnect}
                className="flex items-center gap-3 px-8 py-4 rounded-full bg-[#2a2a2a] border border-[#333] text-white hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all group"
              >
                <Square size={20} className="fill-current" />
                <span className="font-bold tracking-wide">END SESSION</span>
              </button>
            ) : (
              <button
                onClick={connectToInstructor}
                disabled={isConnecting}
                className="flex items-center gap-3 px-8 py-4 rounded-full bg-white text-black hover:bg-white/90 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                {isConnecting ? (
                  <Activity size={20} className="animate-spin" />
                ) : (
                  <Mic size={20} />
                )}
                <span className="font-bold tracking-wide">
                  {isConnecting ? "CONNECTING..." : "CONNECT INSTRUCTOR"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Transcript / Feedback Area */}
        <div className="bg-[#1a1a1a] border border-[#222222] rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#222222] flex items-center justify-between bg-[#1e1e1e]">
            <h3 className="text-[11px] tracking-[2px] uppercase text-[#555]">
              Live Transcript
            </h3>
            <Volume2 size={16} className="text-[#555]" />
          </div>

          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {transcript.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[#555] text-sm text-center italic">
                Transcript will appear here once the session starts.
              </div>
            ) : (
              transcript.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <span className="text-[10px] font-mono text-[#555] uppercase mb-1 tracking-wider">
                    {msg.role === "user" ? "You" : "Instructor"}
                  </span>
                  <div
                    className={`p-4 rounded-2xl max-w-[85%] ${msg.role === "user"
                      ? "bg-[#2a2a2a] text-white rounded-tr-sm"
                      : "bg-white/5 border border-[#2a2a2a] text-[#888888] rounded-tl-sm"
                      }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
