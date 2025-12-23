'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import {
    Brain,
    Plus,
    Search,
    Trash2,
    Pencil,
    Check,
    X,
    Sparkles,
    User,
    BookOpen,
    Target,
    Lightbulb,
    Settings,
    TrendingUp,
    AlertCircle
} from 'lucide-react';
import { useStudentId } from '../../components/AuthProvider';
import {
    getMemoryItems,
    addMemoryItem,
    updateMemoryItem,
    archiveMemoryItem,
    MEMORY_CATEGORIES,
    CATEGORY_LABELS
} from '../../services/memoryService';

interface MemoryItem {
    id: string;
    category: string;
    content: string;
    confidence: number;
    source: 'user' | 'ai';
    last_confirmed?: string;
    updated_at?: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    [MEMORY_CATEGORIES.LEARNING_GOALS]: <Target className="h-4 w-4" />,
    [MEMORY_CATEGORIES.LEARNING_STYLE]: <BookOpen className="h-4 w-4" />,
    [MEMORY_CATEGORIES.STRENGTHS]: <TrendingUp className="h-4 w-4" />,
    [MEMORY_CATEGORIES.AREAS_TO_IMPROVE]: <AlertCircle className="h-4 w-4" />,
    [MEMORY_CATEGORIES.PREFERENCES]: <Settings className="h-4 w-4" />,
    [MEMORY_CATEGORIES.AI_NOTES]: <Lightbulb className="h-4 w-4" />,
};

