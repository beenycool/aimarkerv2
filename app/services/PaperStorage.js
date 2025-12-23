import { supabase } from './supabaseClient';

export const PaperStorage = {
    /**
     * Upload a paper to Supabase Storage and save metadata to the DB
     */
    async uploadPaper(file, schemeFile, insertFile, metadata, studentId = null) {
        if (!file) throw new Error("Question paper is required");

        const timestamp = Date.now();
        const generatePath = (f) => `${timestamp}_${f.name.replace(/\s+/g, '_')}`;

        // 1. Upload Question Paper
        const pdfPath = generatePath(file);
        const { error: uploadError } = await supabase.storage
            .from('exam-papers')
            .upload(pdfPath, file);

        if (uploadError) throw uploadError;

        // 2. Upload Mark Scheme (optional)
        let schemePath = null;
        if (schemeFile) {
            schemePath = generatePath(schemeFile);
            const { error: schemeError } = await supabase.storage
                .from('exam-papers')
                .upload(schemePath, schemeFile);
            if (schemeError) throw schemeError;
        }

        // 3. Upload Insert (optional)
        let insertPath = null;
        if (insertFile) {
            insertPath = generatePath(insertFile);
            const { error: insertError } = await supabase.storage
                .from('exam-papers')
                .upload(insertPath, insertFile);
            if (insertError) throw insertError;
        }

        // 4. Save Metadata
        const { data, error: dbError } = await supabase
            .from('papers')
            .insert({
                name: metadata.name || file.name,
                section: metadata.section || metadata.paperNumber || 'Paper 1',
                year: metadata.year ? parseInt(metadata.year) : new Date().getFullYear(),
                subject: metadata.subject || 'Unknown Subject',
                board: metadata.board || 'Unknown Board',
                season: metadata.season || 'June',
                student_id: studentId,
                pdf_path: pdfPath,
                scheme_path: schemePath,
                insert_path: insertPath
            })
            .select()
            .single();

        if (dbError) throw dbError;
        return data;
    },

    /**
     * Fetch all saved papers
     */
    async listPapers() {
        const { data, error } = await supabase
            .from('papers')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
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