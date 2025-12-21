
import React, { useEffect, useState } from 'react';
import { BookOpen, Calendar, Trash2, Download, ExternalLink, Loader2, FileText, Check } from 'lucide-react';
import { PaperStorage } from '../services/PaperStorage';

export const PaperLibrary = ({ onSelectPaper }) => {
    const [papers, setPapers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);

    const fetchPapers = async () => {
        try {
            setLoading(true);
            const data = await PaperStorage.listPapers();
            setPapers(data);
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

        // Convert URLs to File objects (conceptually) or allow the app to handle URLs
        // Since the app expects File objects for parsing, we might need to fetch them as Blobs
        // Or update the AIService to handle URLs.
        // For now, let's fetch them as Blobs to maintain compatibility with existing logic

        // Actually, passing blobs is heavy. Best would be refactoring AIService, but strictly for "storage",
        // let's fetch the blob so the main app doesn't need to change.

        try {
            // Create a loading state in the parent if needed, but here we just pass the data
            // Construct file-like objects
            const pdfUrl = PaperStorage.getPublicUrl(paper.pdf_path);
            const schemeUrl = PaperStorage.getPublicUrl(paper.scheme_path);
            const insertUrl = PaperStorage.getPublicUrl(paper.insert_path);

            onSelectPaper({
                paper: { url: pdfUrl, name: paper.name },
                scheme: schemeUrl ? { url: schemeUrl, name: "Mark Scheme" } : null,
                insert: insertUrl ? { url: insertUrl, name: "Insert" } : null
            });

        } catch (err) {
            console.error("Error selecting paper:", err);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-600" /> Saved Papers
                </h3>
                <button onClick={fetchPapers} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Refresh</button>
            </div>

            {papers.length === 0 ? (
                <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                    <p className="text-slate-400 text-sm">No papers saved yet.</p>
                </div>
            ) : (
                <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                    {papers.map(paper => (
                        <div
                            key={paper.id}
                            onClick={() => handleSelect(paper)}
                            className="group flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all"
                        >
                            <div className="flex items-start gap-3">
                                <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors line-clamp-1">
                                        {paper.subject && paper.subject !== 'Unknown Subject'
                                            ? `${paper.subject} - ${paper.section}`
                                            : paper.name}
                                    </h4>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {paper.year} {paper.season || ''}</span>
                                        {paper.board && paper.board !== 'Unknown Board' && (
                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">{paper.board}</span>
                                        )}
                                        {paper.scheme_path && <span className="flex items-center gap-1 text-green-600"><Check className="w-3 h-3" /> Scheme</span>}
                                        {paper.insert_path && <span className="flex items-center gap-1 text-amber-600"><Check className="w-3 h-3" /> Insert</span>}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={(e) => handleDelete(e, paper)}
                                disabled={deletingId === paper.id}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title="Delete Paper"
                            >
                                {deletingId === paper.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
