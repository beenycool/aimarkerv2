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
    Clock,
    Tag
} from 'lucide-react';
import { getOrCreateStudentId } from '../../services/studentId';
import { listMemoryItems, upsertMemoryItem, archiveMemoryItem } from '../../services/studentOS';

interface MemoryItem {
    id: string;
    front: string;
    back: string;
    tags?: string[];
    updated_at?: string;
}

export default function MemoryPage() {
    const [studentId, setStudentId] = useState<string | null>(null);
    const [items, setItems] = useState<MemoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newFront, setNewFront] = useState('');
    const [newBack, setNewBack] = useState('');
    const [newTags, setNewTags] = useState('');
    const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

    useEffect(() => {
        setStudentId(getOrCreateStudentId());
    }, []);

    useEffect(() => {
        if (!studentId) return;

        const loadData = async () => {
            setLoading(true);
            try {
                const data = await listMemoryItems(studentId);
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
        if (!studentId || !newFront.trim() || !newBack.trim()) return;

        try {
            const newItem = await upsertMemoryItem(studentId, {
                front: newFront.trim(),
                back: newBack.trim(),
                tags: newTags.split(',').map(t => t.trim()).filter(Boolean),
            });
            setItems([newItem, ...items]);
            setNewFront('');
            setNewBack('');
            setNewTags('');
            setShowAddForm(false);
        } catch (error) {
            console.error('Failed to add memory item:', error);
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

    const toggleFlip = (id: string) => {
        setFlippedCards(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const filteredItems = items.filter(item =>
        item.front.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.back.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );

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
                        Store and review key facts, formulas, and concepts.
                    </p>
                </div>
                <Button onClick={() => setShowAddForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Card
                </Button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search cards..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Add Form */}
            {showAddForm && (
                <Card className="card-shadow border-primary/50">
                    <CardHeader>
                        <CardTitle className="text-lg">New Memory Card</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Front (Question/Term)</label>
                            <Input
                                placeholder="e.g., What is photosynthesis?"
                                value={newFront}
                                onChange={(e) => setNewFront(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Back (Answer/Definition)</label>
                            <Input
                                placeholder="e.g., The process by which plants convert light into energy..."
                                value={newBack}
                                onChange={(e) => setNewBack(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tags (comma separated)</label>
                            <Input
                                placeholder="e.g., Biology, Plants, Photosynthesis"
                                value={newTags}
                                onChange={(e) => setNewTags(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setShowAddForm(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleAddItem} disabled={!newFront.trim() || !newBack.trim()}>
                                Add Card
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="card-shadow">
                    <CardContent className="p-4">
                        <p className="text-2xl font-bold">{items.length}</p>
                        <p className="text-sm text-muted-foreground">Total Cards</p>
                    </CardContent>
                </Card>
                <Card className="card-shadow">
                    <CardContent className="p-4">
                        <p className="text-2xl font-bold text-primary">
                            {new Set(items.flatMap(i => i.tags || [])).size}
                        </p>
                        <p className="text-sm text-muted-foreground">Topics</p>
                    </CardContent>
                </Card>
                <Card className="card-shadow col-span-2 lg:col-span-1">
                    <CardContent className="p-4">
                        <p className="text-2xl font-bold text-success">Daily</p>
                        <p className="text-sm text-muted-foreground">Review Streak</p>
                    </CardContent>
                </Card>
            </div>

            {/* Cards Grid */}
            {loading ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">Loading memory cards...</p>
                </div>
            ) : filteredItems.length === 0 ? (
                <Card className="card-shadow">
                    <CardContent className="p-8 text-center">
                        <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h3 className="font-semibold mb-2">
                            {searchQuery ? 'No matching cards' : 'No memory cards yet'}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {searchQuery
                                ? 'Try a different search term.'
                                : 'Start adding key facts and formulas to remember.'}
                        </p>
                        {!searchQuery && (
                            <Button onClick={() => setShowAddForm(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Your First Card
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredItems.map((item) => (
                        <Card
                            key={item.id}
                            className="card-shadow hover:card-shadow-hover transition-all cursor-pointer group min-h-[180px]"
                            onClick={() => toggleFlip(item.id)}
                        >
                            <CardContent className="p-4 h-full flex flex-col">
                                <div className="flex items-start justify-between mb-3">
                                    <Badge variant={flippedCards.has(item.id) ? 'default' : 'secondary'} className="text-xs">
                                        {flippedCards.has(item.id) ? 'Answer' : 'Question'}
                                    </Badge>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleArchive(item.id);
                                        }}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>

                                <div className="flex-1 flex items-center justify-center">
                                    <p className="text-center font-medium">
                                        {flippedCards.has(item.id) ? item.back : item.front}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                                    <div className="flex flex-wrap gap-1">
                                        {item.tags?.slice(0, 2).map(tag => (
                                            <Badge key={tag} variant="outline" className="text-xs">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground">Click to flip</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
