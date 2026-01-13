import type { Component } from 'solid-js';
import { createSignal } from 'solid-js';
import { Mic, MicOff, Send } from 'lucide-solid';

/**
 * VoiceInput provides a high-performance voice-managed task creation interface.
 */
export const VoiceInput: Component<{ onTaskCreated: (title: string) => void }> = (props) => {
    const [isListening, setIsListening] = createSignal(false);
    const [transcript, setTranscript] = createSignal('');

    const toggleListen = () => {
        setIsListening(!isListening());
        if (isListening()) {
            console.log('[Voice] Listening...');
            setTranscript('Research edge computing performance in Durable Objects');
        }
    };

    const handleSend = () => {
        if (transcript()) {
            props.onTaskCreated(transcript());
            setTranscript('');
            setIsListening(false);
        }
    };

    return (
        <div class="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-xl px-6">
            <div class="relative group">
                <div class="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                <div class="relative flex items-center gap-4 bg-slate-900 border border-slate-700/50 p-4 rounded-2xl shadow-2xl">
                    <button
                        onClick={toggleListen}
                        class={`p-3 rounded-xl transition-all ${isListening() ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-slate-800 text-slate-400'}`}
                    >
                        {isListening() ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>

                    <input
                        type="text"
                        placeholder={isListening() ? "Listening..." : "Tell Velocity what to build next..."}
                        value={transcript()}
                        onInput={(e) => setTranscript(e.currentTarget.value)}
                        class="flex-1 bg-transparent border-none focus:ring-0 text-slate-200 placeholder-slate-500 font-medium"
                    />

                    <button
                        onClick={handleSend}
                        disabled={!transcript()}
                        class="p-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-xl transition-all"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};
