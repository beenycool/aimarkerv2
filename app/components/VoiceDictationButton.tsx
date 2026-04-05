'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/lib/utils';

export interface VoiceDictationButtonProps {
    /** Called with each finalized phrase; parent should append to their field. */
    onAppend: (text: string) => void;
    className?: string;
    disabled?: boolean;
}

type WebSpeechRecognition = {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    onresult: ((event: { resultIndex: number; results: SpeechRecognitionResultList }) => void) | null;
    onerror: (() => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
};

type WebSpeechRecognitionCtor = new () => WebSpeechRecognition;

function getSpeechRecognitionCtor(): WebSpeechRecognitionCtor | undefined {
    if (typeof window === 'undefined') return undefined;
    const w = window as unknown as {
        SpeechRecognition?: WebSpeechRecognitionCtor;
        webkitSpeechRecognition?: WebSpeechRecognitionCtor;
    };
    return w.SpeechRecognition || w.webkitSpeechRecognition;
}

/**
 * Web Speech API dictation (Chrome/Edge/Safari). Hidden when unsupported.
 */
export function VoiceDictationButton({ onAppend, className, disabled }: VoiceDictationButtonProps) {
    const [active, setActive] = useState(false);
    const [supported, setSupported] = useState(false);
    const recRef = useRef<WebSpeechRecognition | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const SR = getSpeechRecognitionCtor();
        setSupported(Boolean(SR));
    }, []);

    const stop = useCallback(() => {
        try {
            recRef.current?.stop();
        } catch {
            /* ignore */
        }
        recRef.current = null;
        setActive(false);
    }, []);

    const toggle = useCallback(() => {
        if (disabled || !supported) return;
        if (active) {
            stop();
            return;
        }
        const SR = getSpeechRecognitionCtor();
        if (!SR) return;

        const rec = new SR();
        rec.lang = 'en-GB';
        rec.interimResults = false;
        rec.continuous = true;

        rec.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (!event.results[i].isFinal) continue;
                const text = event.results[i][0].transcript.trim();
                if (text) onAppend(text);
            }
        };

        rec.onerror = () => {
            setActive(false);
            recRef.current = null;
        };

        rec.onend = () => {
            setActive(false);
            recRef.current = null;
        };

        try {
            rec.start();
            recRef.current = rec;
            setActive(true);
        } catch {
            setActive(false);
        }
    }, [active, disabled, onAppend, stop, supported]);

    useEffect(() => () => stop(), [stop]);

    if (!supported) return null;

    return (
        <Button
            type="button"
            variant={active ? 'secondary' : 'outline'}
            size="icon"
            className={cn('shrink-0', className)}
            disabled={disabled}
            onClick={toggle}
            aria-pressed={active}
            aria-label={active ? 'Stop voice input' : 'Speak your answer (microphone)'}
            title={active ? 'Stop recording' : 'Speak your answer — works best in Chrome / Edge'}
        >
            {active ? <MicOff className="h-4 w-4 text-destructive" /> : <Mic className="h-4 w-4" />}
        </Button>
    );
}