export default function MemoryPage() {
    const studentId = useStudentId();
    const [items, setItems] = useState<MemoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newCategory, setNewCategory] = useState(MEMORY_CATEGORIES.PREFERENCES);
    const [newContent, setNewContent] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');

    useEffect(() => {
        if (!studentId) return;

        const loadData = async () => {
            setLoading(true);
            try {
                const data = await getMemoryItems(studentId);
                setItems(data || []);
            } catch (error) {
                console.error('Failed to load memory items:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [studentId]);

    const handleAddItem = async () => {
        if (!studentId || !newContent.trim()) return;

        try {
            const newItem = await addMemoryItem(studentId, {
                category: newCategory,
                content: newContent.trim(),
            });
            setItems([newItem, ...items]);
            setNewContent('');
            setShowAddForm(false);
        } catch (error) {
            console.error('Failed to add memory item:', error);
        }
    };

    const handleUpdateItem = async (id: string) => {
        if (!studentId || !editContent.trim()) return;

        try {
            const updated = await (updateMemoryItem as any)(studentId, id, { content: editContent.trim() });
            setItems(items.map(i => i.id === id ? updated : i));
            setEditingId(null);
            setEditContent('');
        } catch (error) {
            console.error('Failed to update item:', error);
        }
    };

    const handleArchive = async (id: string) => {
        if (!studentId) return;

        try {
            await archiveMemoryItem(studentId, id);
            setItems(items.filter(i => i.id !== id));
        } catch (error) {
            console.error('Failed to archive item:', error);
        }
    };

    const startEditing = (item: MemoryItem) => {
        setEditingId(item.id);
        setEditContent(item.content);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditContent('');
    };

    const filteredItems = items.filter(item =>
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (CATEGORY_LABELS[item.category] || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Group items by category
    const groupedItems = filteredItems.reduce((acc, item) => {
        const cat = item.category || 'preferences';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {} as Record<string, MemoryItem[]>);

    const userItemCount = items.filter(i => i.source === 'user').length;
    const aiItemCount = items.filter(i => i.source === 'ai').length;

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl lg:text-3xl font-semibold text-foreground flex items-center gap-3">
                        <Brain className="h-7 w-7 text-primary" />
                        Memory Bank
                    </h1>
                    <p className="text-muted-foreground">
                        Help the AI learn about you to personalize your experience.
                    </p>
                </div>
                <Button onClick={() => setShowAddForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Entry
                </Button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search memories..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Add Form */}
            {showAddForm && (
                <Card className="card-shadow border-primary/50">
                    <CardHeader>
                        <CardTitle className="text-lg">What should the AI know about you?</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Category</label>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(MEMORY_CATEGORIES).map(([key, value]) => (
                                    <Button
                                        key={value}
                                        variant={newCategory === value ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setNewCategory(value)}
                                        className="text-xs"
                                    >
                                        {CATEGORY_ICONS[value]}
                                        <span className="ml-1">{CATEGORY_LABELS[value]?.replace(/^[^\s]+\s/, '')}</span>
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">What would you like the AI to remember?</label>
                            <Input
                                placeholder="e.g., I learn best with visual diagrams and examples"
                                value={newContent}
                                onChange={(e) => setNewContent(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setShowAddForm(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleAddItem} disabled={!newContent.trim()}>
                                Save Memory
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="card-shadow">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Brain className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{items.length}</p>
                            <p className="text-xs text-muted-foreground">Total Memories</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="card-shadow">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <User className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{userItemCount}</p>
                            <p className="text-xs text-muted-foreground">Added by You</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="card-shadow">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Sparkles className="h-5 w-5 text-purple-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{aiItemCount}</p>
                            <p className="text-xs text-muted-foreground">Learned by AI</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Memory Entries */}
            {loading ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">Loading memories...</p>
                </div>
            ) : Object.keys(groupedItems).length === 0 ? (
                <Card className="card-shadow">
                    <CardContent className="p-8 text-center">
                        <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h3 className="font-semibold mb-2">
                            {searchQuery ? 'No matching memories' : 'No memories yet'}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {searchQuery
                                ? 'Try a different search term.'
                                : 'Help the AI understand you better by adding some information about yourself.'}
                        </p>
                        {!searchQuery && (
                            <Button onClick={() => setShowAddForm(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Your First Memory
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedItems).map(([category, categoryItems]) => (
                        <div key={category}>
                            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                {CATEGORY_ICONS[category] || <Brain className="h-4 w-4" />}
                                {CATEGORY_LABELS[category] || category}
                                <Badge variant="secondary" className="ml-2">
                                    {categoryItems.length}
                                </Badge>
                            </h2>
                            <div className="space-y-2">
                                {categoryItems.map((item) => (
                                    <Card key={item.id} className="card-shadow hover:card-shadow-hover transition-all group">
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    {editingId === item.id ? (
                                                        <div className="flex gap-2">
                                                            <Input
                                                                value={editContent}
                                                                onChange={(e) => setEditContent(e.target.value)}
                                                                autoFocus
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleUpdateItem(item.id);
                                                                    if (e.key === 'Escape') cancelEditing();
                                                                }}
                                                            />
                                                            <Button size="icon" variant="ghost" onClick={() => handleUpdateItem(item.id)}>
                                                                <Check className="h-4 w-4 text-green-500" />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" onClick={cancelEditing}>
                                                                <X className="h-4 w-4 text-red-500" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm">{item.content}</p>
                                                    )}
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <Badge
                                                            variant={item.source === 'ai' ? 'default' : 'outline'}
                                                            className={`text-xs ${item.source === 'ai' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : ''}`}
                                                        >
                                                            {item.source === 'ai' ? (
                                                                <><Sparkles className="h-3 w-3 mr-1" /> AI Learned</>
                                                            ) : (
                                                                <><User className="h-3 w-3 mr-1" /> You</>
                                                            )}
                                                        </Badge>
                                                        {item.confidence < 100 && (
                                                            <span className="text-xs text-muted-foreground">
                                                                {item.confidence}% confident
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {editingId !== item.id && (
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => startEditing(item)}
                                                        >
                                                            <Pencil className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive"
                                                            onClick={() => handleArchive(item.id)}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Info Card */}
            <Card className="card-shadow bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-primary/10 rounded-xl">
                            <Sparkles className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold mb-1">How Memory Bank Works</h3>
                            <p className="text-sm text-muted-foreground">
                                The AI uses these memories to personalize your experience. Add information about your
                                learning style, goals, and preferences. The AI will also learn things about you
                                automatically as you use the app and add them here.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
