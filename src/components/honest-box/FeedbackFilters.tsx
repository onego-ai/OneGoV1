
import React from 'react';
import { Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FeedbackFiltersProps {
  statusFilter: string;
  priorityFilter: string;
  monthFilter: string;
  uniqueMonths: string[];
  setStatusFilter: (value: string) => void;
  setPriorityFilter: (value: string) => void;
  setMonthFilter: (value: string) => void;
}

const FeedbackFilters: React.FC<FeedbackFiltersProps> = ({
  statusFilter,
  priorityFilter,
  monthFilter,
  uniqueMonths,
  setStatusFilter,
  setPriorityFilter,
  setMonthFilter
}) => {
  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-4">
        <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
          <Filter className="h-5 w-5 flex-shrink-0" />
          <span>Filter Feedback</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="actioned">Actioned</SelectItem>
                <SelectItem value="not_relevant">Not Relevant</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Priority</Label>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <Label className="text-sm font-medium">Month</Label>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {uniqueMonths.map(month => (
                  <SelectItem key={month} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeedbackFilters;
