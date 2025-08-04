import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Edit3, 
  Plus, 
  Trash2, 
  Save, 
  X, 
  ChevronDown, 
  ChevronRight,
  FileText,
  Clock,
  Users,
  BookOpen,
  ArrowLeft
} from 'lucide-react';
import CourseContentRenderer from './content/CourseContentRenderer';

interface CourseEditorProps {
  course: any;
  user: any;
  onBack: () => void;
  onSave: (updatedCourse: any) => void;
}

interface Module {
  id: number;
  title: string;
  content: string;
  keyPoints: string[];
  duration: number;
}

interface ModuleEditorProps {
  module: Module;
  isEditing: boolean;
  isExpanded: boolean;
  onToggleExpansion: (moduleId: number) => void;
  onUpdateModule: (moduleId: number, updates: Partial<Module>) => void;
  onSetEditingModuleId: (moduleId: number | null) => void;
  onDeleteModule: (moduleId: number) => void;
  onAddKeyPoint: (moduleId: number) => void;
  onUpdateKeyPoint: (moduleId: number, index: number, value: string) => void;
  onDeleteKeyPoint: (moduleId: number, index: number) => void;
}

const ModuleEditor = React.memo<ModuleEditorProps>(({
  module,
  isEditing,
  isExpanded,
  onToggleExpansion,
  onUpdateModule,
  onSetEditingModuleId,
  onDeleteModule,
  onAddKeyPoint,
  onUpdateKeyPoint,
  onDeleteKeyPoint
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg mb-4">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onToggleExpansion(module.id)}
              className="text-gray-500 hover:text-gray-700"
            >
              {isExpanded ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </button>
            <FileText className="h-5 w-5 text-blue-500" />
            {isEditing ? (
              <input
                type="text"
                value={module.title}
                onChange={(e) => onUpdateModule(module.id, { title: e.target.value })}
                className="text-lg font-semibold border-b border-gray-300 focus:border-blue-500 focus:outline-none px-2 py-1"
                autoFocus
              />
            ) : (
              <h3 className="text-lg font-semibold text-gray-900">{module.title}</h3>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="h-4 w-4 mr-1" />
              {module.duration} min
            </div>
            <button
              onClick={() => onSetEditingModuleId(isEditing ? null : module.id)}
              className="p-1 text-gray-500 hover:text-blue-600"
            >
              <Edit3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDeleteModule(module.id)}
              className="p-1 text-gray-500 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="ml-8 space-y-4">
            {/* Duration Editor */}
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-gray-700">Duration:</label>
              <select
                value={module.duration}
                onChange={(e) => onUpdateModule(module.id, { duration: parseInt(e.target.value) })}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                {[3, 5, 10, 15, 20, 30].map(d => (
                  <option key={d} value={d}>{d} minutes</option>
                ))}
              </select>
            </div>

            {/* Content Editor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content
              </label>
              {isEditing ? (
                <textarea
                  value={module.content}
                  onChange={(e) => onUpdateModule(module.id, { content: e.target.value })}
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Enter module content..."
                />
              ) : (
                <div className="prose max-w-none">
                  <CourseContentRenderer content={module.content} />
                </div>
              )}
            </div>

            {/* Key Points Editor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Key Points</label>
                <button
                  onClick={() => onAddKeyPoint(module.id)}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Key Point
                </button>
              </div>
              <div className="space-y-2">
                {module.keyPoints.map((point, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <span className="text-blue-500">•</span>
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={point}
                          onChange={(e) => onUpdateKeyPoint(module.id, index, e.target.value)}
                          className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          onClick={() => onDeleteKeyPoint(module.id, index)}
                          className="p-1 text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <span className="text-sm text-gray-700">{point}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

ModuleEditor.displayName = 'ModuleEditor';

const CourseEditor: React.FC<CourseEditorProps> = ({ course, user, onBack, onSave }) => {
  const [modules, setModules] = useState<Module[]>([]);
  const [courseTitle, setCourseTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<number | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (course) {
      setCourseTitle(course.course_title || '');
      if (course.course_plan?.modules) {
        setModules(course.course_plan.modules.map((module: any) => ({
          id: module.id,
          title: module.title,
          content: module.content,
          keyPoints: module.keyPoints || [],
          duration: module.duration || 5
        })));
      }
    }
  }, [course]);

  const toggleModuleExpansion = useCallback((moduleId: number) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  }, [expandedModules]);

  const addNewModule = useCallback(() => {
    const newModule: Module = {
      id: Date.now(), // Temporary ID
      title: 'New Module',
      content: 'Enter module content here...',
      keyPoints: ['Key point 1', 'Key point 2'],
      duration: 5
    };
    setModules([...modules, newModule]);
    setExpandedModules(new Set([...expandedModules, newModule.id]));
    setEditingModuleId(newModule.id);
  }, [modules, expandedModules]);

  const deleteModule = useCallback((moduleId: number) => {
    if (modules.length <= 1) {
      toast({
        title: "Cannot delete",
        description: "Course must have at least one module.",
        variant: "destructive",
      });
      return;
    }
    setModules(modules.filter(m => m.id !== moduleId));
    setExpandedModules(new Set([...expandedModules].filter(id => id !== moduleId)));
  }, [modules, expandedModules, toast]);

  const updateModule = useCallback((moduleId: number, updates: Partial<Module>) => {
    setModules(modules.map(m => 
      m.id === moduleId ? { ...m, ...updates } : m
    ));
  }, [modules]);

  const addKeyPoint = useCallback((moduleId: number) => {
    setModules(modules.map(m => 
      m.id === moduleId 
        ? { ...m, keyPoints: [...m.keyPoints, 'New key point'] }
        : m
    ));
  }, [modules]);

  const updateKeyPoint = useCallback((moduleId: number, index: number, value: string) => {
    setModules(modules.map(m => 
      m.id === moduleId 
        ? { 
            ...m, 
            keyPoints: m.keyPoints.map((kp, i) => i === index ? value : kp)
          }
        : m
    ));
  }, [modules]);

  const deleteKeyPoint = useCallback((moduleId: number, index: number) => {
    setModules(modules.map(m => 
      m.id === moduleId 
        ? { 
            ...m, 
            keyPoints: m.keyPoints.filter((_, i) => i !== index)
          }
        : m
    ));
  }, [modules]);

  const saveCourse = async () => {
    setLoading(true);
    try {
      // Update course plan with new modules
      const updatedCoursePlan = {
        ...course.course_plan,
        modules: modules.map((module, index) => ({
          ...module,
          id: index + 1 // Ensure sequential IDs
        }))
      };

      // Update course in database
      const { error } = await supabase
        .from('courses')
        .update({
          course_title: courseTitle,
          course_plan: updatedCoursePlan
        })
        .eq('id', course.id);

      if (error) throw error;

      toast({
        title: "Course Updated",
        description: "Your course has been saved successfully.",
      });

      // Call parent onSave with updated course
      onSave({
        ...course,
        course_title: courseTitle,
        course_plan: updatedCoursePlan
      });

    } catch (error) {
      console.error('Error saving course:', error);
      toast({
        title: "Error",
        description: "Failed to save course changes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Courses
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Course Editor</h1>
            <p className="text-gray-600">Edit and customize your course content</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-4 py-2 rounded-lg font-medium ${
              isEditing 
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isEditing ? 'Preview Mode' : 'Edit Mode'}
          </button>
          <button
            onClick={saveCourse}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Course Title */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Course Title
        </label>
        <input
          type="text"
          value={courseTitle}
          onChange={(e) => setCourseTitle(e.target.value)}
          className="w-full text-xl font-semibold border-b border-gray-300 focus:border-blue-500 focus:outline-none px-2 py-1"
          placeholder="Enter course title..."
        />
      </div>

      {/* Course Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <BookOpen className="h-6 w-6 text-blue-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Modules</p>
              <p className="text-xl font-bold">{modules.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <Clock className="h-6 w-6 text-green-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Duration</p>
              <p className="text-xl font-bold">{modules.reduce((sum, m) => sum + m.duration, 0)} min</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <FileText className="h-6 w-6 text-purple-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Key Points</p>
              <p className="text-xl font-bold">{modules.reduce((sum, m) => sum + m.keyPoints.length, 0)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <Users className="h-6 w-6 text-orange-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Track Type</p>
              <p className="text-xl font-bold">{course.track_type}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modules */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Course Modules</h2>
          <button
            onClick={addNewModule}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Module
          </button>
        </div>

        {modules.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No modules yet. Click "Add Module" to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {modules.map((module, index) => (
              <ModuleEditor
                key={module.id}
                module={module}
                isEditing={editingModuleId === module.id}
                isExpanded={expandedModules.has(module.id)}
                onToggleExpansion={toggleModuleExpansion}
                onUpdateModule={updateModule}
                onSetEditingModuleId={setEditingModuleId}
                onDeleteModule={deleteModule}
                onAddKeyPoint={addKeyPoint}
                onUpdateKeyPoint={updateKeyPoint}
                onDeleteKeyPoint={deleteKeyPoint}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseEditor; 