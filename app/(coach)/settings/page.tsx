'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import {
    Settings as SettingsIcon,
    User,
    Bell,
    Moon,
    Sun,
    Calendar,
    Clock,
    Target,
    Save,
    Check,
    AlertCircle,
    Sparkles,
    Zap,
    Bot,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { useStudentId } from '../../components/AuthProvider';
import { getOrCreateSettings, updateSettings, DEFAULT_SETTINGS, DEFAULT_AI_PREFERENCES } from '../../services/studentOS';
import { clearSettingsCache } from '../../services/AIService';
import { useTheme } from 'next-themes';
import AIConfigTable, { CustomAPIConfig } from '../../components/AIConfigTable';

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
}

interface CustomProfile {
    name: string;
    config: AIPreferences;
    createdAt: string;
}

interface UserSettings {
    name: string;
    targetGrade: string;
    examYear: string;
    studyHoursPerDay: number;
    preferredStudyTime: string;
    notifications: boolean;
    darkMode: boolean;
    openrouterEnabled: boolean;
    hackclubEnabled: boolean;
}

export default function SettingsPage() {
    const studentId = useStudentId();
    const { setTheme } = useTheme();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [settings, setSettings] = useState<UserSettings>({
        name: '',
        targetGrade: '7',
        examYear: '2026',
        studyHoursPerDay: 2,
        preferredStudyTime: 'evening',
        notifications: true,
        darkMode: false,
        openrouterEnabled: true,
        hackclubEnabled: true,
    });
    const [aiPreferences, setAiPreferences] = useState<AIPreferences>(DEFAULT_AI_PREFERENCES as AIPreferences);
    const [customAPIConfig, setCustomAPIConfig] = useState<CustomAPIConfig>({ openai_endpoint: '', openai_key: '', gemini_key: '' });
    const [customProfiles, setCustomProfiles] = useState<CustomProfile[]>([]);
    const [showAdvancedAI, setShowAdvancedAI] = useState(false);

    useEffect(() => {
        if (!studentId) return;

        const loadSettings = async () => {
            setLoading(true);
            try {
                const data = await getOrCreateSettings(studentId);
                if (data) {
                    setSettings({
                        name: data.name || '',
                        targetGrade: data.target_grade || '7',
                        examYear: data.exam_year || '2026',
                        studyHoursPerDay: data.study_hours_per_day || 2,
                        preferredStudyTime: data.preferred_study_time || 'evening',
                        notifications: data.notifications ?? true,
                        darkMode: data.dark_mode ?? false,
                        openrouterEnabled: data.openrouter_enabled ?? true,
                        hackclubEnabled: data.hackclub_enabled ?? true,
                    });
                    // Load AI preferences
                    if (data.ai_preferences) {
                        setAiPreferences({
                            ...DEFAULT_AI_PREFERENCES,
                            ...data.ai_preferences,
                        } as AIPreferences);
                    }
                    // Load custom API config
                    if (data.custom_api_config) {
                        setCustomAPIConfig({
                            openai_endpoint: data.custom_api_config.openai_endpoint || '',
                            openai_key: data.custom_api_config.openai_key || '',
                            gemini_key: data.custom_api_config.gemini_key || ''
                        });
                    }
                    // Load custom AI profiles
                    if (data.custom_ai_profiles && Array.isArray(data.custom_ai_profiles)) {
                        setCustomProfiles(data.custom_ai_profiles);
                    }
                    // Apply theme from settings
                    setTheme(data.dark_mode ? 'dark' : 'light');
                }
            } catch (error) {
                console.error('Failed to load settings:', error);
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, [studentId]);

    const handleSave = async () => {
        if (!studentId) return;

        setSaving(true);
        try {
            await updateSettings(studentId, {
                name: settings.name,
                target_grade: settings.targetGrade,
                exam_year: settings.examYear,
                study_hours_per_day: settings.studyHoursPerDay,
                preferred_study_time: settings.preferredStudyTime,
                notifications: settings.notifications,
                dark_mode: settings.darkMode,
                openrouter_enabled: settings.openrouterEnabled,
                hackclub_enabled: settings.hackclubEnabled,
                ai_preferences: aiPreferences,
                custom_api_config: customAPIConfig,
                custom_ai_profiles: customProfiles,
            });
            clearSettingsCache(); // Clear AI service cache so new settings take effect
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (error) {
            console.error('Failed to save settings:', error);
        } finally {
            setSaving(false);
        }
    };

    const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));

        // Immediately apply theme change if darkMode is toggled
        if (key === 'darkMode') {
            setTheme(value ? 'dark' : 'light');
        }
    };

    const handleSaveProfile = (profile: CustomProfile) => {
        setCustomProfiles(prev => [...prev, profile]);
    };

    const handleDeleteProfile = (profileName: string) => {
        setCustomProfiles(prev => prev.filter(p => p.name !== profileName));
    };

    return (
        <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl lg:text-3xl font-semibold text-foreground flex items-center gap-3">
                        <SettingsIcon className="h-7 w-7 text-primary" />
                        Settings
                    </h1>
                    <p className="text-muted-foreground">
                        Customize your study experience.
                    </p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                    {saving ? (
                        <>Saving...</>
                    ) : saved ? (
                        <>
                            <Check className="h-4 w-4" />
                            Saved
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4" />
                            Save Changes
                        </>
                    )}
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">Loading settings...</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Profile */}
                    <Card className="card-shadow">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <User className="h-5 w-5 text-muted-foreground" />
                                Profile
                            </CardTitle>
                            <CardDescription>Your personal information</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Display Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="Your name"
                                        value={settings.name}
                                        onChange={(e) => updateSetting('name', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="studentId">Student ID</Label>
                                    <Input
                                        id="studentId"
                                        value={studentId || ''}
                                        disabled
                                        className="bg-secondary"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Academic Goals */}
                    <Card className="card-shadow">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Target className="h-5 w-5 text-muted-foreground" />
                                Academic Goals
                            </CardTitle>
                            <CardDescription>Set your targets and exam year</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="targetGrade">Target Grade (Average)</Label>
                                    <Select
                                        value={settings.targetGrade}
                                        onValueChange={(v) => updateSetting('targetGrade', v)}
                                    >
                                        <SelectTrigger id="targetGrade">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {['9', '8', '7', '6', '5', '4', '3'].map((grade) => (
                                                <SelectItem key={grade} value={grade}>
                                                    Grade {grade}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="examYear">Exam Year</Label>
                                    <Select
                                        value={settings.examYear}
                                        onValueChange={(v) => updateSetting('examYear', v)}
                                    >
                                        <SelectTrigger id="examYear">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="2025">2025</SelectItem>
                                            <SelectItem value="2026">2026</SelectItem>
                                            <SelectItem value="2027">2027</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Study Preferences */}
                    <Card className="card-shadow">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Clock className="h-5 w-5 text-muted-foreground" />
                                Study Preferences
                            </CardTitle>
                            <CardDescription>Customize your study schedule</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="studyHours">Study Hours Per Day</Label>
                                    <Select
                                        value={String(settings.studyHoursPerDay)}
                                        onValueChange={(v) => updateSetting('studyHoursPerDay', parseInt(v))}
                                    >
                                        <SelectTrigger id="studyHours">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[1, 2, 3, 4, 5, 6].map((hours) => (
                                                <SelectItem key={hours} value={String(hours)}>
                                                    {hours} {hours === 1 ? 'hour' : 'hours'}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="preferredTime">Preferred Study Time</Label>
                                    <Select
                                        value={settings.preferredStudyTime}
                                        onValueChange={(v) => updateSetting('preferredStudyTime', v)}
                                    >
                                        <SelectTrigger id="preferredTime">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="morning">Morning (6am - 12pm)</SelectItem>
                                            <SelectItem value="afternoon">Afternoon (12pm - 6pm)</SelectItem>
                                            <SelectItem value="evening">Evening (6pm - 10pm)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Appearance */}
                    <Card className="card-shadow">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Sun className="h-5 w-5 text-muted-foreground" />
                                Appearance
                            </CardTitle>
                            <CardDescription>Customize the look and feel</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {settings.darkMode ? (
                                        <Moon className="h-5 w-5 text-muted-foreground" />
                                    ) : (
                                        <Sun className="h-5 w-5 text-muted-foreground" />
                                    )}
                                    <div>
                                        <p className="font-medium">Dark Mode</p>
                                        <p className="text-sm text-muted-foreground">
                                            {settings.darkMode ? 'Dark theme enabled' : 'Light theme enabled'}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant={settings.darkMode ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => updateSetting('darkMode', !settings.darkMode)}
                                >
                                    {settings.darkMode ? 'On' : 'Off'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notifications */}
                    <Card className="card-shadow">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Bell className="h-5 w-5 text-muted-foreground" />
                                Notifications
                            </CardTitle>
                            <CardDescription>Manage your notification preferences</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Bell className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="font-medium">Study Reminders</p>
                                        <p className="text-sm text-muted-foreground">
                                            Get reminded when it&apos;s time to study
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant={settings.notifications ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => updateSetting('notifications', !settings.notifications)}
                                >
                                    {settings.notifications ? 'On' : 'Off'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* AI Features */}
                    <Card className="card-shadow border-primary/20">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Sparkles className="h-5 w-5 text-primary" />
                                        AI Features
                                    </CardTitle>
                                    <CardDescription>Configure AI providers and models for each feature</CardDescription>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                    Power User
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Quick Toggles */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                    <div className="flex items-center gap-3">
                                        <Bot className="h-5 w-5 text-blue-500" />
                                        <div>
                                            <p className="font-medium text-sm">OpenRouter</p>
                                            <p className="text-xs text-muted-foreground">Vision & chat</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant={settings.openrouterEnabled ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => updateSetting('openrouterEnabled', !settings.openrouterEnabled)}
                                    >
                                        {settings.openrouterEnabled ? 'On' : 'Off'}
                                    </Button>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                    <div className="flex items-center gap-3">
                                        <Zap className="h-5 w-5 text-amber-500" />
                                        <div>
                                            <p className="font-medium text-sm">Hack Club</p>
                                            <p className="text-xs text-muted-foreground">Grading & planning</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant={settings.hackclubEnabled ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => updateSetting('hackclubEnabled', !settings.hackclubEnabled)}
                                    >
                                        {settings.hackclubEnabled ? 'On' : 'Off'}
                                    </Button>
                                </div>
                            </div>

                            {(!settings.openrouterEnabled || !settings.hackclubEnabled) && (
                                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                    <p className="text-sm text-amber-600">
                                        ⚠️ Disabling API providers will limit functionality for features that use them.
                                    </p>
                                </div>
                            )}

                            {/* Advanced Configuration Toggle */}
                            <Button
                                variant="ghost"
                                className="w-full justify-between"
                                onClick={() => setShowAdvancedAI(!showAdvancedAI)}
                            >
                                <span className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4" />
                                    Advanced AI Configuration
                                </span>
                                {showAdvancedAI ? (
                                    <ChevronUp className="h-4 w-4" />
                                ) : (
                                    <ChevronDown className="h-4 w-4" />
                                )}
                            </Button>

                            {/* Advanced AI Config Table */}
                            {showAdvancedAI && (
                                <div className="pt-2">
                                    <AIConfigTable
                                        preferences={aiPreferences}
                                        onChange={setAiPreferences}
                                        customAPIConfig={customAPIConfig}
                                        onCustomAPIConfigChange={setCustomAPIConfig}
                                        customProfiles={customProfiles}
                                        onSaveProfile={handleSaveProfile}
                                        onDeleteProfile={handleDeleteProfile}
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Data */}
                    <Card className="card-shadow border-destructive/30">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                                <AlertCircle className="h-5 w-5" />
                                Data Management
                            </CardTitle>
                            <CardDescription>Manage your account data</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/5">
                                <div>
                                    <p className="font-medium text-destructive">Reset All Progress</p>
                                    <p className="text-sm text-muted-foreground">
                                        This will delete all your study data. Cannot be undone.
                                    </p>
                                </div>
                                <Button variant="destructive" size="sm">
                                    Reset
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
