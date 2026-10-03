import { useState, useEffect } from 'react';
import { FileText, Shield, AlertTriangle, BookOpen, Download } from 'lucide-react';

interface DocsViewerProps {
  initialDoc?: 'threat_model' | 'ir_playbook';
}

export default function DocsViewer({ initialDoc = 'threat_model' }: DocsViewerProps) {
  const [activeDoc, setActiveDoc] = useState<'threat_model' | 'ir_playbook'>(initialDoc);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActiveDoc(initialDoc);
  }, [initialDoc]);

  useEffect(() => {
    setLoading(true);
    const path = activeDoc === 'threat_model' ? '/docs/threat_model.md' : '/docs/ir_playbook.md';
    fetch(path)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load');
        return res.text();
      })
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch(() => {
        setContent('# Document not found\n\nPlease ensure the docs directory is accessible.');
        setLoading(false);
      });
  }, [activeDoc]);

  const renderMarkdown = (md: string): string => {
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, (_, code) =>
      `<pre class="bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-x-auto my-2 text-xs font-mono text-slate-300">${code.trim()}</pre>`
    );

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3 class="text-slate-200 font-semibold text-base mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2 class="text-white font-bold text-lg mt-5 mb-3">$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1 class="text-white font-bold text-xl mt-6 mb-3">$1</h1>');

    // Bold and italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-200 font-semibold">$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em class="text-slate-400">$1</em>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="text-teal-300 bg-slate-800/50 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');

    // Tables (simple)
    html = html.replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split('|').filter((c) => c.trim());
      if (cells.every((c) => /^[\s-:]+$/.test(c))) return '';
      const tds = cells.map((c) => `<td class="px-3 py-1.5 text-sm text-slate-300 border-b border-slate-800">${c.trim()}</td>`).join('');
      return `<tr>${tds}</tr>`;
    });
    html = html.replace(/(<tr>[\s\S]*?<\/tr>\s*)+/g, (match) =>
      `<table class="w-full my-3 border-collapse"><tbody>${match}</tbody></table>`
    );

    // Lists
    html = html.replace(/^(\d+\.\s.+)$/gm, '<div class="text-slate-300 text-sm ml-4 my-0.5">$1</div>');
    html = html.replace(/^[-•]\s(.+)$/gm, '<div class="text-slate-300 text-sm ml-4 my-0.5">• $1</div>');

    // Paragraphs
    html = html.replace(/^(?!<[huplditb])(.+)$/gm, '<p class="text-slate-400 text-sm leading-relaxed my-1.5">$1</p>');

    // Horizontal rules
    html = html.replace(/^---$/gm, '<hr class="border-slate-800 my-4" />');

    return html;
  };

  return (
    <div className="space-y-4">
      {/* Doc Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveDoc('threat_model')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeDoc === 'threat_model'
              ? 'bg-teal-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <Shield className="w-4 h-4" />
          Threat Model
        </button>
        <button
          onClick={() => setActiveDoc('ir_playbook')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeDoc === 'ir_playbook'
              ? 'bg-teal-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          IR Playbook
        </button>
      </div>

      {/* Doc Content */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 min-h-[60vh]">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
            <FileText className="w-5 h-5 animate-pulse" />
            <span className="text-sm">Loading document...</span>
          </div>
        ) : (
          <div
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        )}
      </div>
    </div>
  );
}
