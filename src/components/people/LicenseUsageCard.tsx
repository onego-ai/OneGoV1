
import React from 'react';
import { Users } from 'lucide-react';

interface LicenseUsageCardProps {
  licenseInfo: {
    purchased: number;
    used: number;
  };
}

const LicenseUsageCard: React.FC<LicenseUsageCardProps> = ({ licenseInfo }) => {
  const usagePercentage = licenseInfo.purchased > 0 
    ? (licenseInfo.used / licenseInfo.purchased) * 100 
    : 0;
  
  return (
    <div className="bg-white rounded-lg border p-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="h-8 w-8 text-blue-500" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">License Usage</h3>
            <p className="text-gray-600">Manage your team licenses</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500 mb-1">
            {licenseInfo.purchased} licenses purchased
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {licenseInfo.used}/{licenseInfo.purchased}
          </div>
          <div className="text-sm text-gray-500">licenses in use</div>
        </div>
      </div>
      <div className="mt-4">
        <div className="bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0</span>
          <span>{licenseInfo.purchased}</span>
        </div>
      </div>
    </div>
  );
};

export default LicenseUsageCard;
