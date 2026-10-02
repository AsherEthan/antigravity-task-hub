// services/context-manager.js
/**
 * Context Ingestion & @ Context Mounting Manager
 * 
 * Part of Google Antigravity-inspired Windows Attached Sidebar Task Hub (Milestone M2).
 * Provides:
 *   - Synchronous desktop clipboard capture with length, timestamp, and truncated preview.
 *   - Regex-based @ token mention parser (@clipboard, @selection, @error, @code, @clue, @file:<path>).
 *   - Structured PromptContextEnvelope assembly with bounds checking and compound prompt serialization.
 */

const fs = require('fs');
const path = require('path');

// Constants for bounds checking & truncation
const MAX_PREVIEW_LENGTH = 100;
const MAX_RAW_ATTACHMENT_SIZE = 32768; // 32KB safety cap for IPC/context storage
const MAX_COMPOUND_BODY_LENGTH = 2000;  // 2000 chars cap per attachment in serialized prompt
const TRUNCATED_MARKER = ' [...truncated]';

/**
 * Synchronously capture desktop clipboard via Electron clipboard.
 * 
 * @param {object} [clipboardInstance] - Optional Electron clipboard instance
 * @returns {{ text: string, length: number, timestamp: number, preview: string }}
 */
function captureClipboard(clipboardInstance) {
  let clip = clipboardInstance;
  if (!clip) {
    try {
      const electron = require('electron');
      clip = electron.clipboard;
    } catch (e) {
      clip = null;
    }
  }

  let text = '';
  try {
    if (clip && typeof clip.readText === 'function') {
      text = clip.readText() || '';
    }
  } catch (err) {
    text = '';
  }

  const length = text.length;
  const timestamp = Date.now();
  let preview = text;

  if (length > MAX_PREVIEW_LENGTH) {
    preview = text.slice(0, MAX_PREVIEW_LENGTH - 3) + '...';
  }

  return {
    text,
    length,
    timestamp,
    preview
  };
}

/**
 * Regex parser extracting @ context mentions (@clipboard, @selection, @error, @code, @clue, @file:<path>).
 * Leaves bare @ (e.g. "user @ email" or "test @ abc") untouched as literal text.
 * Deduplicates identical tags while preserving order.
 * 
 * @param {string} rawPrompt - The raw prompt input from user
 * @returns {{ cleanPrompt: string, tokens: string[], tags: string[], hasTokens: boolean }}
 */
function parseContextMentions(rawPrompt = '') {
  const str = String(rawPrompt || '');
  // Matches @tag preceded by start of string or whitespace, followed by alphanumeric, path, backslash
  const tagRegex = /(?:^|\s)@([a-zA-Z0-9_\-\.\/:\\]+)/g;
  const tokens = [];
  let match;

  while ((match = tagRegex.exec(str)) !== null) {
    tokens.push('@' + match[1]);
  }

  // Deduplicate tokens preserving order
  const uniqueTokens = [...new Set(tokens)];

  // Clean prompt: strip matched @tag tokens and collapse multiple spaces
  const cleanPrompt = str
    .replace(/(?:^|\s)@([a-zA-Z0-9_\-\.\/:\\]+)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    cleanPrompt,
    tokens: uniqueTokens,
    tags: uniqueTokens, // Alias for backward/test compatibility
    hasTokens: uniqueTokens.length > 0
  };
}

/**
 * Parse slash command prefix from input query.
 * 
 * @param {string} input - Raw input string
 * @returns {{ command: string|null, commandName: string|null, rawInput: string, query: string }}
 */
function parseSlashCommand(input = '') {
  const trimmed = String(input || '').trim();
  const match = trimmed.match(/^\/([a-zA-Z0-9_\-]+)(?:\s+(.*))?$/s);
  if (!match) {
    return {
      command: null,
      commandName: null,
      rawInput: trimmed,
      query: trimmed
    };
  }
  return {
    command: '/' + match[1].toLowerCase(),
    commandName: match[1].toLowerCase(),
    rawInput: trimmed,
    query: (match[2] || '').trim()
  };
}

/**
 * Serializes compound prompt combining command, clean instruction, and mounted context blocks.
 * Applies bounds clamping on oversized attachment bodies to prevent IPC / memory exhaustion.
 * 
 * @param {object} params
 * @param {string|null} [params.command] - e.g. "/plan", "/shred", "/solve"
 * @param {string} [params.cleanPrompt] - Stripped user question
 * @param {Array<object>} [params.attachments] - Array of mounted attachments
 * @returns {string} Serialized compound prompt
 */
