
import React from 'react';
import { Building2, GraduationCap } from 'lucide-react';

interface TrackSelectionProps {
  onTrackSelect: (track: 'Corporate' | 'Educational') => void;
}

const TrackSelection: React.FC<TrackSelectionProps> = ({ onTrackSelect }) => {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-900 mb-4">Course Creator</h2>
      <p className="text-gray-600 mb-8 text-lg">Let's create your personalized learning experience! Choose your training track to get started:</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <button
          onClick={() => onTrackSelect('Corporate')}
          className="p-8 bg-white rounded-lg border-2 border-gray-200 hover:border-green-500 hover:shadow-lg transition-all text-left"
        >
          <Building2 className="h-16 w-16 text-green-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">🏢 Corporate Training</h3>
          <p className="text-gray-600">Perfect for HR managers, L&D leads, and team leaders who need to upskill their staff with practical, workplace-focused training.</p>
        </button>

        <button
          onClick={() => onTrackSelect('Educational')}
          className="p-8 bg-white rounded-lg border-2 border-gray-200 hover:border-green-500 hover:shadow-lg transition-all text-left"
        >
          <GraduationCap className="h-16 w-16 text-green-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">🎓 Educational Lesson</h3>
          <p className="text-gray-600">Ideal for schools, tutors, trainers, and universities creating personalized learning experiences for students.</p>
        </button>
      </div>
    </div>
  );
};

export default TrackSelection;
