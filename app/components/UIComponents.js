'use client';

import React, { useState, memo } from 'react';
import DOMPurify from 'dompurify';
import { Upload, CheckCircle, Brain, ChevronRight, RefreshCw, Sparkles, Send } from 'lucide-react';
import katex from 'katex';


/**
 * Safe Markdown Text Renderer using DOMPurify
 */
export const MarkdownText = memo(({ text, className = "" }) => {
    if (!text) return null;

    const escapeHtml = (value) => value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const classNames = {
        paragraph: "mb-2 last:mb-0",
        unorderedList: "list-disc pl-5 my-2 space-y-1",
        orderedList: "list-decimal pl-5 my-2 space-y-1",
        listItem: "leading-relaxed",
        blockquote: "border-l-4 border-border pl-3 italic my-2",
        inlineCode: "font-mono text-xs bg-muted/50 text-current px-1 py-0.5 rounded",
        inlineMath: "font-mono bg-muted/50 text-primary px-1 rounded text-xs",
        codeBlock: "font-mono text-xs text-current",
        pre: "bg-muted/50 p-3 rounded overflow-x-auto my-2",
        h1: "text-lg font-semibold mt-4 mb-2",
        h2: "text-base font-semibold mt-4 mb-2",
        h3: "text-sm font-semibold mt-3 mb-1",
        h4: "text-sm font-semibold mt-3 mb-1"
    };

    const renderInline = (value) => {
        let escaped = escapeHtml(value);
        const tokens = [];
        const stash = (html) => {
            const token = `@@INLINE_${tokens.length}@@`;
            tokens.push(html);
            return token;
        };

        // Handle inline code first
        escaped = escaped.replace(/`([^`]+)`/g, (_match, code) =>
            stash(`<code class="${classNames.inlineCode}">${code}</code>`)
        );

        // Handle inline math $...$
        escaped = escaped.replace(/\$((?!\$)(?:\\\$|[^\$])+)\$/g, (_match, content) => {
            try {
                const rendered = katex.renderToString(content, { displayMode: false, throwOnError: false });
                return stash(`<span class="inline-math">${rendered}</span>`);
            } catch (err) {
                console.error("KaTeX error:", err);
                return stash(`<span class="${classNames.inlineMath}">${content}</span>`);
            }
        });

        escaped = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        escaped = escaped.replace(/__(.+?)__/g, "<strong>$1</strong>");
        escaped = escaped.replace(/\*(.+?)\*/g, "<em>$1</em>");
        escaped = escaped.replace(/_(.+?)_/g, "<em>$1</em>");

        tokens.forEach((html, index) => {
            escaped = escaped.replace(`@@INLINE_${index}@@`, html);
        });
        return escaped;
    };


    const renderMarkdown = (rawText) => {
        const normalized = String(rawText).replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
        const lines = normalized.split("\n");
        const html = [];
        let i = 0;

        const isHeading = (line) => /^#{1,4}\s+/.test(line);
        const isUnordered = (line) => /^[-+*]\s+/.test(line);
        const isOrdered = (line) => /^\d+\.\s+/.test(line);
        const isBlockquote = (line) => /^>\s+/.test(line);
        const isCodeFence = (line) => /^```/.test(line);
        const isMathBlock = (line) => /^\$\$/.test(line);

        while (i < lines.length) {
            const line = lines[i];
            if (!line || !line.trim()) {
                i += 1;
                continue;
            }

            if (isMathBlock(line)) {
                let content = line.slice(2);
                i += 1;
                while (i < lines.length && !isMathBlock(lines[i])) {
                    content += "\n" + lines[i];
                    i += 1;
                }
                if (i < lines.length) {
                    content += "\n" + lines[i].replace(/\$\$.*/, "");
                    i += 1;
                }
                try {
                    const rendered = katex.renderToString(content.replace(/\$\$$/, ""), { displayMode: true, throwOnError: false });
                    html.push(`<div class="math-block my-4">${rendered}</div>`);
                } catch (err) {
                    console.error("KaTeX block error:", err);
                    html.push(`<div class="bg-muted p-2 rounded font-mono text-xs my-2">$$${content}$$</div>`);
                }
                continue;
            }

            if (isCodeFence(line)) {
                const language = line.slice(3).trim();
                i += 1;
                const codeLines = [];
                while (i < lines.length && !isCodeFence(lines[i])) {
                    codeLines.push(lines[i]);
                    i += 1;
                }
                if (i < lines.length) i += 1;
                const codeContent = escapeHtml(codeLines.join("\n"));
                const langClass = language ? ` language-${escapeHtml(language)}` : "";
                html.push(
                    `<pre class="${classNames.pre}"><code class="${classNames.codeBlock}${langClass}">${codeContent}</code></pre>`
                );
                continue;
            }

            const headingMatch = line.match(/^(#{1,4})\s+(.*)$/);
            if (headingMatch) {
                const level = headingMatch[1].length;
                const content = renderInline(headingMatch[2]);
                const headingClass = classNames[`h${level}`];
                html.push(`<h${level} class="${headingClass}">${content}</h${level}>`);
                i += 1;
                continue;
            }

            if (isBlockquote(line)) {
                const quoteLines = [];
                while (i < lines.length && isBlockquote(lines[i])) {
                    quoteLines.push(lines[i].replace(/^>\s?/, ""));
                    i += 1;
                }
                const quoteContent = renderInline(quoteLines.join(" "));
                html.push(`<blockquote class="${classNames.blockquote}">${quoteContent}</blockquote>`);
                continue;
            }

            if (isUnordered(line)) {
                const items = [];
                while (i < lines.length && isUnordered(lines[i])) {
                    items.push(lines[i].replace(/^[-+*]\s+/, ""));
                    i += 1;
                }
                const listItems = items
                    .map((item) => `<li class="${classNames.listItem}">${renderInline(item)}</li>`)
                    .join("");
                html.push(`<ul class="${classNames.unorderedList}">${listItems}</ul>`);
                continue;
            }

            if (isOrdered(line)) {
                const items = [];
                while (i < lines.length && isOrdered(lines[i])) {
                    items.push(lines[i].replace(/^\d+\.\s+/, ""));
                    i += 1;
                }
                const listItems = items
                    .map((item) => `<li class="${classNames.listItem}">${renderInline(item)}</li>`)
                    .join("");
                html.push(`<ol class="${classNames.orderedList}">${listItems}</ol>`);
                continue;
            }

            const paragraphLines = [line];
            i += 1;
            while (
                i < lines.length &&
                lines[i].trim() !== "" &&
                !isHeading(lines[i]) &&
                !isUnordered(lines[i]) &&
                !isOrdered(lines[i]) &&
                !isBlockquote(lines[i]) &&
                !isCodeFence(lines[i]) &&
                !isMathBlock(lines[i])
            ) {
                paragraphLines.push(lines[i]);
                i += 1;
            }
            const paragraphText = paragraphLines.join(" ");
            html.push(`<p class="${classNames.paragraph}">${renderInline(paragraphText)}</p>`);
        }

        return html.join("");
    };


    const rendered = renderMarkdown(text);
    const sanitized = DOMPurify.sanitize(rendered, {
        ADD_TAGS: ['math', 'mrow', 'annotation', 'semantics', 'mtext', 'mn', 'mo', 'mi', 'mspace', 'mover', 'munder', 'munderover', 'mfrac', 'msqrt', 'mroot', 'mstyle', 'merror', 'mpadded', 'mphantom', 'mfenced', 'menclose', 'ms', 'mglyph', 'maligngroup', 'malignmark', 'mtable', 'mtr', 'mtd', 'maligngroup', 'malignmark', 'svg', 'path', 'line', 'circle', 'rect', 'polygon', 'polyline', 'ellipse', 'g', 'defs', 'clippath', 'use'],
        ADD_ATTR: ['aria-hidden', 'focusable', 'role', 'd', 'viewBox', 'fill', 'stroke', 'stroke-width', 'x', 'y', 'width', 'height', 'xmlns', 'xlink:href'],
        ALLOWED_TAGS: [
            'a',
            'blockquote',
            'br',
            'code',
            'em',
            'h1',
            'h2',
            'h3',
            'h4',
            'li',
            'ol',
            'p',
            'pre',
            'span',
            'strong',
            'ul'
        ],
        ALLOWED_ATTR: ['class', 'href', 'rel', 'target', 'style']
    });


    return <div className={`leading-relaxed ${className}`} dangerouslySetInnerHTML={{ __html: sanitized }} />;
});
MarkdownText.displayName = 'MarkdownText';

/**
 * File Upload Zone Component
 */
export const FileUploadZone = memo(({ label, onUpload, file }) => (
    <div className="flex flex-col items-center justify-center w-full mb-4">
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted/50 border-muted-foreground/25 transition-colors group">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {file ? (
                    <>
                        <CheckCircle className="w-8 h-8 text-primary mb-2" />
                        <p className="text-sm text-foreground font-medium">{file.name}</p>
                    </>
                ) : (
                    <>
                        <Upload className="w-8 h-8 text-muted-foreground mb-2 group-hover:text-primary transition-colors" />
                        <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">Click to upload</span> {label}</p>
                        <p className="text-xs text-muted-foreground/70">PDF only</p>
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
        <div className="mt-6 bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-primary p-4 flex justify-between items-center text-primary-foreground">
                <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    <h3 className="font-bold">Marking Analysis</h3>
                </div>
                <div className="font-mono bg-background/20 px-3 py-1 rounded-full text-sm">
                    Score: {feedback.score}/{feedback.totalMarks}
                </div>
            </div>

            <div className="p-5 space-y-4">
                <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Feedback</h4>
                    <div className="text-card-foreground text-sm"><MarkdownText text={feedback.text} /></div>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg border border-border">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Improved Answer (Changes in Bold)</h4>
                    <div className="text-foreground font-serif text-sm"><MarkdownText text={feedback.rewrite} /></div>
                </div>

                {!explanation && (
                    <button onClick={onExplain} disabled={explaining} className="w-full py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors">
                        {explaining ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {explaining ? "Preparing explanation..." : "Explain Why"}
                    </button>
                )}

                {explanation && (
                    <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg animate-in fade-in">
                        <h4 className="flex items-center gap-2 text-primary font-bold text-sm mb-2"><Sparkles className="w-4 h-4" /> Explanation</h4>
                        <div className="text-foreground text-sm leading-relaxed"><MarkdownText text={explanation} /></div>
                    </div>
                )}

                <div className="border-t border-border pt-4 mt-4">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Ask a Follow-up Question</h4>
                    {followUpChat && followUpChat.length > 0 && (
                        <div className="space-y-3 mb-3 max-h-48 overflow-y-auto p-2 bg-muted/30 rounded-lg">
                            {followUpChat.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-2 rounded-lg text-sm ${msg.role === 'user' ? 'bg-primary/20 text-primary-foreground' : 'bg-card border border-border text-foreground'}`}>
                                        <MarkdownText text={msg.text} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex gap-2">
                        <input type="text" value={followUpText} onChange={(e) => setFollowUpText(e.target.value)} placeholder="e.g., Why was my answer wrong?" className="flex-1 text-sm bg-background border border-input text-foreground rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground" onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
                        <button onClick={handleSend} disabled={sendingFollowUp || !followUpText.trim()} className="bg-primary text-primary-foreground p-2 rounded-lg hover:bg-primary/90 disabled:opacity-50">
                            {sendingFollowUp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                <button onClick={onNext} className="w-full mt-2 py-3 bg-primary hover:bg-orange-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors">
                    Next Question <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
});
FeedbackBlock.displayName = 'FeedbackBlock';
