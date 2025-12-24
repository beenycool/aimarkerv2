import React, { useEffect, useState, useMemo } from 'react';
import { BookOpen, Calendar, Trash2, Download, ExternalLink, Loader2, FileText, Check, Search, Filter, Book, FileCheck2, RefreshCw } from 'lucide-react';
import { PaperStorage } from '../services/PaperStorage';

import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

export const PaperLibrary = ({ onSelectPaper, onResumePaper, checkSessionForPaper }) => {
    const [papers, setPapers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchPapers = async () => {
        try {
            setLoading(true);
            const data = await PaperStorage.listPapers();
            // detailed sort: newest first
            const sorted = data.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
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

    const handleDelete = async (e, paper) => {
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
            alert("Failed to delete paper");
        } finally {
            setDeletingId(null);
        }
    };

    const handleSelect = async (paper) => {
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
    };

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
                        <Card
                            key={paper.id}
                            onClick={() => !hasSession && handleSelect(paper)}
                            className={`group ${!hasSession ? 'cursor-pointer' : 'cursor-default'} hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 border-border/60 bg-card/50 backdrop-blur-sm`}
                            role={hasSession ? "article" : "button"}
                            tabIndex={hasSession ? undefined : 0}
                            aria-label={hasSession ? `${paper.subject || paper.name} - In progress` : `Start ${paper.subject || paper.name}`}
                        >
                            <CardContent className="p-4 flex items-start gap-4">
                                {/* Icon Box */}
                                <div className="shrink-0 bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                                    <Book className="w-6 h-6" />
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <h4 className="font-semibold text-foreground truncate pr-2 group-hover:text-primary transition-colors">
                                            {paper.subject && paper.subject !== 'Unknown Subject'
                                                ? `${paper.subject}`
                                                : paper.name}
                                        </h4>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mr-2 -mt-1 opacity-0 group-hover:opacity-100 transition-all"
                                            onClick={(e) => handleDelete(e, paper)}
                                            disabled={deletingId === paper.id}
                                        >
                                            {deletingId === paper.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                        </Button>
                                    </div>

                                    <p className="text-sm text-muted-foreground mb-3 truncate">
                                        {paper.subject && paper.subject !== 'Unknown Subject' && paper.section ? paper.section : paper.name}
                                    </p>

                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                        <Badge variant="outline" className="bg-background/50 font-normal">
                                            {paper.year} {paper.season || ''}
                                        </Badge>

                                        {paper.board && paper.board !== 'Unknown Board' && (
                                            <Badge variant="secondary" className="font-normal text-secondary-foreground/80">
                                                {paper.board}
                                            </Badge>
                                        )}

                                        {paper.scheme_path && (
                                            <div className="flex items-center gap-1 text-emerald-500 font-medium ml-auto pl-2">
                                                <Check className="w-3 h-3" /> <span className="hidden xs:inline">Scheme</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Resume Button */}
                                    {hasSession && onResumePaper && (
                                        <div className="mt-3 flex gap-2">
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onResumePaper(paper);
                                                }}
                                                className="gap-2 flex-1"
                                            >
                                                <RefreshCw className="w-3 h-3" /> Resume
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSelect(paper);
                                                }}
                                            >
                                                Restart
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )})}
                </div>
            )}
        </div>
    );
};