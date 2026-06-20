import { useState } from 'react';
import { Image as ImageIcon, ExternalLink, X, Link } from 'lucide-react';
import { useGatekeeperStore } from '@/store/gatekeeper';
import { cn } from '@/lib/utils';

export default function AttachmentGrid() {
  const { currentSnapshot } = useGatekeeperStore();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const attachments = currentSnapshot?.attachments ?? [];

  if (attachments.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-8 text-center">
        <ImageIcon className="mx-auto h-10 w-10 text-slate-600" />
        <p className="mt-3 text-[13px] text-slate-500">当前快照暂无附件</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {attachments.map((att) => (
          <div
            key={att.id}
            className={cn(
              'group relative overflow-hidden rounded-xl border p-3 transition-all',
              att.type === 'screenshot'
                ? 'border-slate-700/60 bg-slate-800/40 hover:border-slate-600'
                : 'border-slate-700/60 bg-slate-800/40 hover:border-slate-600 cursor-pointer'
            )}
            onClick={() => att.type === 'screenshot' && setPreviewUrl(att.url)}
          >
            {att.type === 'screenshot' ? (
              <>
                <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-slate-900">
                  <img
                    src={att.url}
                    alt={att.description}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiB2aWV3Qm94PSIwIDAgMjAwIDE1MCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiMxZTI5MzYiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9Ik1vbm9zcGFjZSIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY0NzQ4YiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWbvueJh+WKoOW3peWFrOS8oOeUqOaIt+WcqOaVtOato1ZN5YWNrZWIgdm0vbG9nbyBzbm9pbmc+PHRleHQ+PC9zdmc+';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <ImageIcon className="absolute bottom-2 right-2 h-4 w-4 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <p className="mt-2 line-clamp-2 text-[11px] text-slate-300">{att.description}</p>
              </>
            ) : (
              <a
                href={att.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                  <Link className="h-5 w-5 text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-white">{att.description}</p>
                  <p className="truncate text-[10px] text-slate-500">{att.url}</p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
              </a>
            )}
            <p className="mt-2 text-[10px] text-slate-500">{att.createdAt}</p>
          </div>
        ))}
      </div>

      {previewUrl && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
            onClick={() => setPreviewUrl(null)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] max-w-[90vw] -translate-x-1/2 -translate-y-1/2">
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute -right-10 top-0 rounded-full bg-slate-800 p-2 text-white hover:bg-slate-700 transition"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-[85vh] max-w-[90vw] rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </>
      )}
    </>
  );
}
