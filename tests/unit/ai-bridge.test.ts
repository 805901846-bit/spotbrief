import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestAiEnhancement } from '../../src/bookmarklet/ai-bridge';

describe('AI bridge cancellation', () => {
  afterEach(() => vi.restoreAllMocks());

  it('closes the popup and removes its message listener when aborted', async () => {
    const popup = { close: vi.fn(), postMessage: vi.fn() } as unknown as Window;
    vi.spyOn(window, 'open').mockReturnValue(popup);
    const remove = vi.spyOn(window, 'removeEventListener');
    const abort = new AbortController();

    const request = requestAiEnhancement('brief', { url: 'https://example.test/bridge', token: 'token' }, abort.signal);
    abort.abort();

    await expect(request).rejects.toThrow('AI 优化已取消');
    expect(popup.close).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledWith('message', expect.any(Function));
  });
});
