
import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface PublishUpdateDialogProps {
  showDialog: boolean;
  setShowDialog: (show: boolean) => void;
  title: string;
  setTitle: (title: string) => void;
  content: string;
  setContent: (content: string) => void;
  onPublish: () => void;
}

const PublishUpdateDialog: React.FC<PublishUpdateDialogProps> = ({
  showDialog,
  setShowDialog,
  title,
  setTitle,
  content,
  setContent,
  onPublish
}) => {
  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          Publish Update
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Publish New Update</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="update-title">Title</Label>
            <Input
              id="update-title"
              placeholder="e.g., Better Coffee in the Breakroom!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="update-content">Content</Label>
            <Textarea
              id="update-content"
              placeholder="We heard your feedback about... Thanks for speaking up!"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <div className="flex space-x-2">
            <Button onClick={onPublish} className="flex-1">
              Publish
            </Button>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PublishUpdateDialog;
