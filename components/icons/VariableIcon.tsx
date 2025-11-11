import React from 'react';

export const VariableIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6.75l-1.5 10.5M13.5 6.75l1.5 10.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 9.75L2.25 12 6 14.25" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9.75l3.75 2.25L18 14.25" />
  </svg>
);