function assembleCompoundPrompt({ command, cleanPrompt, attachments = [] } = {}) {
  const parts = [];

  if (Array.isArray(attachments) && attachments.length > 0) {
    parts.push('=== 挂载现场上下文 (Mounted Context) ===');
    for (const att of attachments) {
      const tagLabel = att.tag || (att.type ? `@${att.type}` : '@context');
      parts.push(`[${tagLabel}]`);
      const rawBody = String(att.content || att.preview || att.text || '');
      const displayBody = rawBody.length > MAX_COMPOUND_BODY_LENGTH
        ? rawBody.slice(0, MAX_COMPOUND_BODY_LENGTH) + TRUNCATED_MARKER
        : rawBody;
      parts.push(displayBody);
    }
    parts.push('======================================\n');
  }

  if (command) {
    parts.push(`[指令]: ${command}`);
  }

  if (cleanPrompt) {
    parts.push(`[核心诉求]: ${cleanPrompt}`);
  }

  return parts.join('\n');
}

/**
 * Build a structured PromptContextEnvelope object.
 * Resolves context body for each tag (@clipboard -> clipboard text, @error -> active error, etc.),
 * enforces boundary safety (>32KB truncated), and serializes the compoundPrompt.
 * 
 * @param {object} options
 * @param {string} [options.rawPrompt] - The raw prompt text
 * @param {string} [options.clipboardText] - Text content of clipboard
 * @param {string} [options.activeError] - Current active error message
 * @param {string} [options.activeCode] - Current code snippet
 * @param {Array<object>} [options.customAttachments] - Additional explicit attachments
 * @param {string} [options.command] - Explicit command override
 * @param {string} [options.cleanPrompt] - Explicit clean prompt override
 * @param {Array<object>} [options.attachments] - Explicit pre-resolved attachments
 * @returns {object} PromptContextEnvelope
 */
