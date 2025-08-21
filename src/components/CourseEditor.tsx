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
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Helper to detect HTML content
const looksLikeHtml = (s: string) => /<\/?\w+[^>]*>/.test(s || '');

// Helper to convert plain text into simple HTML paragraphs and line breaks
const plainTextToHtml = (text: string) => {
  if (!text) return '';
  const normalized = text.replace(/\r\n/g, '\n');
  const paragraphs = normalized.split(/\n\n+/).map(p => {
    const withBreaks = p.split('\n').join('<br/>');
    return `<p>${withBreaks}</p>`;
  });
  return paragraphs.join('');
};

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

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface Quiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
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
            <FileText className="h-5 w-5 text-green-500" />
            {isEditing ? (
              <input
                type="text"
                value={module.title}
                onChange={(e) => onUpdateModule(module.id, { title: e.target.value })}
                className="text-lg font-semibold border-b border-gray-300 focus:border-blue-500 focus:outline-none px-2 py-1"
                autoFocus
              />
            ) : (
              <h3 className="text-lg font-semibold text-gray-900">{module.title?.replace(/^[⭐🌟★☆•*\-\s]+/, '')}</h3>
            )}
          </div>
          <div className="flex items-center space-x-2">
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
            {/* Duration editor removed */}

            {/* Content Editor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content
              </label>
                              <div className="bg-white border border-gray-300 rounded-lg">
                  <ReactQuill
                    theme="snow"
                    value={looksLikeHtml(module.content) ? module.content : plainTextToHtml(module.content)}
                    onChange={(html) => onUpdateModule(module.id, { content: html })}
                    className="min-h-[480px]"
                    // @ts-ignore - quill v2 SSR safety
                    ssr={true}
                    modules={{
                      toolbar: [
                        [{ header: [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ list: 'ordered' }, { list: 'bullet' }],
                        [{ indent: '-1' }, { indent: '+1' }],
                        [{ align: [] }],
                        ['link', 'blockquote', 'code-block'],
                        ['clean']
                      ]
                    }}
                    formats={['header','bold','italic','underline','strike','list','bullet','indent','align','link','blockquote','code-block']}
                  />
                </div>
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
                    <input
                      type="text"
                      value={point}
                      onChange={(e) => onUpdateKeyPoint(module.id, index, e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => onDeleteKeyPoint(module.id, index)}
                      className="p-1 text-red-500 hover:text-red-700"
                      title="Remove key point"
                    >
                      <X className="h-4 w-4" />
                    </button>
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
  const [editingModuleId, setEditingModuleId] = useState<number | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [expandedQuizIds, setExpandedQuizIds] = useState<Set<string>>(new Set());

  const { toast } = useToast();
  // Auto-save disabled: quizzes will be saved only via Save Changes

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
      if (course.course_plan?.quizzes && Array.isArray(course.course_plan.quizzes)) {
        setQuizzes(course.course_plan.quizzes);
      } else {
        setQuizzes([]);
      }
      // No auto-save on initial load

      // Always fetch latest course from DB to ensure we have persisted quizzes
      (async () => {
        try {
          const { data, error } = await supabase
            .from('courses')
            .select('*')
            .eq('id', course.id)
            .single();
          if (!error && data) {
            const latestPlan = (data as any).course_plan || {};
            if (latestPlan.modules) {
              setModules(latestPlan.modules.map((m: any) => ({
                id: m.id,
                title: m.title,
                content: m.content,
                keyPoints: m.keyPoints || [],
                duration: m.duration || 5
              })));
            }
            if (Array.isArray(latestPlan.quizzes)) {
              setQuizzes(latestPlan.quizzes);
            }
          }
        } catch (e) {
          console.error('Failed to refresh course for editor:', e);
        }
      })();
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
        })),
        quizzes: quizzes
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

  const persistQuizzesOnly = async (newQuizzes: Quiz[]) => {
    try {
      const updatedCoursePlan = {
        ...course.course_plan,
        modules: modules.map((module, index) => ({ ...module, id: index + 1 })),
        quizzes: newQuizzes,
      };
      const { error } = await supabase
        .from('courses')
        .update({ course_plan: updatedCoursePlan })
        .eq('id', course.id);
      if (error) throw error;
      onSave({ ...course, course_plan: updatedCoursePlan });
    } catch (e) {
      console.error('Failed to persist quizzes from editor:', e);
    }
  };



  // Quiz editing helpers
  const toggleQuizExpansion = (quizId: string) => {
    const next = new Set(expandedQuizIds);
    if (next.has(quizId)) next.delete(quizId); else next.add(quizId);
    setExpandedQuizIds(next);
  };

  const updateQuizTitle = (quizId: string, title: string) => {
    setQuizzes(prev => prev.map(q => q.id === quizId ? { ...q, title } : q));
  };

  const addQuestionToQuiz = (quizId: string) => {
    const newQ: QuizQuestion = {
      id: `editor-${Date.now()}`,
      question: 'New question',
      options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
      correctAnswer: 0,
      explanation: ''
    };
    setQuizzes(prev => prev.map(q => q.id === quizId ? { ...q, questions: [...q.questions, newQ] } : q));
  };

  const removeQuestionFromQuiz = (quizId: string, questionId: string) => {
    setQuizzes(prev => prev.map(q => q.id === quizId ? { ...q, questions: q.questions.filter(qq => qq.id !== questionId) } : q));
  };

  const updateQuestionText = (quizId: string, questionId: string, text: string) => {
    setQuizzes(prev => prev.map(q => q.id === quizId ? { ...q, questions: q.questions.map(qq => qq.id === questionId ? { ...qq, question: text } : qq) } : q));
  };

  const addOptionToQuestion = (quizId: string, questionId: string) => {
    setQuizzes(prev => prev.map(q => {
      if (q.id !== quizId) return q;
      return {
        ...q,
        questions: q.questions.map(qq => qq.id === questionId ? { ...qq, options: [...qq.options, `Option ${qq.options.length + 1}`] } : qq)
      };
    }));
  };

  const removeOptionFromQuestion = (quizId: string, questionId: string, optionIndex: number) => {
    setQuizzes(prev => prev.map(q => {
      if (q.id !== quizId) return q;
      return {
        ...q,
        questions: q.questions.map(qq => {
          if (qq.id !== questionId) return qq;
          const newOptions = qq.options.filter((_, i) => i !== optionIndex);
          const newCorrect = Math.min(qq.correctAnswer, newOptions.length - 1);
          return { ...qq, options: newOptions, correctAnswer: Math.max(0, newCorrect) };
        })
      };
    }));
  };

  const updateOptionText = (quizId: string, questionId: string, optionIndex: number, text: string) => {
    setQuizzes(prev => prev.map(q => {
      if (q.id !== quizId) return q;
      return {
        ...q,
        questions: q.questions.map(qq => {
          if (qq.id !== questionId) return qq;
          const newOptions = [...qq.options];
          newOptions[optionIndex] = text;
          return { ...qq, options: newOptions };
        })
      };
    }));
  };

  const setCorrectAnswer = (quizId: string, questionId: string, optionIndex: number) => {
    setQuizzes(prev => prev.map(q => q.id === quizId ? { ...q, questions: q.questions.map(qq => qq.id === questionId ? { ...qq, correctAnswer: optionIndex } : qq) } : q));
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
            className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600"
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

      {/* Quizzes */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mt-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Quizzes</h2>
          <div className="text-sm text-gray-500">
            Quizzes are automatically generated with your course
          </div>
        </div>
        {quizzes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No quizzes available.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {quizzes.map((q) => (
              <div key={q.id} className="border rounded-lg">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex-1 mr-3">
                    <input
                      value={q.title}
                      onChange={(e) => updateQuizTitle(q.id, e.target.value)}
                      className="w-full text-lg font-semibold border-b border-gray-300 focus:border-blue-500 focus:outline-none px-2 py-1"
                    />
                  </div>
                  <button onClick={() => toggleQuizExpansion(q.id)} className="text-gray-600">
                    {expandedQuizIds.has(q.id) ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </button>
                </div>
                {expandedQuizIds.has(q.id) && (
                  <div className="p-4 border-t space-y-4">
                    {q.questions.map((qq) => (
                      <div key={qq.id} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 mr-3">
                            <label className="text-xs font-medium text-gray-700">Question</label>
                            <input
                              value={qq.question}
                              onChange={(e) => updateQuestionText(q.id, qq.id, e.target.value)}
                              className="w-full mt-1 p-2 border rounded"
                            />
                          </div>
                          <button onClick={() => removeQuestionFromQuiz(q.id, qq.id)} className="text-red-600 text-sm">Remove</button>
                        </div>
                        <div className="mt-3">
                          <label className="text-xs font-medium text-gray-700">Options</label>
                          <div className="mt-2 space-y-2">
                            {qq.options.map((opt, oi) => (
                              <div key={oi} className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  name={`correct-${qq.id}`}
                                  checked={qq.correctAnswer === oi}
                                  onChange={() => setCorrectAnswer(q.id, qq.id, oi)}
                                />
                                <input
                                  value={opt}
                                  onChange={(e) => updateOptionText(q.id, qq.id, oi, e.target.value)}
                                  className="flex-1 p-2 border rounded"
                                />
                                <button onClick={() => removeOptionFromQuestion(q.id, qq.id, oi)} className="text-red-600 text-sm">Delete</button>
                              </div>
                            ))}
                            <button onClick={() => addOptionToQuestion(q.id, qq.id)} className="text-green-600 text-sm">+ Add Option</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => addQuestionToQuiz(q.id)} className="px-3 py-2 text-sm rounded-md bg-blue-500 text-white hover:bg-blue-600">+ Add Question</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseEditor; 