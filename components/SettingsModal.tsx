import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { User } from '../types';
import { supabase } from '../services/supabaseService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUserUpdate: (updatedUser: User) => void;
  proxyTemplate: string;
  onProxyTemplateChange: (template: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserUpdate,
  proxyTemplate,
  onProxyTemplateChange,
}) => {
  const [name, setName] = useState(user.name);
  const [currentProxyTemplate, setCurrentProxyTemplate] = useState(proxyTemplate);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
        setName(user.name);
        setCurrentProxyTemplate(proxyTemplate);
        setError(null);
    }
  }, [isOpen, user.name, proxyTemplate]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    // Update user name
    const { data, error: updateError } = await supabase.auth.updateUser({
      data: { name },
    });

    if (updateError) {
      setError(updateError.message);
      setIsSaving(false);
      return;
    }

    if (data.user) {
        const updatedUser: User = {
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.user_metadata.name || 'User',
        };
        onUserUpdate(updatedUser);
    }
    
    // Update proxy template (stored in parent state, passed down)
    onProxyTemplateChange(currentProxyTemplate);

    setIsSaving(false);
    onClose();
  };
  
  if (!isOpen) {
    return null;
  }
  
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg m-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-white mb-6">Settings</h2>
        
        {error && <p className="bg-red-900/50 text-red-400 p-3 rounded-md mb-4 text-sm">{error}</p>}
        
        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="name">
              Display Name
            </label>
            <input
              id="name"
              className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="proxy">
              CORS Proxy URL Template
            </label>
            <input
              id="proxy"
              className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              type="text"
              placeholder="e.g., https://my-proxy.com/{url}"
              value={currentProxyTemplate}
              onChange={(e) => setCurrentProxyTemplate(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">Use <code className="bg-gray-700 px-1 rounded">{'{url}'}</code> as a placeholder for the target API URL. This helps bypass CORS issues.</p>
          </div>
        </div>
        
        <div className="mt-8 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded-md text-sm font-semibold hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-semibold hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>,
    modalRoot
  );
};

export default SettingsModal;