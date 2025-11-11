import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (inputValue: string) => void;
  title: string;
  label: string;
  placeholder?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  label,
  placeholder = 'Enter a name...',
}) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Focus the input when the modal opens
      setTimeout(() => inputRef.current?.focus(), 100);
      setInputValue(''); // Reset input value on open
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSubmit(inputValue.trim());
    }
  };

  if (!isOpen) {
    return null;
  }

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) {
    console.error("The element #modal-root was not found");
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
        <form onSubmit={handleSubmit}>
          <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="modal-input">
            {label}
          </label>
          <input
            id="modal-input"
            ref={inputRef}
            className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            type="text"
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            required
          />
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded-md text-sm font-semibold hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-semibold hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>,
    modalRoot
  );
};

export default Modal;