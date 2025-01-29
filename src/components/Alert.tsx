import React from 'react';

interface AlertProps {
  type: 'error' | 'info';
  message: string;
}

export function Alert({ type, message }: AlertProps) {
  const bgColor = type === 'error' ? 'bg-red-100' : 'bg-blue-100';
  const textColor = type === 'error' ? 'text-red-800' : 'text-blue-800';
  const icon = type === 'error' ? '⚠️' : 'ℹ️';

  return (
    <div className={`${bgColor} ${textColor} p-4 rounded-md flex items-start`}>
      <span className="mr-2">{icon}</span>
      <span>{message}</span>
    </div>
  );
} 