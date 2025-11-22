import React, { useState, useRef } from 'react';
import useStore from '../store';
import { uploadFile } from '../api';

export default function MessageInput() {
    const [text, setText] = useState('');
    const [file, setFile] = useState(null);
    const fileInputRef = useRef(null);
    const activeConversationId = useStore(s => s.activeConversationId);
    const sendMessage = useStore(s => s.sendMessage);
    const typing = useStore(s => s.typing);

    const submit = async (e) => {
        e.preventDefault();
        if (!text.trim() && !file) return;

        let attachment = null;
        if (file) {
            try {
                const uploaded = await uploadFile(file);
                attachment = uploaded; // { url, filename, mimeType, size }
            } catch (err) {
                console.error('Upload failed', err);
                // optionally show banner
                return;
            }
        }

        sendMessage(activeConversationId, text.trim() || '', attachment);
        setText(''); setFile(null); if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <form onSubmit={submit} className="p-3 border-t bg-white flex gap-2 items-center">
            <input
                className="flex-1 border rounded-lg p-3"
                placeholder="Type a message..."
                value={text}
                onChange={(e) => { setText(e.target.value); typing(activeConversationId, true); }}
                onBlur={() => typing(activeConversationId, false)}
            />
            <input ref={fileInputRef} type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">Send</button>
        </form>
    );
}
