"use client";
import { toast } from "sonner";
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { BookOpen, FileText, Search } from 'lucide-react';
import { PaperStorage } from '../services/PaperStorage';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { PaperCard } from './PaperCard';

import { PaperType } from './PaperCard';

interface PaperLibraryProps {
    onSelectPaper?: (paperDetails: any) => void;
    onResumePaper?: (paper: PaperType) => void;
    checkSessionForPaper?: (paperId: string) => boolean;
}

export const PaperLibrary = ({ onSelectPaper, onResumePaper, checkSessionForPaper }: PaperLibraryProps) => {
    const [papers, setPapers] = useState<PaperType[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchPapers = async () => {
        try {
            setLoading(true);
            const data = await PaperStorage.listPapers();
            // detailed sort: newest first
            const sorted = data.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
            setPapers(sorted);
        } catch (err) {
            console.error("Failed to load papers:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPapers();
    }, []);

    const handleDelete = useCallback(async (e: React.MouseEvent<HTMLButtonElement>, paper: PaperType) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this paper?')) return;

        setDeletingId(paper.id);
        try {
            await PaperStorage.deletePaper(paper.id, {
                pdf_path: paper.pdf_path,
                scheme_path: paper.scheme_path,
                insert_path: paper.insert_path
            });
            setPapers(prev => prev.filter(p => p.id !== paper.id));
        } catch (err) {
            console.error("Failed to delete paper:", err);
            toast.error("Failed to delete paper");
        } finally {
            setDeletingId(null);
        }
    }, []);

    const handleSelect = useCallback(async (paper: PaperType) => {
        if (!onSelectPaper) return;

        try {
            const pdfUrl = PaperStorage.getPublicUrl(paper.pdf_path);
            const schemeUrl = PaperStorage.getPublicUrl(paper.scheme_path);
            const insertUrl = PaperStorage.getPublicUrl(paper.insert_path);

            onSelectPaper({
                paperId: paper.id,
                paper: {
                    url: pdfUrl,
                    name: paper.name,
                    parsedQuestions: paper.parsed_questions,
                    parsedMarkScheme: paper.parsed_mark_scheme,
                    metadata: {
                        subject: paper.subject,
                        board: paper.board,
                        year: paper.year,
                        season: paper.season,
                        section: paper.section
                    }
                },
                scheme: schemeUrl ? { url: schemeUrl, name: "Mark Scheme" } : null,
                insert: insertUrl ? { url: insertUrl, name: "Insert" } : null
            });

        } catch (err) {
            console.error("Error selecting paper:", err);
        }
    }, [onSelectPaper]);

    const filteredPapers = useMemo(() => {
        if (!searchQuery) return papers;
        const lowerQ = searchQuery.toLowerCase();
        return papers.filter(p =>
            (p.name && p.name.toLowerCase().includes(lowerQ)) ||
            (p.subject && p.subject.toLowerCase().includes(lowerQ)) ||
            (p.board && p.board.toLowerCase().includes(lowerQ)) ||
            (p.year && String(p.year).includes(lowerQ))
        );
    }, [papers, searchQuery]);

    if (loading) {
        return (
            <div className="w-full space-y-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="h-6 w-32 bg-muted/50 rounded animate-pulse" />
                    <div className="h-8 w-64 bg-muted/50 rounded animate-pulse" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 bg-muted/30 rounded-xl animate-pulse border border-border/40" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6 animate-in fade-in duration-500">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Your Library
                        <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary hover:bg-primary/20">
                            {papers.length}
                        </Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground">Select a saved paper to practice</p>
                </div>

                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search papers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 bg-muted/30 border-muted-foreground/20 focus:border-primary/50 transition-all"
                    />
                </div>
            </div>

            {/* Content */}
            {papers.length === 0 ? (
                <div className="text-center py-16 px-4 border-2 border-dashed border-border/50 rounded-2xl bg-muted/20">
                    <div className="bg-muted/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <h4 className="text-foreground font-semibold mb-1">No papers saved yet</h4>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        Upload a paper above and save it to your library for quick access later.
                    </p>
                </div>
            ) : filteredPapers.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">No papers found matching "{searchQuery}"</p>
                    <Button variant="link" onClick={() => setSearchQuery("")} className="text-primary mt-2">
                        Clear Search
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                    {filteredPapers.map(paper => {
                        const hasSession = checkSessionForPaper && checkSessionForPaper(paper.id);
                        return (
                            <PaperCard
                                key={paper.id}
                                paper={paper}
                                hasSession={hasSession}
                                isDeleting={deletingId === paper.id}
                                onSelect={handleSelect}
                                onDelete={handleDelete}
                                onResume={onResumePaper}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
};
