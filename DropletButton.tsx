
import React from 'react';

interface DropletButtonProps {
  isBathing: boolean;
  onClick: () => void;
  label: string;
}

export const DropletButton: React.FC<DropletButtonProps> = ({ isBathing, onClick, label }) => {
  return (
    <button
      onClick={onClick}
      className={`relative w-48 h-64 focus:outline-none transition-transform active:scale-95 duration-300 group`}
    >
      <div className={`absolute inset-0 flex items-center justify-center`}>
        <svg
          viewBox="0 0 100 120"
          className={`w-full h-full drop-shadow-xl transition-colors duration-500 ${
            isBathing ? 'fill-rose-400' : 'fill-sky-400 group-hover:fill-sky-500'
          }`}
        >
          <path d="M50 0 C50 0 10 45 10 75 C10 97 28 115 50 115 C72 115 90 97 90 75 C90 45 50 0 50 0 Z" />
        </svg>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white font-bold p-4 text-center">
        <span className="text-xl drop-shadow-md">{label}</span>
      </div>
    </button>
  );
};
