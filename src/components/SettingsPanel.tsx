import React from "react";
import { X, RotateCcw, Crown, LogOut } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { useAuth } from "../contexts/AuthContext";

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

interface SettingsPanelProps {
    open: boolean;
    onClose: () => void;
}

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
    const { settings, updateSettings, resetProgress } = useAppStore();
    const { profile, signOut } = useAuth();

    if (!open) return null;

    const isPro = profile?.subscription_tier === 'pro' || profile?.subscription_tier === 'lifetime';

    const handleReset = () => {
        if (window.confirm('Reset all progress? This cannot be undone.')) {
            resetProgress();
        }
    };

    return (
        <div className="fixed inset-0 z-50" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur" />
            <div
                className="absolute right-0 top-0 h-full w-full max-w-md bg-[#0f0f0f] border-l border-[#1a1a1a] flex flex-col shadow-2xl animate-slide-in-right"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 border-b border-[#1a1a1a] flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Settings</h2>
                    <button onClick={onClose} className="p-2 rounded-lg text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors" aria-label="Close settings">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {profile && (
                        <div>
                            <label className="text-[11px] tracking-[2px] uppercase text-[#555] mb-3 block">Account</label>
                            <div className="bg-[#1a1a1a] border border-[#222222] rounded-2xl p-4">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-[#2a2a2a] border border-[#333] flex items-center justify-center text-white font-bold">
                                        {(profile.display_name || profile.email)[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-white truncate">{profile.display_name || profile.email.split('@')[0]}</p>
                                        <p className="text-xs text-[#888888] truncate">{profile.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between py-3 border-t border-[#2a2a2a]">
                                    <div className="flex items-center gap-2">
                                        <Crown size={14} className={isPro ? "text-[#d4a44a]" : "text-[#555]"} />
                                        <span className="text-sm text-[#888888]">Plan</span>
                                    </div>
                                    <span className={`text-sm font-semibold ${isPro ? 'text-[#d4a44a]' : 'text-[#888888]'}`}>{isPro ? 'Pro' : 'Free'}</span>
                                </div>
                                <button onClick={signOut} className="w-full flex items-center justify-center gap-2 mt-3 px-4 py-2.5 rounded-xl bg-[#2a2a2a] border border-[#333] text-[#888888] hover:text-white hover:bg-[#333] transition-all text-sm">
                                    <LogOut size={14} />
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="text-[11px] tracking-[2px] uppercase text-[#555] mb-3 block">Preferred Root Note</label>
                        <div className="grid grid-cols-6 gap-2">
                            {NOTES.map(note => (
                                <button key={note} onClick={() => updateSettings({ preferredRoot: note })}
                                    className={`py-2 rounded-xl text-sm font-semibold transition-all ${settings.preferredRoot === note
                                        ? 'bg-white text-black'
                                        : 'bg-[#1a1a1a] text-[#555] border border-[#2a2a2a] hover:text-white hover:bg-[#2a2a2a]'}`}>
                                    {note}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-sm text-white">Show Intervals</p>
                            <p className="text-[#555] text-xs mt-1">Display interval labels on fretboard</p>
                        </div>
                        <button onClick={() => updateSettings({ showIntervals: !settings.showIntervals })}
                            className={`w-12 h-7 rounded-full transition-all relative ${settings.showIntervals ? 'bg-white' : 'bg-[#2a2a2a]'}`} aria-label="Toggle show intervals">
                            <div className={`w-5 h-5 rounded-full absolute top-1 transition-all shadow-sm ${settings.showIntervals ? 'left-6 bg-black' : 'left-1 bg-[#555]'}`} />
                        </button>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <p className="font-medium text-sm text-white">Metronome Volume</p>
                            <span className="text-xs font-medium text-[#888888]">{Math.round(settings.metronomeVolume * 100)}%</span>
                        </div>
                        <input type="range" min="0" max="1" step="0.05" value={settings.metronomeVolume}
                            onChange={(e) => updateSettings({ metronomeVolume: parseFloat(e.target.value) })}
                            className="w-full accent-white h-2 bg-[#2a2a2a] rounded-full cursor-pointer" />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <p className="font-medium text-sm text-white">Default BPM</p>
                            <span className="text-xs font-medium text-[#888888]">{settings.defaultBpm}</span>
                        </div>
                        <input type="range" min="40" max="240" step="5" value={settings.defaultBpm}
                            onChange={(e) => updateSettings({ defaultBpm: parseInt(e.target.value) })}
                            className="w-full accent-white h-2 bg-[#2a2a2a] rounded-full cursor-pointer" />
                    </div>
                </div>

                <div className="p-6 border-t border-[#1a1a1a]">
                    <button onClick={handleReset}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-sm font-medium">
                        <RotateCcw size={16} />
                        Reset All Progress
                    </button>
                </div>
            </div>
        </div>
    );
}
