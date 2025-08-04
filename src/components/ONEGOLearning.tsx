import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Home,
  Users,
  BarChart3,
  BookOpen,
  Crown,
  Settings,
  User,
  LogOut,
  ChevronDown,
  Plus,
  Upload,
  Mail,
  UserPlus,
  Building2,
  GraduationCap,
  Target,
  Users as UsersIcon,
  Clock,
  BarChart,
  Trophy,
  Star,
  MessageCircle,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  Circle,
  ArrowRight,
  X,
  Check,
  TrendingUp,
  Award,
  Target as TargetIcon,
  Zap,
  HeadphonesIcon
} from 'lucide-react';

interface Assessment {
  id: string;
  title: string;
  description: string;
  questions: Question[];
}

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: string | null;
  created_at: string;
}

interface Course {
    id: string;
    title: string;
    description: string;
    image_url: string;
    modules: Module[];
    created_at: string;
    instructor_id: string;
}

interface Module {
    id: string;
    title: string;
    content: string;
    course_id: string;
    lessons: Lesson[];
}

interface Lesson {
    id: string;
    title: string;
    content: string;
    module_id: string;
    video_url: string | null;
    audio_url: string | null;
    transcript: string | null;
}

console.log('ONEGOLearning component loading...');

// Use mock data instead of trying to connect to Supabase for now
const mockSupabase = {
  auth: {
    getUser: () => Promise.resolve({ data: { user: null } }),
  },
  from: () => ({
    select: () => Promise.resolve({ data: [], error: null })
  })
};

