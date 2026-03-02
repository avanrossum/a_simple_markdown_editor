import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { Marked } from 'marked';
import DOMPurify from 'dompurify';

// ── Marked instance with source-line annotations ──

function isRelativePath(src) {
  return src && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:') && !src.startsWith('/') && !src.startsWith('local-resource://');
}

function resolveRelativePath(baseDir, relativeSrc) {
  const baseParts = baseDir.split('/').filter(Boolean);
  const srcParts = relativeSrc.split('/');
  const resolved = [...baseParts];
  for (const part of srcParts) {
    if (part === '..') resolved.pop();
    else if (part !== '.') resolved.push(part);
  }
  return '/' + resolved.join('/');
}

function createAnnotatedRenderer() {
  let currentBaseDir = null;

  const md = new Marked({ breaks: true, gfm: true });

  md.use({
    renderer: {
      image(token) {
        let src = token.href || '';
        if (currentBaseDir && isRelativePath(src)) {
          const absPath = resolveRelativePath(currentBaseDir, src);
          src = `local-resource://${absPath}`;
        }
        const alt = token.text || '';
        const title = token.title ? ` title="${token.title}"` : '';
        return `<img src="${src}" alt="${alt}"${title} />`;
      },
      heading(token) {
        const text = this.parser.parseInline(token.tokens);
        const attr = token._sourceLine != null ? ` data-source-line="${token._sourceLine}"` : '';
        return `<h${token.depth}${attr}>${text}</h${token.depth}>\n`;
      },
      paragraph(token) {
        const text = this.parser.parseInline(token.tokens);
        const attr = token._sourceLine != null ? ` data-source-line="${token._sourceLine}"` : '';
        return `<p${attr}>${text}</p>\n`;
      },
      code(token) {
        const langClass = token.lang ? ` class="language-${token.lang}"` : '';
        const attr = token._sourceLine != null ? ` data-source-line="${token._sourceLine}"` : '';
        const escaped = token.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<pre${attr}><code${langClass}>${escaped}</code></pre>\n`;
      },
      blockquote(token) {
        const body = this.parser.parse(token.tokens);
        const attr = token._sourceLine != null ? ` data-source-line="${token._sourceLine}"` : '';
        return `<blockquote${attr}>\n${body}</blockquote>\n`;
      },
      list(token) {
        const tag = token.ordered ? 'ol' : 'ul';
        const startAttr = token.ordered && token.start !== 1 ? ` start="${token.start}"` : '';
        const attr = token._sourceLine != null ? ` data-source-line="${token._sourceLine}"` : '';
        let body = '';
        for (const item of token.items) {
          body += this.listitem(item);
        }
        return `<${tag}${startAttr}${attr}>\n${body}</${tag}>\n`;
      },
      hr(token) {
        const attr = token._sourceLine != null ? ` data-source-line="${token._sourceLine}"` : '';
        return `<hr${attr} />\n`;
      },
      table(token) {
        const attr = token._sourceLine != null ? ` data-source-line="${token._sourceLine}"` : '';
        let head = '<thead>\n<tr>\n';
        for (const cell of token.header) {
          const align = cell.align ? ` style="text-align:${cell.align}"` : '';
          head += `<th${align}>${this.parser.parseInline(cell.tokens)}</th>\n`;
        }
        head += '</tr>\n</thead>\n';
        let body = '';
        if (token.rows.length) {
          body = '<tbody>\n';
          for (const row of token.rows) {
            body += '<tr>\n';
            for (const cell of row) {
              const align = cell.align ? ` style="text-align:${cell.align}"` : '';
              body += `<td${align}>${this.parser.parseInline(cell.tokens)}</td>\n`;
            }
            body += '</tr>\n';
          }
          body += '</tbody>\n';
        }
        return `<table${attr}>\n${head}${body}</table>\n`;
      },
    },
  });

  return {
    parse(content, baseDir) {
      if (!content) return '';
      currentBaseDir = baseDir || null;
      try {
        const tokens = md.lexer(content);

        // Annotate top-level tokens with source line numbers
        let pos = 0;
        for (const token of tokens) {
          if (token.type !== 'space') {
            let line = 0;
            for (let i = 0; i < pos && i < content.length; i++) {
              if (content[i] === '\n') line++;
            }
            token._sourceLine = line;
          }
          pos += token.raw.length;
        }

        return md.parser(tokens);
      } catch {
        return '<p>Error rendering markdown</p>';
      }
    },
  };
}

const annotatedMd = createAnnotatedRenderer();

// ── Scroll Sync Constants ──

const SYNC_COOLDOWN_MS = 80;

// ── Preview Component ──

export default function Preview({ content, theme, editorRef, filePath }) {
  const previewRef = useRef(null);
  const scrollSourceRef = useRef(null); // 'editor' | 'preview' | null
  const cooldownTimerRef = useRef(null);
  const cachedAnchorsRef = useRef([]);

  // Derive base directory from file path
  const baseDir = useMemo(() => {
    if (!filePath) return null;
    const parts = filePath.split('/');
    parts.pop();
    return parts.join('/');
  }, [filePath]);

  // Parse markdown with source line annotations, then sanitize (debounced)
  const [html, setHtml] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      const raw = annotatedMd.parse(content, baseDir);
      setHtml(DOMPurify.sanitize(raw, { ADD_ATTR: ['data-source-line'] }));
    }, 150);
    return () => clearTimeout(timer);
  }, [content, baseDir]);

  // ── Build Anchor Map (cached, rebuilt on content change) ──

  const buildAnchorMap = useCallback(() => {
    const preview = previewRef.current;
    const editor = editorRef?.current;
    if (!preview || !editor) return [];

    const elements = preview.querySelectorAll('[data-source-line]');
    const anchors = [];

    for (const el of elements) {
      const sourceLine = parseInt(el.dataset.sourceLine, 10);
      if (isNaN(sourceLine)) continue;

      const editorY = editor.getLineTop(sourceLine + 1);
      const previewY = el.offsetTop;

      anchors.push({ editorY, previewY });
    }

    anchors.sort((a, b) => a.editorY - b.editorY);
    return anchors;
  }, [editorRef]);

  // Rebuild anchor cache when preview DOM updates
  useEffect(() => {
    const timer = setTimeout(() => {
      cachedAnchorsRef.current = buildAnchorMap();
    }, 50);
    return () => clearTimeout(timer);
  }, [html, buildAnchorMap]);

  // ── Interpolate Scroll Position ──

  const interpolateScroll = useCallback((anchors, sourceScroll, sourceKey, targetKey, sourceMax, targetMax) => {
    if (anchors.length === 0 || sourceMax <= 0) {
      return targetMax > 0 && sourceMax > 0 ? (sourceScroll / sourceMax) * targetMax : 0;
    }

    // At the very top, both panes should be at position 0
    if (sourceScroll <= 0) return 0;

    // Virtual start and end anchors for smooth edges
    const points = [
      { editorY: 0, previewY: 0 },
      ...anchors,
      { editorY: sourceMax, previewY: targetMax },
    ];

    // Find bracketing points
    let lower = points[0];
    let upper = points[points.length - 1];

    for (let i = 0; i < points.length - 1; i++) {
      if (points[i][sourceKey] <= sourceScroll && points[i + 1][sourceKey] > sourceScroll) {
        lower = points[i];
        upper = points[i + 1];
        break;
      }
    }

    const range = upper[sourceKey] - lower[sourceKey];
    if (range <= 0) return lower[targetKey];

    const fraction = (sourceScroll - lower[sourceKey]) / range;
    return lower[targetKey] + fraction * (upper[targetKey] - lower[targetKey]);
  }, []);

  // ── Scroll Lock ──

  const setScrollSource = useCallback((source) => {
    scrollSourceRef.current = source;
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    cooldownTimerRef.current = setTimeout(() => {
      scrollSourceRef.current = null;
    }, SYNC_COOLDOWN_MS);
  }, []);

  // ── Editor → Preview Sync ──

  useEffect(() => {
    const editor = editorRef?.current;
    if (!editor) return;

    const unsubscribe = editor.onScroll(() => {
      if (scrollSourceRef.current === 'preview') return;

      const preview = previewRef.current;
      if (!preview) return;

      const anchors = cachedAnchorsRef.current;
      const info = editor.getScrollInfo();
      const editorMax = info.scrollHeight - info.clientHeight;
      const previewMax = preview.scrollHeight - preview.clientHeight;

      if (editorMax <= 0 || previewMax <= 0) return;

      const target = interpolateScroll(anchors, info.scrollTop, 'editorY', 'previewY', editorMax, previewMax);

      setScrollSource('editor');
      preview.scrollTop = Math.round(target);
    });

    return unsubscribe;
  }, [editorRef, interpolateScroll, setScrollSource]);

  // ── Preview → Editor Sync ──

  useEffect(() => {
    const preview = previewRef.current;
    const editor = editorRef?.current;
    if (!preview || !editor) return;

    const handlePreviewScroll = () => {
      if (scrollSourceRef.current === 'editor') return;

      const anchors = cachedAnchorsRef.current;
      const info = editor.getScrollInfo();
      const editorMax = info.scrollHeight - info.clientHeight;
      const previewMax = preview.scrollHeight - preview.clientHeight;

      if (editorMax <= 0 || previewMax <= 0) return;

      const target = interpolateScroll(anchors, preview.scrollTop, 'previewY', 'editorY', previewMax, editorMax);

      setScrollSource('preview');
      editor.scrollToPixel(Math.round(target));
    };

    preview.addEventListener('scroll', handlePreviewScroll, { passive: true });
    return () => preview.removeEventListener('scroll', handlePreviewScroll);
  }, [editorRef, interpolateScroll, setScrollSource]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, []);

  return (
    <div
      ref={previewRef}
      className="preview-container"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
