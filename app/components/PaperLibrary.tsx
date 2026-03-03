"use client";
import { toast } from "sonner";
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { BookOpen, FileText, Search } from 'lucide-react';
import { PaperStorage } from '../services/PaperStorage';
import PaperCard from './PaperCard';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

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
  const [paperToDelete, setPaperToDelete] = useState<PaperType | null>(null);

  const onSelectPaperRef = useRef(onSelectPaper);
  const onResumePaperRef = useRef(onResumePaper);

  useEffect(() => {
    onSelectPaperRef.current = onSelectPaper;
    onResumePaperRef.current = onResumePaper;
  }, [onSelectPaper, onResumePaper]);

  const fetchPapers = async () => {
    try {
      setLoading(true);
      const data = await PaperStorage.listPapers();
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
    setPaperToDelete(paper);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!paperToDelete) return;

    setDeletingId(paperToDelete.id);
    try {
      await PaperStorage.deletePaper(paperToDelete.id, {
        pdf_path: paperToDelete.pdf_path,
        scheme_path: paperToDelete.scheme_path,
        insert_path: paperToDelete.insert_path
      });
      setPapers(prev => prev.filter(p => p.id !== paperToDelete.id));
      toast.success("Paper deleted successfully");
    } catch (err) {
      console.error("Failed to delete paper:", err);
      toast.error("Failed to delete paper");
    } finally {
      setDeletingId(null);
      setPaperToDelete(null);
    }
  }, [paperToDelete]);

  const cancelDelete = useCallback(() => {
    setPaperToDelete(null);
  }, []);

  const handleSelect = useCallback(async (paper: PaperType) => {
    if (!onSelectPaperRef.current) return;

    try {
      const pdfUrl = PaperStorage.getPublicUrl(paper.pdf_path);
      const schemeUrl = PaperStorage.getPublicUrl(paper.scheme_path);
      const insertUrl = PaperStorage.getPublicUrl(paper.insert_path);

      onSelectPaperRef.current({
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
  }, []);

  const handleResume = useCallback((paper: PaperType) => {
    onResumePaperRef.current?.(paper);
  }, []);

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
      {paperToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-lg shadow-lg p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-lg font-semibold mb-2 text-foreground">Delete Paper?</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete <span className="font-semibold text-foreground">{paperToDelete.name}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={cancelDelete} disabled={deletingId === paperToDelete.id}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={deletingId === paperToDelete.id}>
                {deletingId === paperToDelete.id ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

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
            aria-label="Search saved papers"
          />
        </div>
      </div>

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
                onResume={handleResume}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
