import { McpmapError } from './errors.js';

export function stripJsonComments(input: string): string {
  let output = '';
  let inString = false;
  let quote = '';
  let escaped = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i] ?? '';
    const next = input[i + 1] ?? '';
    if (inString) {
      output += char;
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) inString = false;
      continue;
    }
    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      output += char;
      continue;
    }
    if (char === '/' && next === '/') {
      while (i < input.length && input[i] !== '\n') i += 1;
      output += '\n';
      continue;
    }
    if (char === '/' && next === '*') {
      i += 2;
      while (i < input.length && !(input[i] === '*' && input[i + 1] === '/')) i += 1;
      i += 1;
      output += ' ';
      continue;
    }
    output += char;
  }
  return output;
}

export function removeTrailingCommas(input: string): string {
  let output = '';
  let inString = false;
  let quote = '';
  let escaped = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i] ?? '';
    if (inString) {
      output += char;
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) inString = false;
      continue;
    }
    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      output += char;
      continue;
    }
    if (char === ',') {
      let j = i + 1;
      while (/\s/.test(input[j] ?? '')) j += 1;
      if (input[j] === '}' || input[j] === ']') continue;
    }
    output += char;
  }
  return output;
}

export function parseJsonc(text: string, path: string): unknown {
  try {
    return JSON.parse(removeTrailingCommas(stripJsonComments(text)));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new McpmapError(`Failed to parse ${path}: ${message}`, 'PARSE_ERROR');
  }
}
