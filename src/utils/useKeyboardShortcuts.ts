/**
 * useKeyboardShortcuts.ts — Global keyboard shortcut handler
 *
 * Registers navigation and action shortcuts.
 * Ignores keypresses when the user is focused inside an input / textarea.
 */

import { useEffect, useCallback, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export interface ShortcutEntry {
    key: string;
    description: string;
    scope: 'global' | string; // route path or 'global'
}

export const SHORTCUTS: ShortcutEntry[] = [
    { key: 'p', description: 'Go to Practice Room', scope: 'global' },
    { key: 'f', description: 'Go to Fretboard Explorer', scope: 'global' },
    { key: 'c', description: 'Go to Curriculum', scope: 'global' },
    { key: 'v', description: 'Go to Chord Voicings', scope: 'global' },
    { key: 'i', description: 'Go to AI Instructor', scope: 'global' },
    { key: 'a', description: 'Go to Performance Analysis', scope: 'global' },
    { key: '?', description: 'Toggle shortcuts help', scope: 'global' },
];

export function useKeyboardShortcuts() {
    const navigate = useNavigate();
    const location = useLocation();
    const [showHelp, setShowHelp] = useState(false);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            // Don't intercept when typing in inputs / textareas / contenteditable
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
                return;
            }

            // Don't intercept when modifier keys are held (Cmd, Ctrl, Alt)
            if (e.metaKey || e.ctrlKey || e.altKey) return;

            switch (e.key) {
                case 'p':
                    e.preventDefault();
                    navigate('/practice');
                    break;
                case 'f':
                    e.preventDefault();
                    navigate('/fretboard');
                    break;
                case 'c':
                    e.preventDefault();
                    navigate('/');
                    break;
                case 'v':
                    e.preventDefault();
                    navigate('/voicings');
                    break;
                case 'i':
                    e.preventDefault();
                    navigate('/instructor');
                    break;
                case 'a':
                    e.preventDefault();
                    navigate('/analysis');
                    break;
                case '?':
                    e.preventDefault();
                    setShowHelp(prev => !prev);
                    break;
                case 'Escape':
                    if (showHelp) {
                        e.preventDefault();
                        setShowHelp(false);
                    }
                    break;
            }
        },
        [navigate, location.pathname, showHelp]
    );

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return { showHelp, setShowHelp };
}