function buildContextEnvelope(options = {}) {
  const rawInput = options.rawPrompt || options.rawInput || '';
  const clipboardText = typeof options.clipboardText === 'string' ? options.clipboardText : '';
  const activeError = typeof options.activeError === 'string' ? options.activeError : '';
  const activeCode = typeof options.activeCode === 'string' ? options.activeCode : '';
  const customAttachments = Array.isArray(options.customAttachments) ? options.customAttachments : [];

  // Parse slash command from rawInput if not explicitly provided
  let command = options.command || null;
  let commandName = null;
  let remainingQuery = rawInput;

  if (!command && rawInput.startsWith('/')) {
    const parsedCmd = parseSlashCommand(rawInput);
    command = parsedCmd.command;
    commandName = parsedCmd.commandName;
    remainingQuery = parsedCmd.query;
  } else if (command) {
    commandName = command.replace(/^\//, '').toLowerCase();
  }

  // Parse context mentions from remaining text
  const parsedMentions = parseContextMentions(remainingQuery);
  const cleanPrompt = options.cleanPrompt !== undefined ? options.cleanPrompt : parsedMentions.cleanPrompt;
  const tokens = parsedMentions.tokens;

  // Resolve attachments
  const attachments = [];
  const addedTags = new Set();

  // If explicit pre-resolved attachments were passed in, include them first
  if (Array.isArray(options.attachments)) {
    for (const att of options.attachments) {
      let content = String(att.content || att.preview || att.text || '');
      if (content.length > MAX_RAW_ATTACHMENT_SIZE) {
        content = content.slice(0, MAX_RAW_ATTACHMENT_SIZE) + TRUNCATED_MARKER;
      }
      attachments.push({
        tag: att.tag || (att.type ? `@${att.type}` : '@attachment'),
        type: att.type || 'custom',
        target: att.target || null,
        content,
        charCount: content.length,
        preview: content.length > MAX_PREVIEW_LENGTH
          ? content.slice(0, MAX_PREVIEW_LENGTH - 3) + '...'
          : content
      });
      if (att.tag) addedTags.add(att.tag);
    }
  }

  // Resolve each parsed @ token
  for (const token of tokens) {
    if (addedTags.has(token)) continue;
    addedTags.add(token);

    if (token === '@clipboard' || token === '@selection') {
      let body = clipboardText;
      if (body.length > MAX_RAW_ATTACHMENT_SIZE) {
        body = body.slice(0, MAX_RAW_ATTACHMENT_SIZE) + TRUNCATED_MARKER;
      }
      attachments.push({
        tag: token,
        type: token === '@selection' ? 'selection' : 'clipboard',
        target: null,
        content: body,
        charCount: body.length,
        preview: body.length > MAX_PREVIEW_LENGTH
          ? body.slice(0, MAX_PREVIEW_LENGTH - 3) + '...'
          : body
      });
    } else if (token === '@error') {
      let body = activeError;
      if (body.length > MAX_RAW_ATTACHMENT_SIZE) {
        body = body.slice(0, MAX_RAW_ATTACHMENT_SIZE) + TRUNCATED_MARKER;
      }
      attachments.push({
        tag: token,
        type: 'error',
        target: null,
        content: body,
        charCount: body.length,
        preview: body.length > MAX_PREVIEW_LENGTH
          ? body.slice(0, MAX_PREVIEW_LENGTH - 3) + '...'
          : body
      });
    } else if (token === '@code') {
      let body = activeCode;
      if (body.length > MAX_RAW_ATTACHMENT_SIZE) {
        body = body.slice(0, MAX_RAW_ATTACHMENT_SIZE) + TRUNCATED_MARKER;
      }
      attachments.push({
        tag: token,
        type: 'code',
        target: null,
        content: body,
        charCount: body.length,
        preview: body.length > MAX_PREVIEW_LENGTH
          ? body.slice(0, MAX_PREVIEW_LENGTH - 3) + '...'
          : body
      });
    } else if (token.startsWith('@file:')) {
      const targetPath = token.slice(6);
      let fileContent = '';
      try {
        const resolvedPath = path.isAbsolute(targetPath) ? targetPath : path.resolve(process.cwd(), targetPath);
        if (fs.existsSync(resolvedPath)) {
          fileContent = fs.readFileSync(resolvedPath, 'utf8');
        } else {
          fileContent = `[File not found: ${targetPath}]`;
        }
      } catch (err) {
        fileContent = `[Error reading file: ${err.message}]`;
      }
      if (fileContent.length > MAX_RAW_ATTACHMENT_SIZE) {
        fileContent = fileContent.slice(0, MAX_RAW_ATTACHMENT_SIZE) + TRUNCATED_MARKER;
      }
      attachments.push({
        tag: token,
        type: 'file',
        target: targetPath,
        content: fileContent,
        charCount: fileContent.length,
        preview: fileContent.length > MAX_PREVIEW_LENGTH
          ? fileContent.slice(0, MAX_PREVIEW_LENGTH - 3) + '...'
          : fileContent
      });
    } else if (token.startsWith('@clue')) {
      const clueId = token.includes(':') ? token.split(':')[1] : null;
      attachments.push({
        tag: token,
        type: 'clue',
        target: clueId,
        content: `[Clue reference: ${token}]`,
        charCount: token.length,
        preview: token
      });
    } else {
      attachments.push({
        tag: token,
        type: 'custom',
        target: null,
        content: '',
        charCount: 0,
        preview: ''
      });
    }
  }

  // Append customAttachments
  for (const custom of customAttachments) {
    const tag = custom.tag || (custom.type ? `@${custom.type}` : '@custom');
    if (!addedTags.has(tag)) {
      addedTags.add(tag);
      let body = String(custom.content || custom.preview || custom.text || '');
      if (body.length > MAX_RAW_ATTACHMENT_SIZE) {
        body = body.slice(0, MAX_RAW_ATTACHMENT_SIZE) + TRUNCATED_MARKER;
      }
      attachments.push({
        tag,
        type: custom.type || 'custom',
        target: custom.target || null,
        content: body,
        charCount: body.length,
        preview: body.length > MAX_PREVIEW_LENGTH
          ? body.slice(0, MAX_PREVIEW_LENGTH - 3) + '...'
          : body
      });
    }
  }

  // Assemble compound prompt
  const compoundPrompt = assembleCompoundPrompt({
    command,
    cleanPrompt,
    attachments
  });

  return {
    command,
    commandName,
    rawInput,
    rawPrompt: rawInput,
    cleanPrompt,
    tokens,
    tags: tokens, // Alias for compatibility
    hasTokens: tokens.length > 0,
    attachments,
    compoundPrompt,
    timestamp: Date.now()
  };
}

/**
 * Detects if text contains stack trace or obvious error keywords.
 * @param {string} text 
 * @returns {{ isException: boolean, errorType: string|null, preview: string, hasStack: boolean }}
 */
function detectException(text = '') {
  if (!text || typeof text !== 'string') {
    return { isException: false, errorType: null, preview: '', hasStack: false };
  }
  const trimmed = text.trim();
  if (trimmed.length < 5) {
    return { isException: false, errorType: null, preview: '', hasStack: false };
  }

  // 1. Stack trace regex signatures
  const jsStackRegex = /^\s*at\s+(?:async\s+)?(?:[a-zA-Z0-9_$<>.]+\s+\()?[^()\n]+:\d+(?::\d+)?\)?/m;
  const pyStackRegex = /(?:Traceback\s+\(most\s+recent\s+call\s+last\):|File\s+["'][^"']+["'],\s+line\s+\d+,\s+in)/i;
  const javaStackRegex = /(?:^\s*at\s+[a-zA-Z0-9_$<>/]+(?:\.[a-zA-Z0-9_$<>/]+)+\([a-zA-Z0-9_$.]+\.(?:java|kt):\d+\)|\b(?:Exception|Error)\s+in\s+thread\s+)/m;
  const goPanicRegex = /(?:panic:\s+|fatal error:\s+|goroutine\s+\d+\s+\[)/;

  // 2. High-signal error keywords
  const errorKeywords = [
    /TypeError:/i,
    /ReferenceError:/i,
    /SyntaxError:/i,
    /RangeError:/i,
    /UnhandledPromiseRejection/i,
    /NullPointerException/i,
    /AssertionError/i,
    /Segmentation fault/i,
    /ECONNREFUSED/i,
    /ETIMEDOUT/i,
    /ENOTFOUND/i,
    /ModuleNotFoundError/i,
    /Cannot find module/i,
    /failed with exit code\s+\d+/i,
    /Caused by:\s+[^\n]+/i,
    /(?:[a-zA-Z0-9_$]+)?(?:Error|Exception):\s+[^\n]+/i
  ];

  const hasStack = jsStackRegex.test(trimmed) || pyStackRegex.test(trimmed) || javaStackRegex.test(trimmed) || goPanicRegex.test(trimmed);
  const matchedKeyword = errorKeywords.find(reg => reg.test(trimmed));
  const isException = Boolean(hasStack || matchedKeyword);

  let errorType = null;
  if (matchedKeyword) {
    const errorMatch = trimmed.match(/(?:[a-zA-Z0-9_$]+)?(?:Error|Exception)/);
    if (errorMatch) {
      errorType = errorMatch[0];
    } else {
      errorType = 'Error';
    }
  } else if (hasStack) {
    errorType = 'StackTrace';
  }

  return {
    isException,
    errorType,
    preview: trimmed.slice(0, 100),
    hasStack
  };
}

/**
 * Classifies clipboard content into 'error', 'code', or 'text'.
 * @param {string} text 
 * @returns {{ type: 'error' | 'code' | 'text', isException: boolean, errorType: string|null, preview: string }}
 */
function classifyClipboardContent(text = '') {
  const exceptionInfo = detectException(text);
  if (exceptionInfo.isException) {
    return {
      type: 'error',
      isException: true,
      errorType: exceptionInfo.errorType,
      preview: exceptionInfo.preview
    };
  }

  const trimmed = String(text || '').trim();
  const codePatterns = [
    /(?:const|let|var)\s+[a-zA-Z0-9_$]+\s*=/,
    /function\s*(?:[a-zA-Z0-9_$]+)?\s*\(/,
    /class\s+[a-zA-Z0-9_$]+/,
    /import\s+.*from\s+['"]/,
    /export\s+(?:default|const|function|class)/,
    /def\s+[a-zA-Z0-9_]+\s*\(/,
    /public\s+(?:static\s+)?(?:void|class|int|String)/,
    /=>\s*\{?/,
    /\{[\s\S]{10,}\}/,
    /<[a-zA-Z][\w-]*(\s+[^>]*)?>.*<\/[a-zA-Z][\w-]*>/s
  ];

  const isCode = codePatterns.some(reg => reg.test(trimmed));
  return {
    type: isCode ? 'code' : 'text',
    isException: false,
    errorType: null,
    preview: trimmed.slice(0, 100)
  };
}

/**
 * ContextManager Class
 * Provides both object-oriented and functional access to context ingestion features.
 */
class ContextManager {
  constructor(options = {}) {
    this.options = options;
  }

  captureClipboard(clipboardInstance) {
    return captureClipboard(clipboardInstance);
  }

  parseContextMentions(rawPrompt) {
    return parseContextMentions(rawPrompt);
  }

  parseAtTokens(rawPrompt) {
    return parseContextMentions(rawPrompt);
  }

  parseSlashCommand(input) {
    return parseSlashCommand(input);
  }

  assembleCompoundPrompt(options) {
    return assembleCompoundPrompt(options);
  }

  buildContextEnvelope(options) {
    return buildContextEnvelope(options);
  }

  detectException(text) {
    return detectException(text);
  }

  classifyClipboardContent(text) {
    return classifyClipboardContent(text);
  }
}

// Bind static methods for direct invocation via ContextManager.captureClipboard, etc.
ContextManager.captureClipboard = captureClipboard;
ContextManager.parseContextMentions = parseContextMentions;
ContextManager.parseAtTokens = parseContextMentions;
ContextManager.parseSlashCommand = parseSlashCommand;
ContextManager.assembleCompoundPrompt = assembleCompoundPrompt;
ContextManager.buildContextEnvelope = buildContextEnvelope;
ContextManager.detectException = detectException;
ContextManager.classifyClipboardContent = classifyClipboardContent;

module.exports = {
  captureClipboard,
  parseContextMentions,
  parseAtTokens: parseContextMentions,
  parseSlashCommand,
  assembleCompoundPrompt,
  buildContextEnvelope,
  detectException,
  classifyClipboardContent,
  ContextManager
};

