// FIX: Provide implementation for the UserCursor component, which was previously a placeholder.
import React from 'react';
import { CursorIcon } from './icons/CursorIcon';

interface UserCursorProps {
  x: number;
  y: number;
  name: string;
  color: string;
}

const UserCursor: React.FC<UserCursorProps> = ({ x, y, name, color }) => {
  return (
    <div
      className="absolute top-0 left-0 transition-transform duration-100 ease-linear pointer-events-none"
      style={{
        transform: `translate3d(${x}px, ${y}px, 0)`,
        zIndex: 9999,
      }}
    >
      <CursorIcon className="w-5 h-5 -mt-1 -ml-1" style={{ color }} />
      <div
        className="mt-1 ml-4 px-2 py-0.5 rounded-full text-xs font-semibold text-white shadow-lg"
        style={{ backgroundColor: color }}
      >
        {name}
      </div>
    </div>
  );
};

export default UserCursor;
