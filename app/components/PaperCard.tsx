"use client";
import React, { memo } from 'react';
import { Book, Trash2, Loader2, Check, RefreshCw } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export interface Paper {
    id: string;
    name: string;
    subject?: string;
    board?: string;
    year?: string | number;
    season?: string;
    section?: string;
    pdf_path?: string;
    scheme_path?: string;
    insert_path?: string;
    parsed_questions?: any;
    parsed_mark_scheme?: any;
    [key: string]: any; // Allow other properties
}

export interface PaperCardProps {
    paper: Paper;
    isDeleting: boolean;
    onSelect: (paper: Paper) => void;
    onDelete: (e: React.MouseEvent, paper: Paper) => void;
    onResume?: (paper: Paper) => void;
    checkSessionForPaper?: (id: string) => boolean | Promise<boolean>;
}

const PaperCard: React.FC<PaperCardProps> = memo(({
    paper,
    isDeleting,
    onSelect,
    onDelete,
    onResume,
    checkSessionForPaper
}) => {
    // Preserve existing logic for session checking
    // Replicates behavior where hasSession might be truthy (Promise) if checkSessionForPaper is async
    const hasSession = checkSessionForPaper && typeof checkSessionForPaper === 'function'
        ? checkSessionForPaper(paper.id)
        : false;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!hasSession && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onSelect(paper);
        }
    };

    return (
        <Card
            onClick={() => !hasSession && onSelect(paper)}
            onKeyDown={handleKeyDown}
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
                            onClick={(e) => onDelete(e, paper)}
                            disabled={isDeleting}
                            aria-label={`Delete ${paper.name}`}
                        >
                            {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
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
                    {hasSession && onResume && (
                        <div className="mt-3 flex gap-2">
                            <Button
                                variant="default"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onResume(paper);
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
                                    onSelect(paper);
                                }}
                            >
                                Restart
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
});

PaperCard.displayName = 'PaperCard';

export default PaperCard;
