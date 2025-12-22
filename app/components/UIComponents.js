'use client';

import React, { useState, memo } from 'react';
import DOMPurify from 'dompurify';
import { Upload, CheckCircle, Brain, ChevronRight, RefreshCw, Sparkles, Send } from 'lucide-react';

/**
 * Safe Markdown Text Renderer using DOMPurify
 */
export const MarkdownText = memo(({ text, className = "" }) => {
    if (!text) return null;
    const sanitized = DOMPurify.sanitize(text, { ALLOWED_TAGS: ['strong', 'em', 'span', 'br'], ALLOWED_ATTR: ['class'] });
    let html = sanitized
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/\$(.*?)\$/g, "<span class='font-mono bg-slate-100 text-indigo-700 px-1 rounded text-xs'>$1</span>")
        .replace(/\\n/g, "<br/>")
        .replace(/\n/g, "<br/>");
    return <div className={`whitespace-pre-wrap leading-relaxed ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
});
MarkdownText.displayName = 'MarkdownText';

/**
 * File Upload Zone Component
 */
export const FileUploadZone = memo(({ label, onUpload, file }) => (
    <div className="flex flex-col items-center justify-center w-full mb-4">
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-50 border-slate-300 transition-colors group">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {file ? (
                    <>
                        <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                        <p className="text-sm text-slate-700 font-medium">{file.name}</p>
                    </>
                ) : (
                    <>
                        <Upload className="w-8 h-8 text-slate-400 mb-2 group-hover:text-indigo-500 transition-colors" />
                        <p className="text-sm text-slate-500"><span className="font-semibold">Click to upload</span> {label}</p>
                        <p className="text-xs text-slate-400">PDF only</p>
                    </>
                )}
            </div>
            <input type="file" className="hidden" accept=".pdf" onChange={(e) => onUpload(e.target.files[0])} />
        </label>
    </div>
));
FileUploadZone.displayName = 'FileUploadZone';

/**
 * Feedback Block Component - Shows marking results and follow-up chat
 */
export const FeedbackBlock = memo(({ feedback, onNext, explanation, onExplain, explaining, questionId, onFollowUp, followUpChat, sendingFollowUp }) => {
    const [followUpText, setFollowUpText] = useState("");

    if (!feedback) return null;

    const handleSend = () => {
        if (!followUpText.trim()) return;
        onFollowUp(followUpText);
        setFollowUpText("");
    };

    return (
        <div className="mt-6 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
                <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    <h3 className="font-bold">Marking Analysis</h3>
                </div>
                <div className="font-mono bg-indigo-800 px-3 py-1 rounded-full text-sm">
                    Score: {feedback.score}/{feedback.totalMarks}
                </div>
            </div>

            <div className="p-5 space-y-4">
                <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Feedback</h4>
                    <div className="text-slate-700 text-sm"><MarkdownText text={feedback.text} /></div>
                </div>

                {(feedback.primaryFlaw || feedback.aoBreakdown || feedback.audit) && (
                    <details className="bg-white border border-slate-200 rounded-lg p-3">
                        <summary className="cursor-pointer text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-indigo-500" /> Examiner details
                        </summary>
                        <div className="mt-3 space-y-2 text-sm text-slate-700">
                            {feedback.primaryFlaw && (
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Primary weakness</div>
                                    <div>{feedback.primaryFlaw}</div>
                                </div>
                            )}

                            {feedback.aoBreakdown && (
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">AO breakdown</div>
                                    <ul className="list-disc list-inside space-y-1">
                                        {Object.entries(feedback.aoBreakdown).map(([k, v]) => (
                                            <li key={k}><span className="font-mono">{k}</span>: {String(v)}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {feedback.audit && (
                                <div className="text-xs text-slate-500">
                                    {feedback.audit.graderModel && <div>Grader model: <span className="font-mono">{feedback.audit.graderModel}</span></div>}
                                    {feedback.audit.tutorModel && <div>Tutor model: <span className="font-mono">{feedback.audit.tutorModel}</span></div>}
                                </div>
                            )}
                        </div>
                    </details>
                )}

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Improved Answer (Changes in Bold)</h4>
                    <div className="text-slate-800 font-serif text-sm"><MarkdownText text={feedback.rewrite} /></div>
                </div>

                {!explanation && (
                    <button onClick={onExplain} disabled={explaining} className="w-full py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors">
                        {explaining ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {explaining ? "Preparing explanation..." : "Explain Why"}
                    </button>
                )}

                {explanation && (
                    <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg animate-in fade-in">
                        <h4 className="flex items-center gap-2 text-indigo-800 font-bold text-sm mb-2"><Sparkles className="w-4 h-4" /> Explanation</h4>
                        <div className="text-indigo-900 text-sm leading-relaxed"><MarkdownText text={explanation} /></div>
                    </div>
                )}

                <div className="border-t border-slate-100 pt-4 mt-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Ask a Follow-up Question</h4>
                    {followUpChat && followUpChat.length > 0 && (
                        <div className="space-y-3 mb-3 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-lg">
                            {followUpChat.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-2 rounded-lg text-sm ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-800' : 'bg-white border border-slate-200 text-slate-700'}`}>
                                        <MarkdownText text={msg.text} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex gap-2">
                        <input type="text" value={followUpText} onChange={(e) => setFollowUpText(e.target.value)} placeholder="e.g., Why was my answer wrong?" className="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
                        <button onClick={handleSend} disabled={sendingFollowUp || !followUpText.trim()} className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                            {sendingFollowUp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                <button onClick={onNext} className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors">
                    Next Question <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
});
FeedbackBlock.displayName = 'FeedbackBlock';