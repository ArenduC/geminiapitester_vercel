import React, { useState, useEffect } from 'react';
// FIX: Removed unused 'AuthType' which is not an exported member of '../types'.
import type { ApiTest, ApiResponse, AuthDetails, Environment, ExtractionRule } from '../types';
import ResponseView from './ResponseView';
import { PlayIcon } from './icons/PlayIcon';
import { TrashIcon } from './icons/TrashIcon';
import { DuplicateIcon } from './icons/DuplicateIcon';
import Spinner from './Spinner';
import VariableInput from './VariableInput';

interface TestViewProps {
  test: ApiTest | null;
  response: ApiResponse | null;
  onRunTest: (test: ApiTest, binaryFile?: File) => void;
  onTestChange: (updatedTest: ApiTest) => void;
  onSaveTest: () => void;
  onDeleteTest: (testId: string) => void;
  onDuplicateTest: (test: ApiTest) => void;
  loading: boolean;
  error: string | null;
  activeEnvironment: Environment | null;
  onCancelTest: () => void;
}

type ActiveTab = 'params' | 'auth' | 'headers' | 'body' | 'tests';
type BodyType = ApiTest['bodyType'];

const TestView: React.FC<TestViewProps> = ({
  test,
  response,
  onRunTest,
  onTestChange,
  onSaveTest,
  onDeleteTest,
  onDuplicateTest,
  loading,
  error,
  activeEnvironment,
  onCancelTest,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('params');
  const [binaryFile, setBinaryFile] = useState<File | null>(null);
  const [queryParams, setQueryParams] = useState<[string, string][]>([]);

  // Effect to parse query params from URL when test changes
  useEffect(() => {
    if (test?.url) {
      try {
        const url = new URL(test.url);
        const params = Array.from(url.searchParams.entries());
        // Add an empty row if there are no params, for better UX
        setQueryParams(params.length > 0 ? params : [['', '']]);
      } catch (e) {
        // If URL is invalid, just show an empty param
        setQueryParams([['', '']]);
      }
    } else {
      setQueryParams([['', '']]);
    }
    // Reset component state when the selected test changes
    setBinaryFile(null);
    setActiveTab('params');
  }, [test?.id]);

  // Effect to update the URL when query params change from the UI
  const updateUrlWithParams = (params: [string, string][]) => {
    if (!test) return;
    try {
        const [baseUrl] = (test.url || '').split('?');
        const searchParams = new URLSearchParams();
        params.forEach(([key, value]) => {
            if (key) { // Only add params with a key
                searchParams.append(key, value);
            }
        });
        const newUrl = `${baseUrl}?${searchParams.toString()}`;
        // Prevent infinite loops by checking if URL actually changed
        if (newUrl !== test.url && baseUrl) {
           onTestChange({ ...test, url: searchParams.toString() ? newUrl : baseUrl });
        }
    } catch(e) {
        console.warn("Could not construct URL from params:", e);
    }
  };


  if (!test) {
    return (
      <main className="flex-1 flex items-center justify-center bg-gray-900 text-gray-500">
        <p>Select a request from the sidebar to view its details.</p>
      </main>
    );
  }

  // Generic handler for top-level test properties
  const handleTestPropChange = (prop: keyof ApiTest, value: any) => {
    onTestChange({ ...test, [prop]: value });
  };
  
  // -- Query Params Handlers --
  const handleParamChange = (index: number, field: 'key' | 'value', newValue: string) => {
    // FIX: Add a return type annotation `[string, string]` to the map function.
    // This ensures TypeScript doesn't widen the tuple to a string array, resolving the type error.
    const newParams = queryParams.map((param, i): [string, string] => {
        if (i !== index) return param;
        return field === 'key' ? [newValue, param[1]] : [param[0], newValue];
    });
    setQueryParams(newParams);
    updateUrlWithParams(newParams);
  };
  const addParam = () => {
    // FIX: Explicitly cast `['', '']` to a `[string, string]` tuple to prevent a type mismatch error.
    const newParams = [...queryParams, ['', ''] as [string, string]];
    setQueryParams(newParams);
  };
  const removeParam = (index: number) => {
    const filteredParams = queryParams.filter((_, i) => i !== index);
    // FIX: Create a new variable `newParams` to hold the final state.
    // This fixes a logic bug where `updateUrlWithParams` received a different value than `setQueryParams`.
    // It also helps TypeScript correctly infer the type `[string, string][]`.
    const newParams = filteredParams.length > 0 ? filteredParams : ([['', '']] as [string, string][]);
    setQueryParams(newParams);
    updateUrlWithParams(newParams);
  };
  // Sync params editor when URL is typed into manually
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    handleTestPropChange('url', newUrl);
     try {
        const url = new URL(newUrl);
        const params = Array.from(url.searchParams.entries());
        setQueryParams(params.length > 0 ? params : [['', '']]);
      } catch (e) {
        // Invalid URL, might be partially typed. Keep params as is for now.
      }
  };

  // -- Auth handlers --
  const handleAuthChange = (newAuth: AuthDetails) => {
    onTestChange({ ...test, auth: newAuth });
  };

  const handleAuthTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value as AuthDetails['type'];
    switch (type) {
        case 'bearer':
            handleAuthChange({ type: 'bearer', token: '' });
            break;
        case 'basic':
            handleAuthChange({ type: 'basic', username: '', password: '' });
            break;
        case 'none':
        default:
            handleAuthChange({ type: 'none' });
            break;
    }
  };


  // -- Headers handlers --
  const headerEntries = Object.entries(test.headers || {});

  const handleHeaderChange = (index: number, field: 'key' | 'value', newValue: string) => {
    const newEntries = headerEntries.map((entry, i) => {
      if (i !== index) return entry;
      return field === 'key' ? [newValue, entry[1]] : [entry[0], newValue];
    });
    onTestChange({ ...test, headers: Object.fromEntries(newEntries) });
  };

  const addHeader = () => {
    onTestChange({ ...test, headers: { ...(test.headers || {}), '': '' } });
  };

  const removeHeader = (index: number) => {
    const newEntries = headerEntries.filter((_, i) => i !== index);
    onTestChange({ ...test, headers: Object.fromEntries(newEntries) });
  };


  // -- Body handlers --
  const handleBodyTypeChange = (bodyType: BodyType) => {
    if (bodyType !== 'binary') {
      setBinaryFile(null);
    }
    const newBody = bodyType === 'form-data' ? '[]' : '';
    onTestChange({ ...test, bodyType, body: newBody });
  };

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onTestChange({ ...test, body: e.target.value });
  };

  // -- Form-Data handlers --
  const getFormData = (): {key: string, value: string}[] => {
    try {
        if (test.bodyType === 'form-data' && test.body) {
            const parsed = JSON.parse(test.body);
            if (Array.isArray(parsed)) {
              // Ensure key/value are strings to prevent controlled input errors
              return parsed.map(item => ({ key: item.key || '', value: item.value || '' }));
            }
        }
    } catch {}
    return [];
  };

  const updateFormData = (newData: {key: string, value: string}[]) => {
    onTestChange({ ...test, body: JSON.stringify(newData) });
  };

  const handleFormDataChange = (index: number, field: 'key' | 'value', value: string) => {
    const formData = getFormData();
    formData[index] = { ...formData[index], [field]: value };
    updateFormData(formData);
  };

  const addFormDataRow = () => {
    const formData = getFormData();
    updateFormData([...formData, { key: '', value: '' }]);
  };

  const removeFormDataRow = (index: number) => {
    const formData = getFormData();
    updateFormData(formData.filter((_, i) => i !== index));
  };

  // -- Extraction Rule Handlers --
  const handleRuleChange = (index: number, field: keyof ExtractionRule, value: string) => {
    const newRules = [...(test.extractionRules || [])];
    newRules[index] = { ...newRules[index], [field]: value };
    onTestChange({ ...test, extractionRules: newRules });
  };

  const addRule = () => {
    const newRule: ExtractionRule = { id: crypto.randomUUID(), jsonPath: '', targetVariable: '' };
    onTestChange({ ...test, extractionRules: [...(test.extractionRules || []), newRule] });
  };

  const removeRule = (id: string) => {
    const newRules = (test.extractionRules || []).filter(rule => rule.id !== id);
    onTestChange({ ...test, extractionRules: newRules });
  };

  const renderAuthEditor = () => {
    const auth = test.auth || { type: 'none' };
    return (
        <div className="p-4 space-y-4">
            <div>
                <label className="block text-gray-400 text-sm font-bold mb-2">
                    Authorization Type
                </label>
                <select 
                    value={auth.type} 
                    onChange={handleAuthTypeChange}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="none">No Auth</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="basic">Basic Auth</option>
                </select>
            </div>
            {auth.type === 'bearer' && (
                <div>
                    <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="bearer-token">Token</label>
                    <VariableInput
                        containerClassName="w-full"
                        activeEnvironment={activeEnvironment}
                        id="bearer-token"
                        type="text"
                        value={auth.token || ''}
                        onChange={(e) => handleAuthChange({ ...auth, token: e.target.value })}
                        className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1.5 text-sm font-mono"
                        placeholder="Enter bearer token"
                    />
                </div>
            )}
            {auth.type === 'basic' && (
                <div className="space-y-2">
                    <div>
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="basic-username">Username</label>
                        <VariableInput
                            containerClassName="w-full"
                            activeEnvironment={activeEnvironment}
                            id="basic-username"
                            type="text"
                            value={auth.username || ''}
                            onChange={(e) => handleAuthChange({ ...auth, username: e.target.value })}
                            className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1.5 text-sm font-mono"
                            placeholder="Username"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="basic-password">Password</label>
                         <VariableInput
                            containerClassName="w-full"
                            activeEnvironment={activeEnvironment}
                            id="basic-password"
                            type="password"
                            value={auth.password || ''}
                            onChange={(e) => handleAuthChange({ ...auth, password: e.target.value })}
                            className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1.5 text-sm font-mono"
                            placeholder="Password"
                        />
                    </div>
                </div>
            )}
        </div>
    );
  };

  const renderBodyEditor = () => {
    const bodyType = test.bodyType || 'none';
    if (bodyType === 'none') {
        return <div className="p-4 text-center text-gray-500 text-sm">This request does not have a body.</div>;
    }
    if (bodyType === 'json' || bodyType === 'text') {
        return <VariableInput
                 as="textarea"
                 containerClassName="w-full h-full"
                 activeEnvironment={activeEnvironment}
                 value={test.body || ''}
                 onChange={handleBodyChange}
                 className="h-full p-2 bg-gray-950 rounded-b-md font-mono text-sm border-0 focus:ring-0 resize-none"
                 placeholder={bodyType === 'json' ? '{ "key": "value" }' : 'Plain text content'}
               />;
    }
    if (bodyType === 'form-data') {
        const formData = getFormData();
        return (
            <div className="p-2 space-y-2">
                {formData.map((entry, index) => (
                    <div key={index} className="flex items-center space-x-2">
                        <div className="flex-1 min-w-0">
                          <VariableInput activeEnvironment={activeEnvironment} type="text" value={entry.key} onChange={e => handleFormDataChange(index, 'key', e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-sm font-mono" placeholder="key"/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <VariableInput activeEnvironment={activeEnvironment} type="text" value={entry.value} onChange={e => handleFormDataChange(index, 'value', e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-sm font-mono" placeholder="value"/>
                        </div>
                        <button onClick={() => removeFormDataRow(index)} className="p-1 text-gray-500 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>
                    </div>
                ))}
                 <button onClick={addFormDataRow} className="text-indigo-400 text-sm mt-2 flex items-center">
                    Add Row
                </button>
            </div>
        );
    }
    if (bodyType === 'binary') {
        const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setBinaryFile(e.target.files ? e.target.files[0] : null);
        };
        return (
            <div className="p-4 flex flex-col items-center justify-center h-full text-center">
                <label htmlFor="file-upload" className="cursor-pointer px-4 py-2 bg-gray-700 text-white rounded-md text-sm font-semibold hover:bg-gray-600 transition-colors">
                    {binaryFile ? 'Change File' : 'Select File'}
                </label>
                <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} />
                {binaryFile ? (
                    <div className="mt-3 text-sm text-gray-400">
                        <p className="font-semibold">{binaryFile.name}</p>
                        <p>{(binaryFile.size / 1024).toFixed(2)} KB</p>
                    </div>
                ) : (
                    <p className="mt-3 text-sm text-gray-500">No file selected.</p>
                )}
            </div>
        );
    }
    return null;
  };
  
  const commonHeaders = ['Accept', 'Accept-Charset', 'Accept-Encoding', 'Accept-Language', 'Authorization', 'Cache-Control', 'Content-MD5', 'Content-Type', 'Cookie', 'Date', 'Expect', 'From', 'Host', 'If-Match', 'If-Modified-Since', 'If-None-Match', 'If-Range', 'If-Unmodified-Since', 'Max-Forwards', 'Origin', 'Pragma', 'Proxy-Authorization', 'Range', 'Referer', 'TE', 'Upgrade', 'User-Agent', 'Via', 'Warning', 'X-Requested-With', 'X-Forwarded-For', 'X-Forwarded-Host', 'X-Forwarded-Proto', 'X-Http-Method-Override', 'X-ATT-DeviceId', 'X-Wap-Profile', 'X-UIDH', 'X-Csrf-Token', 'X-Request-ID', 'X-Correlation-ID'];
  const bodyTypeOptions: BodyType[] = ['none', 'json', 'text', 'form-data', 'binary'];

  return (
    <main className="flex-1 flex flex-col min-h-0 min-w-0 bg-gray-900">
      <datalist id="common-headers">
        {commonHeaders.map(h => <option key={h} value={h} />)}
      </datalist>
      <div className="flex items-center justify-between p-3 border-b border-gray-800">
        <input
            type="text"
            value={test.name || ''}
            onChange={e => handleTestPropChange('name', e.target.value)}
            className="bg-transparent text-lg font-bold text-white w-full focus:outline-none focus:ring-0 border-0 p-0"
            placeholder="New Request"
        />
        <div className="flex items-center space-x-2">
            <button onClick={() => onDuplicateTest(test)} title="Duplicate" className="p-2 text-gray-400 hover:text-white"><DuplicateIcon className="w-5 h-5"/></button>
            <button onClick={() => onDeleteTest(test.id)} title="Delete" className="p-2 text-gray-400 hover:text-red-500"><TrashIcon className="w-5 h-5"/></button>
            <button onClick={onSaveTest} className="px-3 py-1.5 bg-gray-700 text-white rounded-md text-xs font-semibold hover:bg-gray-600 transition-colors">Save</button>
        </div>
      </div>

      <div className="flex-1 grid grid-rows-2 gap-2 p-2 min-h-0">
        <div className="flex flex-col bg-gray-800 rounded-md border border-gray-700 min-h-0">
          <div className="flex items-center p-2 border-b border-gray-700">
             <select value={test.method || 'GET'} onChange={e => handleTestPropChange('method', e.target.value)} className="bg-gray-900 border-r-0 border-gray-600 rounded-l-md p-2 text-sm font-bold focus:ring-indigo-500 focus:border-indigo-500">
               <option>GET</option>
               <option>POST</option>
               <option>PUT</option>
               <option>PATCH</option>
               <option>DELETE</option>
             </select>
             <div className="flex-1 min-w-0">
                <VariableInput
                    activeEnvironment={activeEnvironment}
                    type="text"
                    value={test.url || ''}
                    onChange={handleUrlChange}
                    placeholder="https://api.example.com/data"
                    className="bg-gray-900 border-l-0 border-gray-600 p-2 text-sm font-mono focus:ring-indigo-500 focus:border-indigo-500"
                />
             </div>
             <button
                onClick={() => onRunTest(test, binaryFile)}
                disabled={loading}
                className={`px-4 py-2 bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:bg-indigo-400 flex items-center justify-center w-24 ${loading ? 'rounded-r-none' : 'rounded-r-md'}`}
              >
                {loading ? <Spinner size="sm"/> : <><PlayIcon className="w-4 h-4 mr-1"/> Send</>}
             </button>
             {loading && (
                <button
                    onClick={onCancelTest}
                    className="px-4 py-2 bg-red-600 text-white rounded-r-md text-sm font-semibold hover:bg-red-700 flex items-center justify-center"
                >
                    Cancel
                </button>
             )}
          </div>

          <div className="flex-grow flex flex-col min-h-0">
            <div className="flex items-center border-b border-gray-700">
                <button onClick={() => setActiveTab('params')} className={`px-4 py-2 text-sm ${activeTab === 'params' ? 'text-white border-b-2 border-indigo-500' : 'text-gray-400'}`}>Params</button>
                <button onClick={() => setActiveTab('auth')} className={`px-4 py-2 text-sm ${activeTab === 'auth' ? 'text-white border-b-2 border-indigo-500' : 'text-gray-400'}`}>Auth</button>
                <button onClick={() => setActiveTab('headers')} className={`px-4 py-2 text-sm ${activeTab === 'headers' ? 'text-white border-b-2 border-indigo-500' : 'text-gray-400'}`}>Headers</button>
                <button onClick={() => setActiveTab('body')} className={`px-4 py-2 text-sm ${activeTab === 'body' ? 'text-white border-b-2 border-indigo-500' : 'text-gray-400'}`}>Body</button>
                <button onClick={() => setActiveTab('tests')} className={`px-4 py-2 text-sm ${activeTab === 'tests' ? 'text-white border-b-2 border-indigo-500' : 'text-gray-400'}`}>Tests</button>
            </div>
            <div className="flex-1 overflow-auto">
                {activeTab === 'params' && (
                    <div className="p-2 space-y-2">
                        {queryParams.map(([key, value], index) => (
                           <div key={index} className="flex items-center space-x-2">
                               <div className="flex-1 min-w-0">
                                 <VariableInput activeEnvironment={activeEnvironment} type="text" value={key} onChange={e => handleParamChange(index, 'key', e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-sm font-mono" placeholder="Key"/>
                               </div>
                               <div className="flex-1 min-w-0">
                                 <VariableInput activeEnvironment={activeEnvironment} type="text" value={value} onChange={e => handleParamChange(index, 'value', e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-sm font-mono" placeholder="Value"/>
                               </div>
                               <button onClick={() => removeParam(index)} className="p-1 text-gray-500 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>
                           </div>
                        ))}
                        <button onClick={addParam} className="text-indigo-400 text-sm mt-2">Add Param</button>
                    </div>
                )}
                {activeTab === 'auth' && renderAuthEditor()}
                {activeTab === 'headers' && (
                    <div className="p-2 space-y-2">
                        {headerEntries.map(([key, value], index) => (
                           <div key={index} className="flex items-center space-x-2">
                               <div className="flex-1 min-w-0">
                                 <VariableInput activeEnvironment={activeEnvironment} type="text" list="common-headers" value={key} onChange={e => handleHeaderChange(index, 'key', e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-sm font-mono" placeholder="Header"/>
                               </div>
                               <div className="flex-1 min-w-0">
                                 <VariableInput activeEnvironment={activeEnvironment} type="text" value={value} onChange={e => handleHeaderChange(index, 'value', e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-sm font-mono" placeholder="Value"/>
                               </div>
                               <button onClick={() => removeHeader(index)} className="p-1 text-gray-500 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>
                           </div>
                        ))}
                        <button onClick={addHeader} className="text-indigo-400 text-sm mt-2">Add Header</button>
                    </div>
                )}
                {activeTab === 'body' && (
                    <div className="h-full flex flex-col">
                        <div className="p-2 flex items-center space-x-4 border-b border-gray-700">
                           {bodyTypeOptions.map(type => (
                             <label key={type} className="flex items-center text-sm text-gray-300">
                               <input
                                 type="radio"
                                 name="bodyType"
                                 value={type}
                                 checked={ (test.bodyType || 'none') === type}
                                 onChange={() => handleBodyTypeChange(type)}
                                 className="mr-2 bg-gray-700 text-indigo-500 border-gray-600 focus:ring-indigo-500"
                               />
                               {type}
                             </label>
                           ))}
                        </div>
                        <div className="flex-1 min-h-0">
                           {renderBodyEditor()}
                        </div>
                    </div>
                )}
                 {activeTab === 'tests' && (
                    <div className="p-4 space-y-3">
                      <p className="text-sm text-gray-400">
                        Extract data from the response JSON and set it as an environment variable for the current session.
                      </p>
                       {(test.extractionRules || []).map((rule, index) => (
                         <div key={rule.id} className="flex items-center space-x-2 p-2 bg-gray-900/50 rounded-md">
                           <div className="flex-1 min-w-0">
                             <VariableInput
                                activeEnvironment={activeEnvironment}
                                type="text"
                                value={rule.jsonPath || ''}
                                onChange={(e) => handleRuleChange(index, 'jsonPath', e.target.value)}
                                className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-sm font-mono"
                                placeholder="JSONPath (e.g., $.data.token)"
                              />
                           </div>
                           <select
                             value={rule.targetVariable || ''}
                             onChange={(e) => handleRuleChange(index, 'targetVariable', e.target.value)}
                             className="flex-1 bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-sm font-mono"
                             disabled={!activeEnvironment}
                           >
                             <option value="">Select variable...</option>
                             {activeEnvironment && Object.keys(activeEnvironment.variables).map(key => (
                               <option key={key} value={key}>{key}</option>
                             ))}
                           </select>
                           <button onClick={() => removeRule(rule.id)} className="p-1 text-gray-500 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>
                         </div>
                       ))}
                      <button onClick={addRule} className="text-indigo-400 text-sm mt-2">
                        Add Extraction Rule
                      </button>
                      {!activeEnvironment && <p className="text-xs text-yellow-500 mt-2">No active environment. Please select one to use variables.</p>}
                    </div>
                )}
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-md border border-gray-700 min-h-0">
            <ResponseView response={response} loading={loading} error={error} />
        </div>
      </div>
    </main>
  );
};

export default TestView;
