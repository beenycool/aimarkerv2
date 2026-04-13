'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/components/ui/tooltip';

export interface VoiceDictationButtonProps {
    /** Called with each finalized phrase; parent should append to their field. */
    onAppend: (text: string) => void;
    className?: string;
    disabled?: boolean;
    /** BCP 47 language tag for speech recognition (default British English). */
    lang?: string;
}

type WebSpeechRecognition = {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    onresult: ((event: { resultIndex: number; results: SpeechRecognitionResultList }) => void) | null;
    onerror: ((event: Event & { error?: string }) => void) | null;
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
export function VoiceDictationButton({
    onAppend,
    className,
    disabled,
    lang = 'en-GB',
}: VoiceDictationButtonProps) {
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
        rec.lang = lang;
        rec.interimResults = false;
        rec.continuous = true;

        rec.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (!event.results[i].isFinal) continue;
                const text = event.results[i][0].transcript.trim();
                if (text) onAppend(text);
            }
        };

        rec.onerror = (e) => {
            console.warn('SpeechRecognition error:', (e as { error?: string }).error ?? e.type);
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
    }, [active, disabled, lang, onAppend, stop, supported]);

    useEffect(() => () => stop(), [stop]);

    if (!supported) return null;

    return (
        <TooltipProvider delayDuration={0}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        type="button"
                        variant={active ? 'secondary' : 'outline'}
                        size="icon"
                        className={cn('shrink-0', className)}
                        disabled={disabled}
                        onClick={toggle}
                        aria-pressed={active}
                        aria-label={active ? 'Stop voice input' : 'Speak your answer (microphone)'}
                    >
                        {active ? <MicOff className="h-4 w-4 text-destructive" /> : <Mic className="h-4 w-4" />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{active ? 'Stop recording' : 'Speak your answer — works best in Chrome / Edge'}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
