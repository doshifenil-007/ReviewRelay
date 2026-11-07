import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { AuthService } from '../src/services/auth.service';
import { config } from '../src/config/env';

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    isAxiosError: (err: any) => Boolean(err?.isAxiosError),
  },
}));

describe('AuthService GitHub OAuth diagnostics', () => {
  const originalEnvClientId = process.env.GITHUB_CLIENT_ID;
  const originalEnvClientSecret = process.env.GITHUB_CLIENT_SECRET;
  const originalClientId = config.github.clientId;
  const originalClientSecret = config.github.clientSecret;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GITHUB_CLIENT_ID = 'dummy-client-id';
    process.env.GITHUB_CLIENT_SECRET = 'dummy-client-secret';
    config.github.clientId = 'dummy-client-id';
    config.github.clientSecret = 'dummy-client-secret';
  });

  afterEach(() => {
    if (originalEnvClientId !== undefined) {
      process.env.GITHUB_CLIENT_ID = originalEnvClientId;
    } else {
      delete process.env.GITHUB_CLIENT_ID;
    }
    if (originalEnvClientSecret !== undefined) {
      process.env.GITHUB_CLIENT_SECRET = originalEnvClientSecret;
    } else {
      delete process.env.GITHUB_CLIENT_SECRET;
    }
    config.github.clientId = originalClientId;
    config.github.clientSecret = originalClientSecret;
  });

  it('surfaces GitHub token exchange errors without requiring token logging', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(axios.post).mockResolvedValue({
      data: {
        error: 'bad_verification_code',
        error_description: 'The code passed is incorrect or expired.',
      },
      headers: {},
    });

    await expect(AuthService.handleGitHubOAuth('expired-code')).rejects.toThrow(
      'bad_verification_code'
    );
    expect(axios.get).not.toHaveBeenCalled();

    // Verify error was surfaced and logged without exposing client secrets or access tokens
    expect(consoleErrorSpy).toHaveBeenCalled();
    const allLoggedContent = consoleErrorSpy.mock.calls
      .flat()
      .map((item) => (typeof item === 'object' ? JSON.stringify(item) : String(item)))
      .join(' ');

    expect(allLoggedContent).toContain('bad_verification_code');
    expect(allLoggedContent).not.toContain('dummy-client-secret');
    expect(allLoggedContent).not.toContain('access_token');

    consoleErrorSpy.mockRestore();
  });
});
