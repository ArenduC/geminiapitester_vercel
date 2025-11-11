// FIX: Provide a valid implementation for the JsonDiffViewer component to resolve module and parsing errors. The previous content was a placeholder string.
import React, { useMemo } from 'react';
import { parseDiff, Diff, Hunk } from 'react-diff-view';
import { createPatch } from 'diff';

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
  if (isEditable) {
    const commonTextAreaClass = "w-full h-full p-2 bg-gray-950 rounded-md font-mono text-sm border border-gray-700 focus:ring-1 focus:ring-indigo-500 resize-none";
    return (
      <div className="flex-1 grid grid-cols-2 gap-2 p-2 min-h-0">
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1 px-1 text-gray-300">
            JSON A (Editable)
          </label>
          <textarea
            value={oldValue}
            onChange={(e) => onOldValueChange(e.target.value)}
            readOnly={!isEditable}
            className={commonTextAreaClass}
            placeholder="Paste JSON content here..."
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1 px-1 text-gray-300">
            JSON B (Editable)
          </label>
          <textarea
            value={newValue}
            onChange={(e) => onNewValueChange(e.target.value)}
            readOnly={!isEditable}
            className={commonTextAreaClass}
            placeholder="Paste JSON content here..."
          />
        </div>
      </div>
    );
  }

  // --- Diff Viewer Logic ---
  const [oldJson, newJson, error] = useMemo(() => {
    let oldJ, newJ, err;
    try {
        oldJ = oldValue ? JSON.stringify(JSON.parse(oldValue), null, 2) : '';
    } catch (e) {
        oldJ = oldValue; // fallback to raw text
        err = 'Warning: JSON A is not valid JSON. Showing text diff.';
    }
    try {
        newJ = newValue ? JSON.stringify(JSON.parse(newValue), null, 2) : '';
    } catch (e) {
        newJ = newValue;
        err = err ? 'Warning: Both panels contain invalid JSON. Showing text diff.' : 'Warning: JSON B is not valid JSON. Showing text diff.';
    }
    return [oldJ, newJ, err];
  }, [oldValue, newValue]);

  const diffText = useMemo(() => {
      if (!oldJson && !newJson) return '';
      // The context option controls how many lines of unchanged text are shown around a change.
      // A large value ensures the entire file content is included in the diff hunks.
      return createPatch('comparison.json', oldJson, newJson, '', '', { context: 99999 });
  }, [oldJson, newJson]);
  
  const files = useMemo(() => {
      if (!diffText) return [];
      return parseDiff(diffText, {nearbySequences: 'zip'});
  }, [diffText]);

  if (!oldValue && !newValue) {
    return <div className="flex-1 flex items-center justify-center text-gray-500">Provide content to compare.</div>;
  }
  
  if (files.length > 0 && files[0].hunks.length === 0) {
      return <div className="flex-1 flex items-center justify-center text-gray-500">No differences found.</div>;
  }

  const renderFile = ({ oldRevision, newRevision, type, hunks }: any) => (
      <Diff key={oldRevision + '-' + newRevision} viewType="split" diffType={type} hunks={hunks}>
          {hunks => hunks.map(hunk => <Hunk key={hunk.content} hunk={hunk} />)}
      </Diff>
  );

  return (
    <div className="flex-1 overflow-auto">
        {error && <p className="text-yellow-400 text-sm p-2 bg-yellow-900/20 rounded-md m-2">{error}</p>}
        <div className="diff-container">
            {files.map(renderFile)}
        </div>
    </div>
  );
};

export default JsonDiffViewer;
