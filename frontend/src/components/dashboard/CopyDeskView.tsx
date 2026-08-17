import React, { useMemo, useState } from 'react';
import { ImageIcon, PenLine } from 'lucide-react';
import { WhatsAppChat } from '../common/WhatsAppChat';

const PLATFORMS = [
  { id: 'twitter', label: 'X', hint: '280 chars · 2 hashtags max' },
  { id: 'linkedin', label: 'LinkedIn', hint: 'Hook first · keep it scannable' },
  { id: 'facebook', label: 'Facebook', hint: 'Conversational · no bait' },
  { id: 'threads', label: 'Threads', hint: '500 chars · sounds human' },
];

export const CopyDeskView: React.FC = () => {
  const [platform, setPlatform] = useState('twitter');
  const [wantImage, setWantImage] = useState(true);

  const extraBody = useMemo(() => ({ platforms: [platform], wantImage }), [platform, wantImage]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="p-4 sm:p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
        <div className="flex items-center gap-2 text-[11px] sm:text-xs font-semibold text-white/80 uppercase tracking-wider mb-1">
          <PenLine className="w-4 h-4 text-white" />
          <span>Write, then paste</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight drop-shadow">Copy Desk</h1>
        <p className="text-xs sm:text-sm text-white/70 mt-1">
          Pick one network, then chat with Gemma. Copy pastes the post exactly as it will appear there. Image is optional.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          {PLATFORMS.map((item) => {
            const selected = platform === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setPlatform(item.id)}
                className={`px-3 py-2 rounded-xl border text-left text-xs transition-all ${
                  selected ? 'bg-white text-black border-white' : 'bg-white/10 text-white border-white/20 hover:bg-white/15'
                }`}
              >
                <div className="font-semibold">{item.label}</div>
                <div className={selected ? 'text-black/60' : 'text-white/50'}>{item.hint}</div>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setWantImage((value) => !value)}
            className={`px-3 py-2 rounded-xl border text-left text-xs transition-all ${
              wantImage ? 'bg-white text-black border-white' : 'bg-white/10 text-white border-white/20 hover:bg-white/15'
            }`}
          >
            <div className="font-semibold inline-flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5" />
              Image
            </div>
            <div className={wantImage ? 'text-black/60' : 'text-white/50'}>
              {wantImage ? 'On · generate a visual' : 'Off · caption only'}
            </div>
          </button>
        </div>
      </div>

      <WhatsAppChat
        channel="composer"
        title="Copy Desk"
        placeholder="Describe the post or the image you want…"
        emptyHint="Choose one platform, then ask for the post. Copy puts the exact caption on your clipboard — line breaks and hashtags included."
        copyReplies
        extraBody={extraBody}
        className="h-[min(78vh,640px)]"
      />
    </div>
  );
};
