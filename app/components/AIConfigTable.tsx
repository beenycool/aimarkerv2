'use client';

import { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/app/components/ui/table';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/app/components/ui/select';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/app/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import {
    FileText,
    GraduationCap,
    MessageCircle,
    Calendar,
    Lightbulb,
    AlertTriangle,
    Info,
    Check,
    X,
    Crown,
    Rocket,
    Gift,
    Sparkles,
    Save,
    Trash2,
    User,
    Plus,
    Server,
    Key,
    Search,
    Globe,
} from 'lucide-react';

// Types for AI preferences
interface FeatureConfig {
    enabled: boolean;
    provider: 'openrouter' | 'hackclub' | 'gemini' | 'custom_openai';
    model: string;
}

interface AIPreferences {
    parsing: FeatureConfig;
    grading: FeatureConfig;
    tutor: FeatureConfig;
    planning: FeatureConfig;
    hints: FeatureConfig;
    verification: FeatureConfig;
}

export interface CustomAPIConfig {
    openai_endpoint: string;
    openai_key: string;
    gemini_key: string;
    hackclub_search_key?: string;
    search_strategy?: 'hackclub' | 'perplexity' | 'both' | 'fallback';
}

interface CustomProfile {
    name: string;
    config: AIPreferences;
    createdAt: string;
}

interface ProfileData {
    name: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    badge?: string;
    config: AIPreferences;
    isCustom?: boolean;
}

// Built-in AI Configuration Profiles
const BUILTIN_PROFILES: { [key: string]: ProfileData } = {
    balanced: {
        name: 'Balanced',
        description: 'Best mix of speed and quality',
        icon: Sparkles,
        color: 'text-primary',
        badge: 'Recommended',
        config: {
            parsing: { enabled: true, provider: 'openrouter', model: 'google/gemini-2.0-flash-001' },
            grading: { enabled: true, provider: 'hackclub', model: 'moonshotai/kimi-k2-thinking' },
            tutor: { enabled: true, provider: 'openrouter', model: 'google/gemini-2.0-flash-001' },
            planning: { enabled: true, provider: 'hackclub', model: 'moonshotai/kimi-k2-thinking' },
            hints: { enabled: true, provider: 'hackclub', model: 'qwen/qwen3-32b' },
            verification: { enabled: true, provider: 'openrouter', model: 'google/gemini-2.0-flash-001' },
        }
    },
    quality: {
        name: 'Quality First',
        description: 'Best models for maximum accuracy',
        icon: Crown,
        color: 'text-amber-500',
        config: {
            parsing: { enabled: true, provider: 'openrouter', model: 'google/gemini-2.0-flash-001' },
            grading: { enabled: true, provider: 'hackclub', model: 'moonshotai/kimi-k2-thinking' },
            tutor: { enabled: true, provider: 'openrouter', model: 'anthropic/claude-sonnet-4' },
            planning: { enabled: true, provider: 'hackclub', model: 'moonshotai/kimi-k2-thinking' },
            hints: { enabled: true, provider: 'hackclub', model: 'moonshotai/kimi-k2-thinking' },
            verification: { enabled: true, provider: 'openrouter', model: 'google/gemini-2.0-flash-001' },
        }
    },
    speed: {
        name: 'Speed Demon',
        description: 'Fastest responses for quick work',
        icon: Rocket,
        color: 'text-blue-500',
        config: {
            parsing: { enabled: true, provider: 'openrouter', model: 'google/gemini-2.0-flash-001' },
            grading: { enabled: true, provider: 'hackclub', model: 'qwen/qwen3-32b' },
            tutor: { enabled: true, provider: 'openrouter', model: 'google/gemini-2.0-flash-001' },
            planning: { enabled: true, provider: 'hackclub', model: 'qwen/qwen3-32b' },
            hints: { enabled: true, provider: 'hackclub', model: 'qwen/qwen3-32b' },
            verification: { enabled: true, provider: 'openrouter', model: 'google/gemini-2.0-flash-001' },
        }
    },
    free: {
        name: 'Free Tier',
        description: 'Uses only free Hack Club API',
        icon: Gift,
        color: 'text-green-500',
        badge: 'No cost',
        config: {
            parsing: { enabled: true, provider: 'hackclub', model: 'moonshotai/kimi-k2-thinking' },
            grading: { enabled: true, provider: 'hackclub', model: 'moonshotai/kimi-k2-thinking' },
            tutor: { enabled: true, provider: 'hackclub', model: 'qwen/qwen3-32b' },
            planning: { enabled: true, provider: 'hackclub', model: 'moonshotai/kimi-k2-thinking' },
            hints: { enabled: true, provider: 'hackclub', model: 'qwen/qwen3-32b' },
            verification: { enabled: true, provider: 'hackclub', model: 'qwen/qwen3-32b' },
        }
    }
};

// Feature metadata
const FEATURES = {
    parsing: {
        key: 'parsing',
        name: 'PDF Parsing',
        description: 'Extracts questions and mark schemes from exam PDFs',
        icon: FileText,
        requiresVision: true,
        visionWarning: 'This feature requires vision capability. Hack Club API may not support PDF parsing.',
        defaultModel: {
            openrouter: 'google/gemini-2.0-flash-001',
            hackclub: 'moonshotai/kimi-k2-thinking',
            gemini: 'gemini-2.0-flash-001',
            custom_openai: 'local-model'
        }
    },
    grading: {
        key: 'grading',
        name: 'Answer Grading',
        description: 'Evaluates student answers using mark scheme criteria',
        icon: GraduationCap,
        requiresVision: false,
        defaultModel: {
            openrouter: 'google/gemini-2.0-flash-001',
            hackclub: 'moonshotai/kimi-k2-thinking',
            gemini: 'gemini-2.0-flash-001',
            custom_openai: 'local-model'
        }
    },
    tutor: {
        key: 'tutor',
        name: 'Tutor Feedback',
        description: 'Generates explanatory feedback and model answers',
        icon: MessageCircle,
        requiresVision: false,
        defaultModel: {
            openrouter: 'google/gemini-2.0-flash-001',
            hackclub: 'qwen/qwen3-32b',
            gemini: 'gemini-2.0-flash-001',
            custom_openai: 'local-model'
        }
    },
    planning: {
        key: 'planning',
        name: 'Schedule Planning',
        description: 'Creates personalized weekly study schedules',
        icon: Calendar,
        requiresVision: false,
        defaultModel: {
            openrouter: 'google/gemini-2.0-flash-001',
            hackclub: 'moonshotai/kimi-k2-thinking',
            gemini: 'gemini-2.0-flash-001',
            custom_openai: 'local-model'
        }
    },
    hints: {
        key: 'hints',
        name: 'Hints & Tips',
        description: 'Provides exam-specific hints without giving answers',
        icon: Lightbulb,
        requiresVision: false,
        defaultModel: {
            openrouter: 'google/gemini-2.0-flash-001',
            hackclub: 'qwen/qwen3-32b',
            gemini: 'gemini-2.0-flash-001',
            custom_openai: 'local-model'
        }
    },
    verification: {
        key: 'verification',
        name: 'Fact Checker',
        description: 'Fast model that decides what to search for (Orchestrator)',
        icon: Search,
        requiresVision: false,
        defaultModel: {
            openrouter: 'google/gemini-2.0-flash-001',
            hackclub: 'qwen/qwen3-32b',
            gemini: 'gemini-2.0-flash-001',
            custom_openai: 'local-model'
        }
    }
};

// Default AI preferences structure
const DEFAULT_PREFERENCES: AIPreferences = {
    parsing: { enabled: true, provider: 'openrouter', model: 'google/gemini-2.0-flash-001' },
    grading: { enabled: true, provider: 'hackclub', model: 'moonshotai/kimi-k2-thinking' },
    tutor: { enabled: true, provider: 'openrouter', model: 'google/gemini-2.0-flash-001' },
    planning: { enabled: true, provider: 'hackclub', model: 'moonshotai/kimi-k2-thinking' },
    hints: { enabled: true, provider: 'hackclub', model: 'qwen/qwen3-32b' },
    verification: { enabled: true, provider: 'openrouter', model: 'google/gemini-2.0-flash-001' }
};

interface AIConfigTableProps {
    preferences: AIPreferences;
    onChange: (preferences: AIPreferences) => void;
    customAPIConfig: CustomAPIConfig;
    onCustomAPIConfigChange: (config: CustomAPIConfig) => void;
    customProfiles?: CustomProfile[];
    onSaveProfile?: (profile: CustomProfile) => void;
    onDeleteProfile?: (profileName: string) => void;
    serverKeys?: { openrouter: boolean; hackclub: boolean; hackclub_search: boolean; gemini: boolean };
}

export default function AIConfigTable({
    preferences,
    onChange,
    customAPIConfig = { openai_endpoint: '', openai_key: '', gemini_key: '' },
    onCustomAPIConfigChange,
    customProfiles = [],
    onSaveProfile,
    onDeleteProfile,
    serverKeys = { openrouter: false, hackclub: false, hackclub_search: false, gemini: false },
}: AIConfigTableProps) {
    const [activeProfile, setActiveProfile] = useState<string | null>(null);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');
    const [saveError, setSaveError] = useState('');

    // Merge with defaults to ensure all fields exist
    const mergedPrefs: AIPreferences = {
        ...DEFAULT_PREFERENCES,
        ...preferences,
        parsing: { ...DEFAULT_PREFERENCES.parsing, ...preferences?.parsing },
        grading: { ...DEFAULT_PREFERENCES.grading, ...preferences?.grading },
        tutor: { ...DEFAULT_PREFERENCES.tutor, ...preferences?.tutor },
        planning: { ...DEFAULT_PREFERENCES.planning, ...preferences?.planning },
        hints: { ...DEFAULT_PREFERENCES.hints, ...preferences?.hints },
        verification: { ...DEFAULT_PREFERENCES.verification, ...preferences?.verification },
    };

    const updateFeature = (featureKey: keyof AIPreferences, field: keyof FeatureConfig, value: boolean | string) => {
        const newPrefs = {
            ...mergedPrefs,
            [featureKey]: {
                ...mergedPrefs[featureKey],
                [field]: value
            }
        };
        setActiveProfile(null); // Clear active profile when manually editing
        onChange(newPrefs);
    };

    const handleProviderChange = (featureKey: keyof AIPreferences, provider: 'openrouter' | 'hackclub' | 'gemini' | 'custom_openai') => {
        const feature = FEATURES[featureKey];
        const defaultModel = feature.defaultModel[provider];

        const newPrefs = {
            ...mergedPrefs,
            [featureKey]: {
                ...mergedPrefs[featureKey],
                provider,
                model: defaultModel
            }
        };
        setActiveProfile(null);
        onChange(newPrefs);
    };

    const applyProfile = (profileKey: string, config: AIPreferences) => {
        setActiveProfile(profileKey);
        onChange(config);
    };

    const handleSaveProfile = () => {
        const trimmedName = newProfileName.trim();
        if (!trimmedName) {
            setSaveError('Please enter a profile name');
            return;
        }
        if (BUILTIN_PROFILES[trimmedName.toLowerCase()] || customProfiles.some(p => p.name.toLowerCase() === trimmedName.toLowerCase())) {
            setSaveError('Profile name already exists');
            return;
        }
        const newProfile: CustomProfile = {
            name: trimmedName,
            config: { ...mergedPrefs },
            createdAt: new Date().toISOString(),
        };
        onSaveProfile?.(newProfile);
        setNewProfileName('');
        setSaveError('');
        setShowSaveDialog(false);
        setActiveProfile(`custom_${trimmedName}`);
    };

    const handleDeleteProfile = (profileName: string) => {
        onDeleteProfile?.(profileName);
        if (activeProfile === `custom_${profileName}`) setActiveProfile(null);
    };

    return (
        <TooltipProvider>
            <div className="space-y-6">
                {/* Profile Selector */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-foreground">Quick Profiles</h4>
                        {onSaveProfile && (
                            <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-2">
                                        <Plus className="h-4 w-4" /> Save Current
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Save Custom Profile</DialogTitle>
                                        <DialogDescription>Save your current AI configuration as a reusable profile.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="profile-name">Profile Name</Label>
                                            <Input
                                                id="profile-name"
                                                placeholder="My Custom Setup"
                                                value={newProfileName}
                                                onChange={(e) => { setNewProfileName(e.target.value); setSaveError(''); }}
                                            />
                                            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
                                        <Button onClick={handleSaveProfile} className="gap-2"><Save className="h-4 w-4" /> Save Profile</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>

                    {/* Built-in Profiles */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {Object.entries(BUILTIN_PROFILES).map(([key, profile]) => {
                            const Icon = profile.icon;
                            const isActive = activeProfile === key;
                            return (
                                <button
                                    key={key}
                                    onClick={() => applyProfile(key, profile.config)}
                                    className={`relative p-3 rounded-lg border-2 text-left transition-all hover:shadow-md ${isActive ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/50'}`}
                                >
                                    {profile.badge && <Badge variant="secondary" className="absolute -top-2 -right-2 text-[10px] px-1.5">{profile.badge}</Badge>}
                                    <div className="flex items-center gap-2 mb-1">
                                        <Icon className={`h-4 w-4 ${profile.color}`} />
                                        <span className="font-medium text-sm">{profile.name}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{profile.description}</p>
                                    {isActive && <div className="absolute top-2 right-2"><Check className="h-4 w-4 text-primary" /></div>}
                                </button>
                            );
                        })}
                    </div>

                    {/* Custom Profiles */}
                    {customProfiles.length > 0 && (
                        <div className="space-y-2">
                            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your Profiles</h5>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                {customProfiles.map((profile) => {
                                    const profileKey = `custom_${profile.name}`;
                                    const isActive = activeProfile === profileKey;
                                    return (
                                        <div key={profile.name} className={`relative p-3 rounded-lg border-2 text-left transition-all ${isActive ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/50'}`}>
                                            <button onClick={() => applyProfile(profileKey, profile.config)} className="w-full text-left">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <User className="h-4 w-4 text-purple-500" />
                                                    <span className="font-medium text-sm truncate pr-6">{profile.name}</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">Created {new Date(profile.createdAt).toLocaleDateString()}</p>
                                            </button>
                                            {isActive && <div className="absolute top-2 right-8"><Check className="h-4 w-4 text-primary" /></div>}
                                            {onDeleteProfile && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteProfile(profile.name); }} className="absolute top-2 right-2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Delete profile</TooltipContent>
                                                </Tooltip>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Feature Configuration Table */}
                <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-[200px]">Feature</TableHead>
                                <TableHead className="w-[100px] text-center">Enabled</TableHead>
                                <TableHead className="w-[150px]">Provider</TableHead>
                                <TableHead>Model ID</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Object.entries(FEATURES).map(([key, feature]) => {
                                const featureKey = key as keyof AIPreferences;
                                const config = mergedPrefs[featureKey];
                                const Icon = feature.icon;
                                const showVisionWarning = feature.requiresVision && config.provider === 'hackclub';

                                return (
                                    <TableRow key={key} className={!config.enabled ? 'opacity-60' : ''}>
                                        <TableCell>
                                            <div className="flex items-start gap-3">
                                                <div className={`p-2 rounded-lg ${config.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-sm">{feature.name}</span>
                                                        {feature.requiresVision && (
                                                            <Tooltip>
                                                                <TooltipTrigger>
                                                                    <Badge variant="outline" className="text-xs px-1.5 py-0">Vision</Badge>
                                                                </TooltipTrigger>
                                                                <TooltipContent><p>Requires vision/image capability</p></TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-center">
                                            <Button
                                                variant={config.enabled ? 'default' : 'outline'}
                                                size="sm"
                                                className="w-16"
                                                onClick={() => updateFeature(featureKey, 'enabled', !config.enabled)}
                                            >
                                                {config.enabled ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                            </Button>
                                        </TableCell>

                                        <TableCell>
                                            <div className="space-y-1">
                                                <Select
                                                    value={config.provider}
                                                    onValueChange={(v: any) => handleProviderChange(featureKey, v)}
                                                    disabled={!config.enabled}
                                                >
                                                    <SelectTrigger className="h-9 text-sm">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="openrouter"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500" /> OpenRouter</span></SelectItem>
                                                        <SelectItem value="hackclub"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500" /> Hack Club</span></SelectItem>
                                                        <SelectItem value="gemini"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Gemini (Direct)</span></SelectItem>
                                                        <SelectItem value="custom_openai"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-500" /> Custom OpenAI</span></SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {showVisionWarning && (
                                                    <div className="flex items-center gap-1 text-amber-500">
                                                        <AlertTriangle className="h-3 w-3" />
                                                        <span className="text-[10px]">Vision needed</span>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    value={config.model}
                                                    onChange={(e) => updateFeature(featureKey, 'model', e.target.value)}
                                                    placeholder="e.g. google/gemini-2.0-flash-001"
                                                    className="h-9 text-sm font-mono"
                                                    disabled={!config.enabled}
                                                />
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                                                            <Info className="h-4 w-4 text-muted-foreground" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="left" className="max-w-[300px]">
                                                        <p className="text-xs">
                                                            ID/Name of the model to use.
                                                        </p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                {/* Custom API Configuration */}
                <Card className="border-muted bg-muted/30">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Server className="h-4 w-4 text-primary" />
                            API Keys
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Configure your API keys for various services. Keys are stored in your private settings.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">

                        {/* Gemini API Key */}
                        {Object.values(mergedPrefs).some(p => p.provider === 'gemini') && (
                            <div className="space-y-2">
                                <Label htmlFor="gemini-key" className="text-xs flex items-center gap-2">
                                    Gemini API Key
                                    {serverKeys.gemini && (
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Server configured</Badge>
                                    )}
                                </Label>
                                {!serverKeys.gemini && (
                                    <Input
                                        id="gemini-key"
                                        type="password"
                                        className="h-8 text-sm"
                                        placeholder="AI..."
                                        value={customAPIConfig.gemini_key || ''}
                                        onChange={(e) => onCustomAPIConfigChange({ ...customAPIConfig, gemini_key: e.target.value })}
                                    />
                                )}
                            </div>
                        )}

                        {/* Custom OpenAI settings */}
                        {Object.values(mergedPrefs).some(p => p.provider === 'custom_openai') && (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="custom-endpoint" className="text-xs">Custom OpenAI Endpoint</Label>
                                    <Input
                                        id="custom-endpoint"
                                        className="h-8 text-sm"
                                        placeholder="http://localhost:11434/v1"
                                        value={customAPIConfig.openai_endpoint || ''}
                                        onChange={(e) => onCustomAPIConfigChange({ ...customAPIConfig, openai_endpoint: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="custom-key" className="text-xs">Custom API Key (Optional)</Label>
                                    <Input
                                        id="custom-key"
                                        type="password"
                                        className="h-8 text-sm"
                                        placeholder="sk-..."
                                        value={customAPIConfig.openai_key || ''}
                                        onChange={(e) => onCustomAPIConfigChange({ ...customAPIConfig, openai_key: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Search Provider Configuration */}
                <Card className="border-muted bg-muted/30">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Search className="h-4 w-4 text-primary" />
                            Web Search (Topic Verification)
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Configure how the AI verifies syllabus topics using web search. Used for schedule planning.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Search Strategy Selector */}
                        <div className="space-y-2">
                            <Label htmlFor="search-strategy" className="text-xs">Search Provider Strategy</Label>
                            <Select
                                value={customAPIConfig.search_strategy || 'fallback'}
                                onValueChange={(v) => onCustomAPIConfigChange({
                                    ...customAPIConfig,
                                    search_strategy: v as 'hackclub' | 'perplexity' | 'both' | 'fallback'
                                })}
                            >
                                <SelectTrigger id="search-strategy" className="h-9 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fallback">
                                        <span className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-green-500" />
                                            Auto (Hack Club → Perplexity fallback)
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="hackclub">
                                        <span className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-orange-500" />
                                            Hack Club Search Only (Free)
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="perplexity">
                                        <span className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-purple-500" />
                                            Perplexity Only (via OpenRouter)
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="both">
                                        <span className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                                            Both (Combined Results)
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-[11px] text-muted-foreground">
                                <strong>Auto:</strong> Tries Hack Club Search first, falls back to Perplexity if unavailable.
                                <br />
                                <strong>Hack Club:</strong> Free search via search.hackclub.com (Brave-powered).
                                <br />
                                <strong>Perplexity:</strong> AI-powered search via OpenRouter (may incur costs).
                                <br />
                                <strong>Both:</strong> Combines results from both for maximum accuracy.
                            </p>
                        </div>

                        {/* Hack Club Search API Key Input */}
                        <div className="space-y-2">
                            <Label htmlFor="hackclub-search-key" className="text-xs flex items-center gap-2">
                                <Globe className="h-3 w-3" />
                                Hack Club Search API Key
                                {serverKeys.hackclub_search && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Server configured</Badge>
                                )}
                            </Label>
                            {!serverKeys.hackclub_search && (
                                <>
                                    <Input
                                        id="hackclub-search-key"
                                        type="password"
                                        className="h-8 text-sm"
                                        placeholder="Your Hack Club Search key..."
                                        value={customAPIConfig.hackclub_search_key || ''}
                                        onChange={(e) => onCustomAPIConfigChange({ ...customAPIConfig, hackclub_search_key: e.target.value })}
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        Get a free API key at{' '}
                                        <a href="https://search.hackclub.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                            search.hackclub.com
                                        </a>
                                        {' '}(Sign in with Hack Club)
                                    </p>
                                </>
                            )}
                        </div>

                        {/* Cost Warning */}
                        {(customAPIConfig.search_strategy === 'perplexity' || customAPIConfig.search_strategy === 'both') && (
                            <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-700 dark:text-amber-400">
                                    <strong>Cost Notice:</strong> Perplexity search via OpenRouter may incur API charges.
                                    Consider using "Hack Club Only" or "Auto" mode to minimize costs.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Info className="h-4 w-4" />
                        <span>Changes are saved when you click "Save Changes" in the page header</span>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setActiveProfile('balanced');
                            onChange(BUILTIN_PROFILES.balanced.config);
                        }}
                    >
                        Reset to Defaults
                    </Button>
                </div>
            </div>
        </TooltipProvider>
    );
}
