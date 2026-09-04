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
      <div className="p-4 sm:p-6 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/15 shadow-2xl">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-mono font-medium uppercase tracking-wider text-blue-300 mb-3">
          <PenLine className="w-3.5 h-3.5 text-blue-400" />
          <span>Creative studio</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">Copy Desk</h1>
        <p className="text-xs sm:text-sm text-white/80 mt-1 font-light">
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
                  selected
                    ? 'bg-white/20 text-white border-white/30 font-semibold shadow'
                    : 'bg-white/10 text-white/80 border-white/15 hover:bg-white/15 hover:text-white'
                }`}
              >
                <div className="font-semibold">{item.label}</div>
                <div className={selected ? 'text-white/60' : 'text-white/50'}>{item.hint}</div>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setWantImage((value) => !value)}
            className={`px-3 py-2 rounded-xl border text-left text-xs transition-all ${
              wantImage
                ? 'bg-white/20 text-white border-white/30 font-semibold shadow'
                : 'bg-white/10 text-white/80 border-white/15 hover:bg-white/15 hover:text-white'
            }`}
          >
            <div className="font-semibold inline-flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5" />
              Image
            </div>
            <div className={wantImage ? 'text-white/60' : 'text-white/50'}>
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
