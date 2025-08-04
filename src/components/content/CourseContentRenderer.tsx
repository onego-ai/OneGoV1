import React from 'react';

interface CourseContentRendererProps {
  content: string;
  className?: string;
}

const CourseContentRenderer: React.FC<CourseContentRendererProps> = ({ content, className = '' }) => {
  // Function to parse markdown-like content and render it properly
  const renderContent = (text: string) => {
    // Handle undefined or null content
    if (!text) {
      return <p className="text-gray-500 italic text-sm sm:text-base">No content available</p>;
    }
    
    // Split content into lines
    const lines = text.split('\n');
    
    return lines.map((line, index) => {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) {
        return <div key={index} className="h-3 sm:h-4"></div>;
      }
      
      // Main heading (starts with #)
      if (trimmedLine.startsWith('# ')) {
        return (
          <h1 key={index} className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 mt-4 sm:mt-6 first:mt-0">
            {trimmedLine.substring(2)}
          </h1>
        );
      }
      
      // Sub heading (starts with ##)
      if (trimmedLine.startsWith('## ')) {
        return (
          <h2 key={index} className="text-lg sm:text-xl font-semibold text-gray-800 mb-2 sm:mb-3 mt-4 sm:mt-5">
            {trimmedLine.substring(3)}
          </h2>
        );
      }
      
      // Sub-sub heading (starts with ###)
      if (trimmedLine.startsWith('### ')) {
        return (
          <h3 key={index} className="text-base sm:text-lg font-medium text-gray-700 mb-2 mt-3 sm:mt-4">
            {trimmedLine.substring(4)}
          </h3>
        );
      }
      
      // Bullet points (starts with -)
      if (trimmedLine.startsWith('- ')) {
        return (
          <div key={index} className="flex items-start space-x-2 mb-2">
            <span className="text-blue-500 mt-1.5 sm:mt-2 flex-shrink-0">•</span>
            <span className="text-sm sm:text-base text-gray-700 leading-relaxed">
              {trimmedLine.substring(2)}
            </span>
          </div>
        );
      }
      
      // Bold text (wrapped in **)
      if (trimmedLine.includes('**')) {
        const parts = trimmedLine.split('**');
        return (
          <p key={index} className="text-sm sm:text-base text-gray-700 leading-relaxed mb-2 sm:mb-3">
            {parts.map((part, partIndex) => 
              partIndex % 2 === 1 ? (
                <strong key={partIndex} className="font-semibold text-gray-900">
                  {part}
                </strong>
              ) : (
                part
              )
            )}
          </p>
        );
      }
      
      // Regular paragraph
      return (
        <p key={index} className="text-sm sm:text-base text-gray-700 leading-relaxed mb-2 sm:mb-3">
          {trimmedLine}
        </p>
      );
    });
  };

  return (
    <div className={`prose max-w-none ${className}`}>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-6">
        <div className="space-y-3 sm:space-y-4">
          {renderContent(content)}
        </div>
      </div>
    </div>
  );
};

export default CourseContentRenderer; 