import React, { useState, useEffect, useRef } from 'react';
import type { ApiResponse } from '../types';
import Spinner from './Spinner';
import JsonViewer from './JsonViewer';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { SearchIcon } from './icons/SearchIcon';
import { ChevronUpIcon } from './icons/ChevronUpIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface ResponseViewProps {
  response: ApiResponse | null;
  loading: boolean;
  error: string | null;
}

type ViewMode = 'pretty' | 'raw';
type ActiveTab = 'body' | 'headers';

const STATUS_REASONS: { [key: number]: string } = {
  // 1xx Informational
  100: 'Continue',
  101: 'Switching Protocols',
  102: 'Processing',
  103: 'Early Hints',

  // 2xx Success
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  203: 'Non-Authoritative Information',
  204: 'No Content',
  205: 'Reset Content',
  206: 'Partial Content',
  207: 'Multi-Status',
  208: 'Already Reported',
  226: 'IM Used',

  // 3xx Redirection
  300: 'Multiple Choices',
  301: 'Moved Permanently',
  302: 'Found',
  303: 'See Other',
  304: 'Not Modified',
  305: 'Use Proxy',
  307: 'Temporary Redirect',
  308: 'Permanent Redirect',

  // 4xx Client Error
  400: 'Bad Request',
  401: 'Unauthorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  407: 'Proxy Authentication Required',
  408: 'Request Timeout',
  409: 'Conflict',
  410: 'Gone',
  411: 'Length Required',
  412: 'Precondition Failed',
  413: 'Payload Too Large',
  414: 'URI Too Long',
  415: 'Unsupported Media Type',
  416: 'Range Not Satisfiable',
  417: 'Expectation Failed',
  418: "I'm a teapot",
  421: 'Misdirected Request',
  422: 'Unprocessable Entity',
  423: 'Locked',
  424: 'Failed Dependency',
  425: 'Too Early',
  426: 'Upgrade Required',
  428: 'Precondition Required',
  429: 'Too Many Requests',
  431: 'Request Header Fields Too Large',
  451: 'Unavailable For Legal Reasons',

  // 5xx Server Error
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
  505: 'HTTP Version Not Supported',
  506: 'Variant Also Negotiates',
  507: 'Insufficient Storage',
  508: 'Loop Detected',
  510: 'Not Extended',
  511: 'Network Authentication Required',
};


