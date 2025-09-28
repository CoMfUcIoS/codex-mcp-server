import { jest } from '@jest/globals';
import { withTimeout } from '../timeout';

describe('withTimeout', () => {
  it('resolves when promise resolves before timeout', async () => {
    const promise = Promise.resolve('success');
    const result = await withTimeout(promise, 100);
    expect(result).toBe('success');
  });

  it('rejects when promise rejects before timeout', async () => {
    const promise = Promise.reject(new Error('failed'));
    await expect(withTimeout(promise, 100)).rejects.toThrow('failed');
  });

  it('times out when promise takes too long', async () => {
    const promise = new Promise((resolve) => {
      setTimeout(() => resolve('too late'), 200);
    });

    await expect(withTimeout(promise, 50)).rejects.toThrow('operation timed out after 50ms');
  });

  it('uses custom label in timeout message', async () => {
    const promise = new Promise((resolve) => {
      setTimeout(() => resolve('too late'), 200);
    });

    await expect(withTimeout(promise, 50, 'custom task')).rejects.toThrow('custom task timed out after 50ms');
  });

  it('clears timeout when promise resolves', async () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const promise = Promise.resolve('success');

    await withTimeout(promise, 100);

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('clears timeout when promise rejects', async () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const promise = Promise.reject(new Error('failed'));

    try {
      await withTimeout(promise, 100);
    } catch (e) {
      // Expected
    }

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});