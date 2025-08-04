
import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, description }) => {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
      <p className="text-gray-600">{title}</p>
      <p className="text-sm text-gray-500 mt-2">{description}</p>
    </div>
  );
};

export default EmptyState;
