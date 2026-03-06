import { PaperStorage } from './PaperStorage';
import { supabase } from './supabaseClient';

// Mock supabaseClient to prevent actual network calls during import
jest.mock('./supabaseClient', () => {
  const mSupabase = {
    auth: {
      getUser: jest.fn(),
      signInAnonymously: jest.fn(),
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(),
    storage: {
      from: jest.fn().mockReturnThis(),
      upload: jest.fn(),
    },
  };
  return { supabase: mSupabase };
});

describe('PaperStorage.uploadPaper', () => {
  beforeAll(() => {
    // Mock crypto.subtle.digest for calculateFileHash
    Object.defineProperty(global, 'crypto', {
      value: {
        subtle: {
          digest: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
        },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an error if file is not provided', async () => {
    // We expect the promise to be rejected since it's an async function
    await expect(PaperStorage.uploadPaper(null)).rejects.toThrow('Question paper is required');
  });

  it('should throw an error if upload fails', async () => {
    const fakeFile = {
      name: 'test.pdf',
      type: 'application/pdf',
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
    };
    const fakeMetadata = {
      name: 'Test Paper',
      section: 'Paper 1',
    };

    // Mock authenticated user
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    });

    // Mock existing paper check (no duplicate)
    supabase.maybeSingle.mockResolvedValue({ data: null });

    // Mock upload error
    const uploadError = new Error('Upload failed');
    supabase.storage.upload.mockResolvedValue({ error: uploadError });

    await expect(
      PaperStorage.uploadPaper(fakeFile, null, null, fakeMetadata)
    ).rejects.toThrow('Upload failed');
  });
});
