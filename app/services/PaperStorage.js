import { supabase } from './supabaseClient';
import { retryWithBackoff } from '../lib/retryUtils';

async function requireAuthenticatedUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return user;

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw new Error(`Authentication required to save papers: ${error.message}`);
    return data?.user || null;
}

export const PaperStorage = {
    /**
     * Calculate SHA-256 hash of a file
     */
    async calculateFileHash(file) {
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    },

    /**
     * Check if a paper with the same hash already exists
     */
    async checkForDuplicate(file, studentId) {
        if (!file) return null;
        try {
            const fileHash = await this.calculateFileHash(file);
            const authUser = await requireAuthenticatedUser();
            if (!authUser) return null;

            const effectiveStudentId = authUser.id || studentId;

            const { data: existingPaper } = await supabase
                .from('papers')
                .select('*')
                .eq('file_hash', fileHash)
                .eq('student_id', effectiveStudentId)
                .maybeSingle();

            return existingPaper;
        } catch (e) {
            console.warn("Error checking for duplicate:", e);
            return null;
        }
    },

    /**
     * Upload a paper to Supabase Storage and save metadata to the DB
     */
    async uploadPaper(file, schemeFile, insertFile, metadata, studentId = null) {
        if (!file) throw new Error("Question paper is required");

        const authUser = await requireAuthenticatedUser();
        if (!authUser) throw new Error("Authentication required to save papers.");

        const ownerId = authUser.id;
        const effectiveStudentId = ownerId || studentId;

        // Calculate hash of the main question paper
        let fileHash = null;
        try {
            fileHash = await this.calculateFileHash(file);

            // Check for duplicate paper for this user with retry
            const existingPaper = await retryWithBackoff(
                async () => {
                    const { data } = await supabase
                        .from('papers')
                        .select('*')
                        .eq('file_hash', fileHash)
                        .eq('student_id', effectiveStudentId)
                        .maybeSingle();
                    return data;
                },
                { maxAttempts: 3, baseDelay: 1000 }
            );

            if (existingPaper) {
                console.log("Duplicate paper detected. Using existing record:", existingPaper);
                return existingPaper;
            }
        } catch (err) {
            console.warn("Failed to calculate hash or check duplicates:", err);
            // Proceed with upload if hash check fails
        }

        const timestamp = Date.now();
        const safeName = (name) => name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const generatePath = (f) => `${ownerId}/${timestamp}_${safeName(f.name)}`;

        // 1. Upload Question Paper with retry
        const pdfPath = generatePath(file);
        await retryWithBackoff(
            async () => {
                const { error: uploadError } = await supabase.storage
                    .from('exam-papers')
                    .upload(pdfPath, file, {
                        contentType: file.type || 'application/pdf',
                        upsert: false
                    });
                if (uploadError) throw uploadError;
            },
            { maxAttempts: 3, onRetry: (error, attempt) => console.log(`Retrying PDF upload (attempt ${attempt})...`) }
        );

        // 2. Upload Mark Scheme (optional) with retry
        let schemePath = null;
        if (schemeFile) {
            schemePath = generatePath(schemeFile);
            await retryWithBackoff(
                async () => {
                    const { error: schemeError } = await supabase.storage
                        .from('exam-papers')
                        .upload(schemePath, schemeFile, {
                            contentType: schemeFile.type || 'application/pdf',
                            upsert: false
                        });
                    if (schemeError) throw schemeError;
                },
                { maxAttempts: 3 }
            );
        }

        // 3. Upload Insert (optional) with retry
        let insertPath = null;
        if (insertFile) {
            insertPath = generatePath(insertFile);
            await retryWithBackoff(
                async () => {
                    const { error: insertError } = await supabase.storage
                        .from('exam-papers')
                        .upload(insertPath, insertFile, {
                            contentType: insertFile.type || 'application/pdf',
                            upsert: false
                        });
                    if (insertError) throw insertError;
                },
                { maxAttempts: 3 }
            );
        }

        // 4. Save Metadata with retry
        const data = await retryWithBackoff(
            async () => {
                const { data, error: dbError } = await supabase
                    .from('papers')
                    .insert({
                        name: metadata.name || file.name,
                        section: metadata.section || metadata.paperNumber || 'Paper 1',
                        year: metadata.year ? parseInt(metadata.year) : new Date().getFullYear(),
                        subject: metadata.subject || 'Unknown Subject',
                        board: metadata.board || 'Unknown Board',
                        season: metadata.season || 'June',
                        student_id: effectiveStudentId,
                        pdf_path: pdfPath,
                        scheme_path: schemePath,
                        insert_path: insertPath,
                        file_hash: fileHash,
                        parsed_questions: metadata.parsed_questions || null,
                        parsed_mark_scheme: metadata.parsed_mark_scheme || null
                    })
                    .select()
                    .single();

                if (dbError) throw dbError;
                return data;
            },
            { maxAttempts: 3, onRetry: (error, attempt) => console.log(`Retrying metadata save (attempt ${attempt})...`) }
        );

        return data;
    },

    /**
     * Fetch all saved papers
     */
    async listPapers() {
        return retryWithBackoff(
            async () => {
                const { data, error } = await supabase
                    .from('papers')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                return data;
            },
            {
                maxAttempts: 3,
                baseDelay: 1000,
                onRetry: (error, attempt) => {
                    console.log(`Retrying listPapers (attempt ${attempt})...`);
                }
            }
        );
    },

    /**
     * Get public URL for a file
     */
    getPublicUrl(path) {
        if (!path) return null;
        const { data } = supabase.storage
            .from('exam-papers')
            .getPublicUrl(path);
        return data.publicUrl;
    },

    /**
     * Delete a paper
     */
    async deletePaper(id, paths) {
        // 1. Delete files from storage
        const filesToDelete = [paths.pdf_path, paths.scheme_path, paths.insert_path].filter(Boolean);
        if (filesToDelete.length > 0) {
            await supabase.storage.from('exam-papers').remove(filesToDelete);
        }

        // 2. Delete record from DB
        const { error } = await supabase
            .from('papers')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }
};
