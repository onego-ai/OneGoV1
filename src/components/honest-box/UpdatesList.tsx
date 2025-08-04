
import React, { useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Update {
  id: string;
  title: string;
  content: string;
  published_at: string;
}

interface UpdatesListProps {
  updates: Update[];
  onUpdateDeleted: () => void;
  onUpdateEdited: () => void;
}

const UpdatesList: React.FC<UpdatesListProps> = ({ updates, onUpdateDeleted, onUpdateEdited }) => {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  if (updates.length === 0) return null;

  const handleEdit = (update: Update) => {
    setEditingId(update.id);
    setEditTitle(update.title);
    setEditContent(update.content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditContent('');
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || !editContent.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both title and content.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('honest_box_updates')
        .update({
          title: editTitle.trim(),
          content: editContent.trim()
        })
        .eq('id', editingId);

      if (error) {
        console.error('Error updating update:', error);
        toast({
          title: "Error",
          description: "Failed to update the post.",
          variant: "destructive"
        });
        return;
      }

      setEditingId(null);
      setEditTitle('');
      setEditContent('');
      onUpdateEdited();
      
      toast({
        title: "Updated!",
        description: "Your update has been saved successfully.",
      });
    } catch (error) {
      console.error('Error updating update:', error);
    }
  };

  const handleDelete = async (updateId: string) => {
    if (!confirm('Are you sure you want to delete this update? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('honest_box_updates')
        .delete()
        .eq('id', updateId);

      if (error) {
        console.error('Error deleting update:', error);
        toast({
          title: "Error",
          description: "Failed to delete the update.",
          variant: "destructive"
        });
        return;
      }

      onUpdateDeleted();
      
      toast({
        title: "Deleted!",
        description: "The update has been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting update:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Published Updates</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {updates.map((update) => (
          <div key={update.id} className="border-l-4 border-green-500 pl-4 py-2">
            {editingId === update.id ? (
              <div className="space-y-3">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Update title"
                />
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Update content"
                  className="min-h-[100px]"
                />
                <div className="flex space-x-2">
                  <Button onClick={handleSaveEdit} size="sm">
                    Save
                  </Button>
                  <Button onClick={handleCancelEdit} variant="outline" size="sm">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-semibold text-gray-900">{update.title}</h4>
                  <div className="flex space-x-1">
                    <Button
                      onClick={() => handleEdit(update)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(update.id)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-gray-700 mb-2">{update.content}</p>
                <p className="text-sm text-gray-500">
                  Published {new Date(update.published_at).toLocaleDateString()}
                </p>
              </>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default UpdatesList;