const ONEGOLearning: React.FC = () => {
  console.log('ONEGOLearning component rendering...');
  
  const [activeTab, setActiveTab] = useState('home');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [pricingOptions, setPricingOptions] = useState({
    billing: 'monthly',
    users: 5,
  });

  // Comment out Supabase calls for now to isolate the issue
  useEffect(() => {
    console.log('Setting up mock data...');
    // Mock user data
    setUser({
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      avatar_url: null,
      role: 'student',
      created_at: new Date().toISOString()
    });
  }, []);

  const freeFeatures = [
    { id: 'users', icon: Users, label: '1 User', highlight: false },
    { id: 'courses', icon: BookOpen, label: '1 Course/Day', highlight: false },
    { id: 'support', icon: HeadphonesIcon, label: 'Email Support', highlight: false }
  ];

  const proFeatures = [
    { id: 'users', icon: Users, label: 'Unlimited Users', highlight: true },
    { id: 'courses', icon: BookOpen, label: 'Unlimited Courses', highlight: true },
    { id: 'analytics', icon: BarChart3, label: 'Advanced Analytics', highlight: true },
    { id: 'support', icon: HeadphonesIcon, label: 'Priority Support', highlight: false }
  ];

  const enterpriseFeatures = [
    { id: 'users', icon: Users, label: '10,000+ Users', highlight: true },
    { id: 'courses', icon: BookOpen, label: 'Custom Courses', highlight: true },
    { id: 'analytics', icon: BarChart3, label: 'Enterprise Analytics', highlight: true },
    { id: 'support', icon: HeadphonesIcon, label: 'Dedicated Support', highlight: true }
  ];

  const handleCourseClick = (course: Course) => {
    setSelectedCourse(course);
    setSelectedModule(null);
    setSelectedLesson(null);
    setActiveTab('courseDetails');
  };

  const handleModuleClick = (module: Module) => {
    setSelectedModule(module);
    setSelectedLesson(null);
    setActiveTab('moduleDetails');
  };

  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setAudioUrl(lesson.audio_url || null);
    setActiveTab('lessonDetails');
  };

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    setSelectedCourse(null);
    setSelectedModule(null);
    setSelectedLesson(null);
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const resetAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const renderHome = () => {
    console.log('Rendering home page...');
    return (
      <div className="p-8">
        <h2 className="text-2xl font-bold mb-4">Available Courses</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-500 text-lg">No courses available yet.</p>
              <p className="text-gray-400">Add some courses to get started!</p>
            </div>
          ) : (
            courses.map(course => (
              <div key={course.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <img src={course.image_url} alt={course.title} className="w-full h-48 object-cover" />
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-2">{course.title}</h3>
                  <p className="text-gray-600">{course.description}</p>
                  <button 
                    onClick={() => handleCourseClick(course)}
                    className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  >
                    View Course
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderCourseDetails = () => {
    if (!selectedCourse) {
      return <div>No course selected.</div>;
    }

    return (
      <div className="p-8">
        <h2 className="text-2xl font-bold mb-4">{selectedCourse.title}</h2>
        <p className="text-gray-700 mb-4">{selectedCourse.description}</p>

        <h3 className="text-xl font-semibold mb-2">Modules</h3>
        <ul>
          {selectedCourse.modules.map(module => (
            <li key={module.id} className="mb-2">
              <button 
                onClick={() => handleModuleClick(module)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded shadow"
              >
                {module.title}
              </button>
            </li>
          ))}
        </ul>
        <button
          onClick={() => setActiveTab('home')}
          className="mt-4 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
        >
          Back to Home
        </button>
      </div>
    );
  };

  const renderModuleDetails = () => {
    if (!selectedModule) {
      return <div>No module selected.</div>;
    }

    return (
      <div className="p-8">
        <h2 className="text-2xl font-bold mb-4">{selectedModule.title}</h2>
        <p className="text-gray-700 mb-4">{selectedModule.content}</p>

        <h3 className="text-xl font-semibold mb-2">Lessons</h3>
        <ul>
          {selectedModule.lessons.map(lesson => (
            <li key={lesson.id} className="mb-2">
              <button
                onClick={() => handleLessonClick(lesson)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded shadow"
              >
                {lesson.title}
              </button>
            </li>
          ))}
        </ul>
        <button
          onClick={() => setActiveTab('courseDetails')}
          className="mt-4 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
        >
          Back to Course
        </button>
      </div>
    );
  };

  const renderLessonDetails = () => {
    if (!selectedLesson) {
      return <div>No lesson selected.</div>;
    }

    return (
      <div className="p-8">
        <h2 className="text-2xl font-bold mb-4">{selectedLesson.title}</h2>
        <p className="text-gray-700 mb-4">{selectedLesson.content}</p>

        {selectedLesson.video_url && (
          <div className="mb-4">
            <video controls className="w-full">
              <source src={selectedLesson.video_url} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        {selectedLesson.audio_url && (
          <div className="mb-4">
            <audio ref={audioRef} src={selectedLesson.audio_url} />
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button onClick={togglePlay} className="mr-2">
                  {isPlaying ? <Pause /> : <Play />}
                </button>
                <button onClick={toggleMute}>
                  {isMuted ? <VolumeX /> : <Volume2 />}
                </button>
              </div>
              <button onClick={resetAudio}>
                <RotateCcw />
              </button>
            </div>
          </div>
        )}

        {selectedLesson.transcript && (
          <div className="mb-4">
            <h3 className="text-xl font-semibold mb-2">Transcript</h3>
            <p className="text-gray-700">{selectedLesson.transcript}</p>
          </div>
        )}

        <button
          onClick={() => setActiveTab('moduleDetails')}
          className="mt-4 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
        >
          Back to Module
        </button>
      </div>
    );
  };

  const renderPricingPage = () => (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
          <p className="text-xl text-gray-600">Scale your learning with the right plan for your team</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Free Plan */}
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
              <div className="text-4xl font-bold text-gray-900 mb-2">$0</div>
              <p className="text-gray-600">Forever free</p>
            </div>
            <ul className="space-y-4 mb-8">
              {freeFeatures.map((feature) => (
                <li key={feature.id} className="flex items-center">
                  <feature.icon className="h-5 w-5 text-green-500 mr-3" />
                  <span className={feature.highlight ? 'font-semibold' : ''}>{feature.label}</span>
                </li>
              ))}
            </ul>
            <button className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200">
              Current Plan
            </button>
          </div>

          {/* Pro Plan */}
          <div className="bg-white rounded-lg border-2 border-green-500 p-8 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                Most Popular
              </span>
            </div>
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Pro</h3>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                ${pricingOptions.billing === 'monthly' ? '19' : '15.20'}
              </div>
              <p className="text-gray-600">per user/month</p>
              {pricingOptions.billing === 'yearly' && (
                <p className="text-green-600 font-medium mt-2">Save 20%</p>
              )}
            </div>
            <ul className="space-y-4 mb-8">
              {proFeatures.map((feature) => (
                <li key={feature.id} className="flex items-center">
                  <feature.icon className="h-5 w-5 text-green-500 mr-3" />
                  <span className={feature.highlight ? 'font-semibold' : ''}>{feature.label}</span>
                </li>
              ))}
            </ul>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-700">Number of users:</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPricingOptions(prev => ({ ...prev, users: Math.max(3, prev.users - 1) }))}
                    className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-medium">{pricingOptions.users}</span>
                  <button
                    onClick={() => setPricingOptions(prev => ({ ...prev, users: prev.users + 1 }))}
                    className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  ${(pricingOptions.users * (pricingOptions.billing === 'monthly' ? 19 : 15.20)).toFixed(2)}
                </div>
                <p className="text-gray-600">total per month</p>
              </div>
            </div>
            <button className="w-full py-3 px-4 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600">
              Upgrade to Pro
            </button>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Enterprise</h3>
              <div className="text-4xl font-bold text-gray-900 mb-2">Custom</div>
              <p className="text-gray-600">For 10,000+ users</p>
            </div>
            <ul className="space-y-4 mb-8">
              {enterpriseFeatures.map((feature) => (
                <li key={feature.id} className="flex items-center">
                  <feature.icon className="h-5 w-5 text-green-500 mr-3" />
                  <span className={feature.highlight ? 'font-semibold' : ''}>{feature.label}</span>
                </li>
              ))}
            </ul>
            <button className="w-full py-3 px-4 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800">
              Enquire
            </button>
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-100 rounded-lg p-1 flex">
            <button
              onClick={() => setPricingOptions(prev => ({ ...prev, billing: 'monthly' }))}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                pricingOptions.billing === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPricingOptions(prev => ({ ...prev, billing: 'yearly' }))}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                pricingOptions.billing === 'yearly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yearly
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Settings</h2>
      <p className="text-gray-600">Settings page coming soon...</p>
    </div>
  );

  console.log('About to render main component...');

  try {
    return (
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <div className="w-64 bg-gray-800 text-white flex flex-col">
          <div className="p-4">
            <h1 className="text-2xl font-bold">ONEGO Learning</h1>
          </div>

          <nav className="flex-grow">
            <ul>
              <li className="p-4 hover:bg-gray-700 cursor-pointer" onClick={() => handleTabClick('home')}>
                <Home className="inline-block mr-2" />
                Home
              </li>
              <li className="p-4 hover:bg-gray-700 cursor-pointer" onClick={() => handleTabClick('pricing')}>
                <TrendingUp className="inline-block mr-2" />
                Pricing
              </li>
              <li className="p-4 hover:bg-gray-700 cursor-pointer" onClick={() => handleTabClick('settings')}>
                <Settings className="inline-block mr-2" />
                Settings
              </li>
            </ul>
          </nav>

          {/* User Info */}
          {user && (
            <div className="p-4 border-t border-gray-700">
              <div className="flex items-center">
                <img src={user.avatar_url || "https://via.placeholder.com/40"} alt="User Avatar" className="w-8 h-8 rounded-full mr-2" />
                <div>
                  <p className="text-sm font-semibold">{user.name}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </div>
              </div>
              <button className="mt-2 w-full bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                Logout
              </button>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-grow overflow-y-auto">
          {activeTab === 'home' && renderHome()}
          {activeTab === 'pricing' && renderPricingPage()}
          {activeTab === 'settings' && renderSettings()}
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error rendering ONEGOLearning component:', error);
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Application</h1>
          <p className="text-gray-600">Please check the console for details.</p>
        </div>
      </div>
    );
  }
};

console.log('ONEGOLearning component defined');

export default ONEGOLearning;
