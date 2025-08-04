
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  icon: LucideIcon;
  iconColor: string;
  value: number;
  label: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon: Icon, iconColor, value, label }) => {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border">
      <div className="flex items-center">
        <Icon className={`h-8 w-8 ${iconColor}`} />
        <div className="ml-4">
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-gray-600">{label}</div>
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
