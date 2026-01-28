import * as React from 'react';
import { useState, useEffect } from 'react';

// リリースノートをインポート（Viteのraw importを使用）
import releaseNotesJa from '../release-notes-ja.md?raw';

interface ReleaseNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Markdownを簡易的にHTMLに変換
function parseMarkdown(md: string): string {
  return md
    // 見出し
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold text-cyan-300 mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-cyan-400 mt-6 mb-3 border-b border-cyan-800 pb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-cyan-500 mb-4">$1</h1>')
    // 太字
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-cyan-200">$1</strong>')
    // リスト
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-gray-300">• $1</li>')
    // 番号付きリスト
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 text-gray-300">$1. $2</li>')
    // 水平線
    .replace(/^---$/gm, '<hr class="my-4 border-cyan-800"/>')
    // イタリック（*text*）
    .replace(/\*([^*]+)\*/g, '<em class="text-gray-400">$1</em>')
    // 段落
    .replace(/\n\n/g, '</p><p class="my-2">')
    // 改行
    .replace(/\n/g, '<br/>');
}

const ReleaseNotesModal: React.FC<ReleaseNotesModalProps> = ({ isOpen, onClose }) => {
  const [version, setVersion] = useState<string>('1.0.0');

  useEffect(() => {
    // package.jsonからバージョンを取得（ビルド時に埋め込み）
    setVersion(__APP_VERSION__ || '1.0.0');
  }, []);

  if (!isOpen) return null;

  const htmlContent = parseMarkdown(releaseNotesJa);

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 border border-cyan-500/50 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col shadow-2xl shadow-cyan-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-cyan-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-xl">📋</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-cyan-400">アップデートノート</h2>
              <p className="text-sm text-gray-500">Version {version}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
            aria-label="閉じる"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <div 
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>

        {/* フッター */}
        <div className="p-4 border-t border-cyan-800 flex justify-between items-center">
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input 
              type="checkbox" 
              className="rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500"
              onChange={(e) => {
                if (e.target.checked) {
                  localStorage.setItem('dqx_hide_release_notes', version);
                } else {
                  localStorage.removeItem('dqx_hide_release_notes');
                }
              }}
            />
            このバージョンでは表示しない
          </label>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors font-medium"
          >
            閉じる
          </button>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1f2937;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #0891b2;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #06b6d4;
        }
      `}</style>
    </div>
  );
};

export default ReleaseNotesModal;

// グローバル定数の型定義
declare global {
  const __APP_VERSION__: string;
}
