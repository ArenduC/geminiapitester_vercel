import React from 'react';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';

interface DataErrorProps {
  title: string;
  message: string;
}

const DataError: React.FC<DataErrorProps> = ({ title, message }) => {
  return (
    <div className="m-8 p-6 bg-red-900/20 border border-red-800/50 rounded-lg text-red-300 max-w-2xl w-full">
      <div className="flex items-center">
        <ExclamationTriangleIcon className="w-8 h-8 mr-4 text-red-400 flex-shrink-0" />
        <div>
          <h3 className="text-xl font-bold text-red-200">{title}</h3>
          <p className="mt-1 text-sm">This is often due to missing database tables or incorrect Row Level Security (RLS) policies.</p>
        </div>
      </div>
      <pre className="mt-4 p-3 bg-gray-950/50 rounded-md text-xs font-mono whitespace-pre-wrap">
        {message}
      </pre>
    </div>
  );
};

export default DataError;
