// FIX: Provide a valid implementation for the JsonDiffViewer component to resolve module and parsing errors. The previous content was a placeholder string.
import React from 'react';

interface JsonDiffViewerProps {
  oldValue: string;
  newValue: string;
  onOldValueChange: (value: string) => void;
  onNewValueChange: (value: string) => void;
  isEditable: boolean;
}

const JsonDiffViewer: React.FC<JsonDiffViewerProps> = ({
  oldValue,
  newValue,
  onOldValueChange,
  onNewValueChange,
  isEditable,
}) => {
  const commonTextAreaClass = "w-full h-full p-2 bg-gray-950 rounded-md font-mono text-sm border border-gray-700 focus:ring-1 focus:ring-indigo-500 resize-none";

  return (
    <div className="flex-1 grid grid-cols-2 gap-2 p-2 min-h-0">
      <div className="flex flex-col">
        <label className="text-sm font-semibold mb-1 px-1 text-gray-300">
          JSON A {isEditable ? '(Editable)' : ''}
        </label>
        <textarea
          value={oldValue}
          onChange={(e) => isEditable && onOldValueChange(e.target.value)}
          readOnly={!isEditable}
          className={commonTextAreaClass}
          placeholder="Paste JSON content here..."
        />
      </div>
      <div className="flex flex-col">
        <label className="text-sm font-semibold mb-1 px-1 text-gray-300">
          JSON B {isEditable ? '(Editable)' : ''}
        </label>
        <textarea
          value={newValue}
          onChange={(e) => isEditable && onNewValueChange(e.target.value)}
          readOnly={!isEditable}
          className={commonTextAreaClass}
          placeholder="Paste JSON content here..."
        />
      </div>
    </div>
  );
};

export default JsonDiffViewer;