const Highlight = ({ text, searchTerm }: { text: string; searchTerm: string }) => {
  if (!searchTerm) return <>{text}</>;
  const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === searchTerm.toLowerCase() ? (
          <mark key={i} className="search-match bg-yellow-400 text-black rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

const RawBodyViewer = ({ body, searchTerm }: { body: string; searchTerm: string; }) => {
    const lines = body.split('\n');
    return (
      <div className="flex font-mono text-sm p-2">
        <div className="text-right text-gray-500 pr-4 select-none flex-shrink-0">
          {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
        </div>
        <pre className="flex-1 whitespace-pre-wrap break-all">
          {lines.length === 1 ? (
             <Highlight text={lines[0]} searchTerm={searchTerm} />
          ) : (
             lines.map((line, i) => (
                <div key={i}>
                    <Highlight text={line} searchTerm={searchTerm} />
                </div>
            ))
          )}
        </pre>
      </div>
    );
};

const ResponseView: React.FC<ResponseViewProps> = ({ response, loading, error }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('body');
  const [viewMode, setViewMode] = useState<ViewMode>('pretty');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [searchTerm, setSearchTerm] = useState('');
  const [matches, setMatches] = useState<HTMLElement[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const responsePanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveTab('body');
    setViewMode('pretty');
    setSearchTerm('');
  }, [response, error, loading]);

  useEffect(() => {
    if (searchTerm && responsePanelRef.current) {
      const allMatches = Array.from(responsePanelRef.current.querySelectorAll('.search-match'));
      setMatches(allMatches as HTMLElement[]);
      setCurrentMatchIndex(allMatches.length > 0 ? 0 : -1);
    } else {
      setMatches([]);
      setCurrentMatchIndex(-1);
    }
  }, [searchTerm, response, viewMode, activeTab]);

  useEffect(() => {
    const oldActive = responsePanelRef.current?.querySelector('.active-match');
    if (oldActive) {
      oldActive.classList.remove('active-match', 'bg-orange-500');
      if (!oldActive.classList.contains('bg-yellow-400')) {
        oldActive.classList.add('bg-yellow-400');
      }
    }

    if (currentMatchIndex > -1 && matches[currentMatchIndex]) {
      const newActive = matches[currentMatchIndex];
      newActive.classList.add('active-match', 'bg-orange-500');
      newActive.classList.remove('bg-yellow-400');
      newActive.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }
  }, [currentMatchIndex, matches]);

  const handleCopy = () => {
    if (response?.body) {
      const isJson = typeof response.body === 'object' && response.body !== null;
      let bodyToCopy = '';
      if (isJson) {
        bodyToCopy = viewMode === 'pretty'
          ? JSON.stringify(response.body, null, 2)
          : JSON.stringify(response.body);
      } else {
        bodyToCopy = String(response.body);
      }
      
      navigator.clipboard.writeText(bodyToCopy).then(() => {
        setCopyStatus('copied');
        setTimeout(() => setCopyStatus('idle'), 2000);
      });
    }
  };

  const handleNavigate = (direction: 'next' | 'prev') => {
    if (matches.length === 0) return;
    if (direction === 'next') {
      setCurrentMatchIndex((prev) => (prev + 1) % matches.length);
    } else {
      setCurrentMatchIndex((prev) => (prev - 1 + matches.length) % matches.length);
    }
  };
  
  const renderBody = () => {
      if (!response?.body) {
           return (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                This response has no body.
            </div>
           )
      }

      const isJson = typeof response.body === 'object' && response.body !== null;

      if(isJson) {
          return viewMode === 'pretty' 
            ? <JsonViewer data={response.body} searchTerm={searchTerm} /> 
            : <RawBodyViewer body={JSON.stringify(response.body, null, 2)} searchTerm={searchTerm} />;
      }
      return <RawBodyViewer body={String(response.body)} searchTerm={searchTerm} />;
  }

  const renderContent = () => {
    if (loading) {
      return <div className="flex-1 flex items-center justify-center"><Spinner /></div>;
    }
    if (error) {
      return (
        <div className="p-4 text-red-400">
          <h3 className="font-bold">Error</h3>
          <pre className="mt-2 text-sm whitespace-pre-wrap font-mono bg-red-900/20 p-2 rounded-md">{error}</pre>
        </div>
      );
    }
    if (!response) {
      return <div className="flex-1 flex items-center justify-center text-gray-500"><p>Run a request to see the response.</p></div>;
    }

    const isJson = typeof response.body === 'object' && response.body !== null;
    const statusReason = STATUS_REASONS[response.status] || response.statusText;

    return (
      <div className="flex-1 flex flex-col min-h-0">
        <header className="flex-shrink-0 p-2 flex items-center justify-between border-b border-gray-700">
          <div className="flex items-center space-x-4 text-sm">
            <span className={`font-bold ${response.status >= 400 ? 'text-red-400' : 'text-green-400'}`}>
              Status: {response.status} {statusReason}
            </span>
            <span>Time: <span className="font-semibold text-white">{response.time} ms</span></span>
            <span>Size: <span className="font-semibold text-white">{(response.size / 1024).toFixed(2)} KB</span></span>
          </div>
          <div className="flex items-center">
            <button onClick={() => setActiveTab('body')} className={`px-3 py-1 text-sm rounded-l-md ${activeTab === 'body' ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400'}`}>Body</button>
            <button onClick={() => setActiveTab('headers')} className={`px-3 py-1 text-sm rounded-r-md ${activeTab === 'headers' ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400'}`}>Headers</button>
          </div>
        </header>
        
        {activeTab === 'body' && (
            <div className="p-2 flex-shrink-0 border-b border-gray-700 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    {isJson && (
                        <div className="flex items-center text-sm">
                            <button onClick={() => setViewMode('pretty')} className={`px-2 py-0.5 rounded-l-md ${viewMode === 'pretty' ? 'bg-gray-600' : 'bg-gray-700'}`}>Pretty</button>
                            <button onClick={() => setViewMode('raw')} className={`px-2 py-0.5 rounded-r-md ${viewMode === 'raw' ? 'bg-gray-600' : 'bg-gray-700'}`}>Raw</button>
                        </div>
                    )}
                     <div className="flex items-center bg-gray-900 rounded-md">
                        <SearchIcon className="w-4 h-4 text-gray-400 mx-2" />
                        <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-transparent text-sm w-40 focus:ring-0 border-0"/>
                        {matches.length > 0 && (
                            <div className="flex items-center text-xs text-gray-400 pr-2">
                                <span>{currentMatchIndex + 1} of {matches.length}</span>
                                <button onClick={() => handleNavigate('prev')} className="p-1 hover:bg-gray-700 rounded"><ChevronUpIcon className="w-4 h-4"/></button>
                                <button onClick={() => handleNavigate('next')} className="p-1 hover:bg-gray-700 rounded"><ChevronDownIcon className="w-4 h-4"/></button>
                            </div>
                        )}
                    </div>
                </div>

                <button onClick={handleCopy} className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-md text-gray-400">
                    {copyStatus === 'copied' ? <span className="text-xs text-green-400 px-1">Copied!</span> : <ClipboardIcon className="w-4 h-4" />}
                </button>
            </div>
        )}
        
        <div className="flex-1 overflow-auto" ref={responsePanelRef}>
          {activeTab === 'body' && renderBody()}
          {activeTab === 'headers' && (
             <div className="p-2">
               <table className="w-full text-sm">
                 <tbody>
                    {Object.entries(response.headers).map(([key, value]) => (
                        <tr key={key} className="border-b border-gray-700/50">
                            <td className="py-1 px-2 font-semibold text-gray-300 w-1/3 align-top">{key}</td>
                            <td className="py-1 px-2 text-gray-400 font-mono break-all">{value}</td>
                        </tr>
                    ))}
                 </tbody>
               </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  return <div className="h-full flex flex-col">{renderContent()}</div>;
};

export default ResponseView;