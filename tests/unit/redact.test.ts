import test from 'node:test';
import assert from 'node:assert/strict';
import { redactObject, redactInline } from '../../src/redact.js';

test('redacts sensitive env keys and token-looking values', () => {
  assert.deepEqual(redactObject({ API_TOKEN: 'sk-testsecret123456789', NORMAL: 'ok' }), { API_TOKEN: '<redacted>', NORMAL: 'ok' });
});

test('redacts inline token patterns', () => {
  assert.equal(redactInline('token=ghp_123456789012345678901234567890'), 'token=<redacted>');
});
