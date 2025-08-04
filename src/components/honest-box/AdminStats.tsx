
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface Feedback {
  id: string;
  status: string;
  flagged_inappropriate: boolean;
}

interface AdminStatsProps {
  feedback: Feedback[];
}

const AdminStats: React.FC<AdminStatsProps> = ({ feedback }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold text-blue-600">{feedback.length}</div>
          <div className="text-sm text-gray-600">Total Feedback</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {feedback.filter(f => f.status === 'under_review').length}
          </div>
          <div className="text-sm text-gray-600">Under Review</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold text-green-600">
            {feedback.filter(f => f.status === 'actioned').length}
          </div>
          <div className="text-sm text-gray-600">Actioned</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold text-red-600">
            {feedback.filter(f => f.flagged_inappropriate).length}
          </div>
          <div className="text-sm text-gray-600">Flagged</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminStats;
