import { createClient } from '@/app/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';
import {
    listSubjects,
    listQuestionAttempts,
    listAssessments,
    getOrCreateSettings,
    getStudyStreak,
    getWeeklyAttemptStats
} from '../../services/studentOS';

export const metadata = {
    title: 'Dashboard | AI Coach',
    description: 'Your personal GCSE revision dashboard'
};

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        redirect('/login');
    }

    const studentId = user.id;

    // Parallel data fetching
    const [
        subjects,
        attempts,
        assessments,
        settings,
        streakData,
        weekStats
    ] = await Promise.all([
        listSubjects(studentId, supabase),
        listQuestionAttempts(studentId, { limit: 250 }, supabase),
        listAssessments(studentId, supabase).catch(() => []),
        getOrCreateSettings(studentId, supabase).catch(() => null),
        getStudyStreak(studentId, supabase),
        getWeeklyAttemptStats(studentId, supabase)
    ]);

    return (
        <DashboardClient
            initialSubjects={subjects || []}
            initialAttempts={attempts || []}
            initialAssessments={assessments || []}
            initialSettings={settings}
            initialStreak={streakData}
            initialWeekStats={weekStats}
            studentId={studentId}
            user={user}
        />
    );
}
