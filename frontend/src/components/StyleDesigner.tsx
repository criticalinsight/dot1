import type { Component } from 'solid-js';
import { createSignal } from 'solid-js';
import type { StyleProfile } from '../../../shared/types';

/**
 * StyleDesigner allows users to define and calibrate their brand voice.
 */
export const StyleDesigner: Component<{ onSave: (profile: StyleProfile) => void }> = (props) => {
    const [profile, setProfile] = createSignal<StyleProfile>({
        tone: 'Professional & Authoritative',
        targetAudience: 'CTOs and Senior Architects',
        vocabularyConstraints: ['No buzzwords', 'Explain acronyms'],
        fewShotExamples: []
    });

    return (
        <div class="p-6 bg-slate-900 rounded-xl border border-slate-700 shadow-2xl space-y-4">
            <h3 class="text-xl font-bold text-white flex items-center gap-2">
                <span class="text-indigo-400">✧</span> Brand Voice Designer
            </h3>

            <div class="space-y-2">
                <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tone</label>
                <input
                    class="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={profile().tone}
                    onInput={(e) => setProfile({ ...profile(), tone: e.currentTarget.value })}
                />
            </div>

            <div class="space-y-2">
                <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Audience</label>
                <input
                    class="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={profile().targetAudience}
                    onInput={(e) => setProfile({ ...profile(), targetAudience: e.currentTarget.value })}
                />
            </div>

            <button
                onClick={() => props.onSave(profile())}
                class="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg hover:shadow-indigo-500/20"
            >
                Save Brand Profile
            </button>
        </div>
    );
};
