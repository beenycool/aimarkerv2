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
    AlertCircle
} from 'lucide-react';
import { useStudentId } from '../../components/AuthProvider';
import { getOrCreateSettings, updateSettings, DEFAULT_SETTINGS } from '../../services/studentOS';

interface UserSettings {
    name: string;
    targetGrade: string;
    examYear: string;
    studyHoursPerDay: number;
    preferredStudyTime: string;
    notifications: boolean;
    darkMode: boolean;
}

export default function SettingsPage() {
    const studentId = useStudentId();
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
    });

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
                    });
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
            });
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
