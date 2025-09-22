import {
  sanitizePrompt,
  buildPromptWithSentinels,
  stripEchoesAndMarkers,
  makeRunId,
} from '../promptSanitizer';

describe('makeRunId', () => {
  it('returns a non-empty string with a timestamp', () => {
    const id = makeRunId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(10);
    // Should end with a base36 timestamp
    expect(id).toMatch(/[0-9a-z]+$/);
  });
});

describe('sanitizePrompt', () => {
  it('removes dangerous shell characters', () => {
    const input = 'echo hello && rm -rf /';
    const sanitized = sanitizePrompt(input);
    expect(sanitized).not.toContain('&&');
    expect(sanitized).not.toContain('rm -rf');
  });

  it('allows safe prompts', () => {
    const input = 'What is the weather today?';
    const sanitized = sanitizePrompt(input);
    expect(sanitized).toBe(input);
  });
});

describe('sentinels + strip', () => {
  it('builds prompt without context when stitchedContext is null', () => {
    const p = buildPromptWithSentinels('id', null, 'ask');
    expect(p).toContain('<<USR:id:START>>');
    expect(p).not.toContain('<<CTX:id:START>>');
  });

  it('stripEchoesAndMarkers leaves raw when markers absent', () => {
    const out = stripEchoesAndMarkers('id', null, 'plain output');
    expect(out).toBe('plain output');
  });

  it('stripEchoesAndMarkers trims leading whitespace', () => {
    const out = stripEchoesAndMarkers(
      'id',
      null,
      '   <<ANS:id:START>>   answer'
    );
    expect(out.startsWith('answer')).toBe(true);
  });
});
