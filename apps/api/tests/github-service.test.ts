import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { GitHubService } from '../src/services/github.service';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('GitHubService pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches all accessible repositories across GitHub API pages', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: index + 1,
      name: `repo-${index + 1}`,
      full_name: `owner/repo-${index + 1}`,
      owner: { login: 'owner' },
    }));

    vi.mocked(axios.get)
      .mockResolvedValueOnce({ data: firstPage })
      .mockResolvedValueOnce({
        data: [
          {
            id: 101,
            name: 'repo-101',
            full_name: 'owner/repo-101',
            owner: { login: 'owner' },
          },
        ],
      });

    const repos = await GitHubService.fetchAccessibleRepositories('token');

    expect(repos).toHaveLength(101);
    expect(axios.get).toHaveBeenCalledTimes(2);
    expect(axios.get).toHaveBeenNthCalledWith(
      1,
      'https://api.github.com/user/repos',
      expect.objectContaining({
        params: expect.objectContaining({ per_page: 100, page: 1 }),
      })
    );
    expect(axios.get).toHaveBeenNthCalledWith(
      2,
      'https://api.github.com/user/repos',
      expect.objectContaining({
        params: expect.objectContaining({ per_page: 100, page: 2 }),
      })
    );
  });
});
