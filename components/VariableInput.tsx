import React, { useState, useRef } from 'react';
import type { Environment } from '../types';
import VariableInserter from './VariableInserter';

interface VariableInputProps {
  as?: 'input' | 'textarea';
  activeEnvironment: Environment | null;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  containerClassName?: string;
  [key: string]: any; // for other props
}

const VariableInput: React.FC<VariableInputProps> = ({ as = 'input', activeEnvironment, value, onChange, className, containerClassName = '', ...props }) => {
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const highlighterRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filter, setFilter] = useState('');
  
  const Component = as;
  const isTextarea = as === 'textarea';

  const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e); 

    const currentValue = e.target.value;
    const cursor = e.target.selectionStart;

    if (cursor !== null) {
      const lastOpen = currentValue.lastIndexOf('{{', cursor - 1);
      const lastClose = currentValue.lastIndexOf('}}', cursor - 1);

      if (lastOpen !== -1 && lastOpen > lastClose) {
        const currentFilter = currentValue.substring(lastOpen + 2, cursor);
        if (!/\s/.test(currentFilter)) {
          setFilter(currentFilter);
          setIsDropdownOpen(true);
        } else {
          setIsDropdownOpen(false);
        }
      } else {
        setIsDropdownOpen(false);
      }
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isDropdownOpen && e.key === 'Escape') {
      e.preventDefault();
      setIsDropdownOpen(false);
    }
    if (props.onKeyDown) {
        props.onKeyDown(e);
    }
  };

  const handleInsert = (variableName: string) => {
    const input = inputRef.current;
    if (!input) return;

    const textToInsert = `{{${variableName}}}`;
    const currentValue = value;
    const cursor = input.selectionStart ?? currentValue.length;
    
    const lastOpen = currentValue.lastIndexOf('{{', cursor - 1);
    const lastClose = currentValue.lastIndexOf('}}', cursor - 1);

    let newValue;
    let newCursorPos;

    if (isDropdownOpen && lastOpen !== -1 && lastOpen > lastClose) {
      newValue =
        currentValue.substring(0, lastOpen) +
        textToInsert +
        currentValue.substring(cursor);
      newCursorPos = lastOpen + textToInsert.length;
    } else {
      const end = input.selectionEnd ?? cursor;
      newValue =
        currentValue.substring(0, cursor) +
        textToInsert +
        currentValue.substring(end);
      newCursorPos = cursor + textToInsert.length;
    }

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window[as === 'input' ? 'HTMLInputElement' : 'HTMLTextAreaElement'].prototype, 'value'
    )?.set;

    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(input, newValue);
      const event = new Event('input', { bubbles: true });
      input.dispatchEvent(event);
    }

    setTimeout(() => {
      input.focus();
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);

    setIsDropdownOpen(false);
    setFilter('');
  };

  const renderHighlightedValue = (text: string) => {
    if (!text) return <>&nbsp;</>; // Render non-breaking space to maintain height
    const regex = /(\{\{.*?\}\})/g;
    const parts = text.split(regex).filter(part => part);

    return parts.map((part, index) => {
      if (part.match(regex)) {
        return (
          <span key={index} className="bg-gray-900 text-cyan-400 rounded-sm">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlighterRef.current) {
      highlighterRef.current.scrollTop = e.currentTarget.scrollTop;
      highlighterRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${containerClassName}`}>
      {/* Layer 1: The highlighter, absolutely positioned to fill the container */}
      <div
        ref={highlighterRef}
        className={`${className} absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden ${isTextarea ? 'whitespace-pre-wrap' : 'whitespace-nowrap'}`}
        aria-hidden="true"
      >
        {renderHighlightedValue(value)}
      </div>

      {/* Layer 2: The actual input, fills the container and sits on top of the highlighter */}
      <Component
        ref={inputRef}
        value={value}
        onChange={handleLocalChange}
        onKeyDown={handleKeyDown}
        onScroll={isTextarea ? handleScroll : undefined}
        className={`${className} !text-transparent !bg-transparent caret-indigo-400 relative z-10 w-full resize-none`}
        {...props}
      />
      
      {/* Layer 3: The variable inserter button, absolutely positioned on top of everything */}
      {activeEnvironment && Object.keys(activeEnvironment.variables).length > 0 && (
         <div className={`absolute right-2 ${isTextarea ? 'top-2' : 'top-1/2 -translate-y-1/2'} z-20`}>
          <VariableInserter 
            activeEnvironment={activeEnvironment} 
            onInsert={handleInsert}
            isOpen={isDropdownOpen}
            setIsOpen={setIsDropdownOpen}
            filter={filter}
          />
        </div>
      )}
    </div>
  );
};

export default VariableInput;