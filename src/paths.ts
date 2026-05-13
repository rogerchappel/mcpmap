import os from 'node:os';
import path from 'node:path';
import type { ConfigSource } from './types.js';

export function defaultConfigSources(home = os.homedir()): ConfigSource[] {
  const platform = process.platform;
  const sources: Array<[string, string]> = [
    ['Claude Desktop macOS', 'Library/Application Support/Claude/claude_desktop_config.json'],
    ['Claude Desktop Windows', 'AppData/Roaming/Claude/claude_desktop_config.json'],
    ['Claude Desktop Linux', '.config/Claude/claude_desktop_config.json'],
    ['VS Code user MCP', platform === 'win32' ? 'AppData/Roaming/Code/User/mcp.json' : platform === 'darwin' ? 'Library/Application Support/Code/User/mcp.json' : '.config/Code/User/mcp.json'],
    ['VS Code settings', platform === 'win32' ? 'AppData/Roaming/Code/User/settings.json' : platform === 'darwin' ? 'Library/Application Support/Code/User/settings.json' : '.config/Code/User/settings.json'],
    ['Cursor user MCP', platform === 'win32' ? 'AppData/Roaming/Cursor/User/mcp.json' : platform === 'darwin' ? 'Library/Application Support/Cursor/User/mcp.json' : '.config/Cursor/User/mcp.json'],
    ['Cursor settings', platform === 'win32' ? 'AppData/Roaming/Cursor/User/settings.json' : platform === 'darwin' ? 'Library/Application Support/Cursor/User/settings.json' : '.config/Cursor/User/settings.json'],
    ['Windsurf MCP', '.codeium/windsurf/mcp_config.json'],
    ['Generic MCP config', '.mcp.json']
  ];
  return sources.map(([label, relative]) => ({ path: path.join(home, relative), label, exists: false, explicit: false }));
}

export function buildSources(explicitPaths: string[], options: { includeDefaults: boolean; cwd: string; home: string }): ConfigSource[] {
  const explicit = explicitPaths.map((item) => ({
    path: path.resolve(options.cwd, item),
    label: 'explicit',
    exists: false,
    explicit: true
  }));
  return [...explicit, ...(options.includeDefaults ? defaultConfigSources(options.home) : [])];
}
