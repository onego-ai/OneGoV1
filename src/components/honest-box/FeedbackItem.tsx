
import React from 'react';
import { 
  Eye, 
  Flag, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  Clock,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Feedback {
  id: string;
  monthly_question: string | null;
  monthly_response: string | null;
  open_feedback: string | null;
  submitted_at: string;
  month_year: string;
  status: string;
  priority: string;
  flagged_inappropriate: boolean;
  admin_notes: string | null;
}

interface FeedbackItemProps {
  item: Feedback;
  onUpdateStatus: (id: string, status: string, priority?: string) => void;
  onFlagFeedback: (id: string, flagged: boolean) => void;
}

const FeedbackItem: React.FC<FeedbackItemProps> = ({ item, onUpdateStatus, onFlagFeedback }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'received': return <Clock className="h-4 w-4" />;
      case 'under_review': return <Eye className="h-4 w-4" />;
      case 'actioned': return <CheckCircle className="h-4 w-4" />;
      case 'not_relevant': return <X className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received': return 'bg-blue-100 text-blue-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'actioned': return 'bg-green-100 text-green-800';
      case 'not_relevant': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <Card className={item.flagged_inappropriate ? 'border-red-200 bg-red-50' : ''}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 space-y-2 sm:space-y-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={`${getStatusColor(item.status)} text-xs`}>
              {getStatusIcon(item.status)}
              <span className="ml-1 capitalize">{item.status.replace('_', ' ')}</span>
            </Badge>
            <Badge className={`${getPriorityColor(item.priority)} text-xs`}>
              <span className="capitalize">{item.priority}</span>
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Calendar className="h-3 w-3 mr-1" />
              {item.month_year}
            </Badge>
            {item.flagged_inappropriate && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Flagged
              </Badge>
            )}
          </div>
        </div>

        {item.monthly_question && item.monthly_response && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="font-medium text-blue-900 mb-2 text-sm sm:text-base">Monthly Question:</div>
            <div className="text-blue-800 mb-2 text-sm sm:text-base">{item.monthly_question}</div>
            <div className="font-medium text-blue-900 mb-1 text-sm sm:text-base">Response:</div>
            <div className="text-blue-800 text-sm sm:text-base">{item.monthly_response}</div>
          </div>
        )}

        {item.open_feedback && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="font-medium text-gray-900 mb-1 text-sm sm:text-base">Open Feedback:</div>
            <div className="text-gray-800 text-sm sm:text-base">{item.open_feedback}</div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Select 
              value={item.status} 
              onValueChange={(value) => onUpdateStatus(item.id, value)}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="actioned">Actioned</SelectItem>
                <SelectItem value="not_relevant">Not Relevant</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={item.priority} 
              onValueChange={(value) => onUpdateStatus(item.id, item.status, value)}
            >
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant={item.flagged_inappropriate ? "destructive" : "outline"}
            size="sm"
            onClick={() => onFlagFeedback(item.id, !item.flagged_inappropriate)}
            className="w-full sm:w-auto"
          >
            <Flag className="h-4 w-4 mr-1" />
            {item.flagged_inappropriate ? 'Unflag' : 'Flag'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeedbackItem;
