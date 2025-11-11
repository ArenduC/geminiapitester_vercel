import React, { useState } from 'react';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ChevronUpIcon } from './icons/ChevronUpIcon';

interface JsonViewerProps {
  data: any;
  searchTerm: string;
}

const Highlight = ({ text, searchTerm }: { text: string; searchTerm: string }) => {
  if (!searchTerm) return <>{text}</>;
  // Split on searchTerm, but keep the delimiter
  const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === searchTerm.toLowerCase() ? (
          <mark key={i} className="search-match bg-yellow-400 text-black rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

const JsonNode: React.FC<{ nodeKey: string, nodeValue: any, searchTerm: string, isRoot?: boolean }> = ({ nodeKey, nodeValue, searchTerm, isRoot = false }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const valueType = typeof nodeValue;
  if (valueType !== 'object' || nodeValue === null) {
    return (
      <div className="flex">
        {!Array.isArray(nodeKey) && <span className="text-purple-400 mr-2">"<Highlight text={nodeKey} searchTerm={searchTerm}/>":</span>}
        <span className={getValueClassName(nodeValue)}>
          {valueType === 'string' ? `"` : ''}
          <Highlight text={JSON.stringify(nodeValue).replace(/^"|"$/g, '')} searchTerm={searchTerm}/>
          {valueType === 'string' ? `"` : ''}
        </span>
      </div>
    );
  }

  const isArray = Array.isArray(nodeValue);
  const entries = Object.entries(nodeValue);
  const braceOpen = isArray ? '[' : '{';
  const braceClose = isArray ? ']' : '}';

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  }

  if (entries.length === 0) {
    return (
        <div className="flex">
            {!isRoot && <span className="text-purple-400 mr-2">"<Highlight text={nodeKey} searchTerm={searchTerm}/>":</span>}
            <span className="text-gray-400">{braceOpen}{braceClose}</span>
        </div>
    );
  }

  return (
    <div>
      <div onClick={toggleExpand} className="flex items-center cursor-pointer">
        {isExpanded ? <ChevronUpIcon className="w-4 h-4 mr-1 flex-shrink-0 text-gray-500" /> : <ChevronDownIcon className="w-4 h-4 mr-1 flex-shrink-0 text-gray-500" />}
        {!isRoot && <span className="text-purple-400 mr-2">"<Highlight text={nodeKey} searchTerm={searchTerm}/>":</span>}
        <span className="text-gray-400">{braceOpen}</span>
        {!isExpanded && <span className="text-gray-400">...{braceClose} <span className="text-gray-500 text-xs ml-1">({entries.length} items)</span></span>}
      </div>
      {isExpanded && (
        <>
          <div className="pl-6 border-l border-gray-700 ml-2">
            {entries.map(([key, value]) => (
              <JsonNode key={key} nodeKey={key} nodeValue={value} searchTerm={searchTerm} />
            ))}
          </div>
          <span className="text-gray-400">{braceClose}</span>
        </>
      )}
    </div>
  );
};


const getValueClassName = (value: any) => {
  switch (typeof value) {
    case 'string': return 'text-green-400';
    case 'number': return 'text-blue-400';
    case 'boolean': return 'text-yellow-400';
    case 'object': if (value === null) return 'text-red-400';
    default: return 'text-gray-300';
  }
};


const JsonViewer: React.FC<JsonViewerProps> = ({ data, searchTerm }) => {
  return (
    <div className="font-mono text-sm p-2">
        <JsonNode nodeKey="root" nodeValue={data} searchTerm={searchTerm} isRoot />
    </div>
  );
};

export default JsonViewer;