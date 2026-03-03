import { PaperStorage } from './PaperStorage';

// Mock supabaseClient to prevent actual network calls during import
jest.mock('./supabaseClient', () => ({
  supabase: {}
}));

describe('PaperStorage.uploadPaper', () => {
  it('should throw an error if file is not provided', async () => {
    // We expect the promise to be rejected since it's an async function
    await expect(PaperStorage.uploadPaper(null)).rejects.toThrow('Question paper is required');
  });
});
