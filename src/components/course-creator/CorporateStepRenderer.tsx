
import React, { useState, useEffect } from 'react';
import { Upload, FileText, X, Loader2, Globe, Link, Crown } from 'lucide-react';
import { processPDFWithGemini, getDefaultCoursePrompt } from '@/utils/pdfUtils';
import { extractWebsiteContent, getDefaultWebsitePrompt, isValidUrl } from '@/utils/webScrapingUtils';
import { useToast } from '@/hooks/use-toast';

interface CorporateStepRendererProps {
  currentStep: number;
  formData: any;
  setFormData: (data: any) => void;
  userId: string;
  userPlan?: string;
  creditInfo?: {
    availableCredits: number;
    totalCredits: number;
    planType: string;
  };
}

const CorporateStepRenderer: React.FC<CorporateStepRendererProps> = ({
  currentStep,
  formData,
  setFormData,
  userId,
  userPlan = 'Free',
  creditInfo
}) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isScrapingWebsite, setIsScrapingWebsite] = useState(false);
  const { toast } = useToast();

  const isProUser = userPlan === 'Standard' || userPlan === 'Pro' || userPlan === 'Business' || userPlan === 'Enterprise';

  // Ensure defaults for free users so Continue button works
  useEffect(() => {
    console.log('CorporateStepRenderer useEffect:', {
      isProUser,
      currentStep,
      formData: {
        numberOfTopics: formData.numberOfTopics,
        numberOfQuizzes: formData.numberOfQuizzes,
        duration: formData.duration
      }
    });

    if (!isProUser && currentStep === 3) {
      let changed = false;
      const newFormData = { ...formData };
      if (!formData.numberOfTopics || formData.numberOfTopics !== 3) {
        newFormData.numberOfTopics = 3;
        changed = true;
        console.log('Setting numberOfTopics to 3');
      }
      if (!formData.numberOfQuizzes || formData.numberOfQuizzes !== 1) {
        newFormData.numberOfQuizzes = 1;
        changed = true;
        console.log('Setting numberOfQuizzes to 1');
      }
      if (!formData.duration || formData.duration !== '30') {
        newFormData.duration = '30';
        changed = true;
        console.log('Setting duration to 30');
      }
      if (changed) {
        console.log('Updating formData with defaults:', newFormData);
        setFormData(newFormData);
      }
    }
  }, [isProUser, currentStep, formData, setFormData]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      if (!isProUser) {
        toast({
          title: "Pro Feature Required",
          description: "PDF upload is only available for Standard, Pro, Business, and Enterprise users. Please upgrade your plan to access this feature.",
          variant: "destructive",
        });
        return;
      }

      // Credit checking is handled by the backend, so we don't need to check here
      // The backend will return an error if credits are insufficient

      setUploadedFile(file);
      setIsUploading(true);
      
      try {
        setIsProcessing(true);
        
        // Get the course description for context-aware prompt
        const courseDescription = formData.courseDescription || 'this course';
        const prompt = getDefaultCoursePrompt(courseDescription);
        
        const result = await processPDFWithGemini(file, prompt, userId);
        
        if (result.success && result.extractedContent) {
          setFormData({ 
            ...formData, 
            pdfContent: result.extractedContent,
            pdfFileName: file.name 
          });
          toast({
            title: 'PDF processed successfully!',
            description: `Content extracted from ${file.name}. Credits consumed: 1. Remaining: ${result.remainingCredits}`,
          });
        } else {
          throw new Error(result.error || 'Failed to extract content from PDF');
        }
      } catch (error) {
        toast({
          title: 'Error processing PDF',
          description: error instanceof Error ? error.message : 'Failed to process PDF.',
          variant: 'destructive',
        });
      } finally {
        setIsUploading(false);
        setIsProcessing(false);
      }
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setFormData({ 
      ...formData, 
      pdfContent: null,
      pdfFileName: null 
    });
  };

  const handleWebsiteScraping = async () => {
    if (!websiteUrl.trim()) {
      toast({
        title: 'Please enter a website URL',
        description: 'Enter a valid website URL to extract content.',
        variant: 'destructive',
      });
      return;
    }

    if (!isValidUrl(websiteUrl)) {
      toast({
        title: 'Invalid URL format',
        description: 'Please enter a valid website URL (e.g., https://example.com)',
        variant: 'destructive',
      });
      return;
    }

    setIsScrapingWebsite(true);
    
    try {
      // Get the course description for context-aware prompt
      const courseDescription = formData.courseDescription || 'this course';
      const prompt = getDefaultWebsitePrompt(courseDescription);
      
      const result = await extractWebsiteContent(websiteUrl, prompt, userId);
      
      if (result.success && result.extractedContent) {
        setFormData({ 
          ...formData, 
          websiteContent: result.extractedContent,
          websiteUrl: websiteUrl 
        });
        toast({
          title: 'Website content extracted successfully!',
          description: `Content extracted from ${websiteUrl}`,
        });
      } else {
        throw new Error(result.error || 'Failed to extract content from website');
      }
    } catch (error) {
      toast({
        title: 'Error extracting website content',
        description: error instanceof Error ? error.message : 'Failed to extract content from website.',
        variant: 'destructive',
      });
    } finally {
      setIsScrapingWebsite(false);
    }
  };

  const removeWebsiteContent = () => {
    setWebsiteUrl('');
    setFormData({ 
      ...formData, 
      websiteContent: null,
      websiteUrl: null 
    });
  };

  switch (currentStep) {
    case 1:
      return (
        <div className="space-y-4 sm:space-y-6">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">📝 Describe Your Course</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
              Tell us what you want to teach. Be as detailed as possible about the topic, goals, and what learners should achieve.
            </p>
            <textarea
              value={formData.courseDescription || ''}
              onChange={(e) => setFormData({ ...formData, courseDescription: e.target.value })}
              placeholder="Example: I want to create a course on customer service skills for retail employees. The course should cover handling difficult customers, de-escalation techniques, and building customer relationships. Learners should be able to confidently handle customer complaints and improve customer satisfaction scores."
              className="w-full h-24 sm:h-32 p-3 sm:p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none text-sm sm:text-base"
            />
            <div className="mt-2 text-xs sm:text-sm text-gray-500">
              {formData.courseDescription?.length || 0} characters
            </div>
          </div>
        </div>
      );

    case 2:
      return (
        <div className="space-y-4 sm:space-y-6">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">👥 Describe Your Learner</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
              Who will be taking this course? Describe their background, experience level, and what they need to learn.
            </p>
            <textarea
              value={formData.learnerDescription || ''}
              onChange={(e) => setFormData({ ...formData, learnerDescription: e.target.value })}
              placeholder="Example: The learners are retail store employees aged 18-45, mostly entry-level with limited customer service experience. They need to learn how to handle customer complaints professionally, understand company policies, and improve their communication skills. Some may be nervous about dealing with angry customers."
              className="w-full h-24 sm:h-32 p-3 sm:p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none text-sm sm:text-base"
            />
            <div className="mt-2 text-xs sm:text-sm text-gray-500">
              {formData.learnerDescription?.length || 0} characters
            </div>
          </div>
        </div>
      );

    case 3:
      return (
        <div className="space-y-4 sm:space-y-6">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">📊 Course Structure</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              Choose how you want your course structured. We'll automatically generate the appropriate number of sections and topics.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="space-y-3 sm:space-y-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 flex items-center">
                  Number of Topics
                  {!isProUser && (
                    <div className="flex items-center space-x-1 text-yellow-600 ml-2">
                      <Crown className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="text-xs font-medium">Pro+</span>
                    </div>
                  )}
                </label>
                <select
                  value={formData.numberOfTopics || '3'}
                  onChange={(e) => {
                    if (isProUser) {
                      setFormData({ ...formData, numberOfTopics: parseInt(e.target.value) });
                    }
                  }}
                  disabled={!isProUser}
                  className={`w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm sm:text-base touch-target ${
                    !isProUser ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="3">3 Topics</option>
                  <option value="4">4 Topics</option>
                  <option value="5">5 Topics</option>
                  <option value="6">6 Topics</option>
                  <option value="7">7 Topics</option>
                  <option value="8">8 Topics</option>
                </select>
                {!isProUser && (
                  <p className="text-xs text-gray-500">
                    Upgrade to Pro to customize course structure
                  </p>
                )}
              </div>

              <div className="space-y-3 sm:space-y-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 flex items-center">
                  Number of Quizzes
                  {!isProUser && (
                    <div className="flex items-center space-x-1 text-yellow-600 ml-2">
                      <Crown className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="text-xs font-medium">Pro+</span>
                    </div>
                  )}
                </label>
                <select
                  value={formData.numberOfQuizzes || '1'}
                  onChange={(e) => {
                    if (isProUser) {
                      setFormData({ ...formData, numberOfQuizzes: parseInt(e.target.value) });
                    }
                  }}
                  disabled={!isProUser}
                  className={`w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm sm:text-base touch-target ${
                    !isProUser ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="0">No Quizzes</option>
                  <option value="1">1 Quiz</option>
                  <option value="2">2 Quizzes</option>
                  <option value="3">3 Quizzes</option>
                  <option value="4">4 Quizzes</option>
                </select>
                {!isProUser && (
                  <p className="text-xs text-gray-500">
                    Upgrade to Pro to customize course structure
                  </p>
                )}
              </div>

              <div className="space-y-3 sm:space-y-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 flex items-center">
                  Course Duration
                  {!isProUser && (
                    <div className="flex items-center space-x-1 text-yellow-600 ml-2">
                      <Crown className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="text-xs font-medium">Pro+</span>
                    </div>
                  )}
                </label>
                <select
                  value={formData.duration || '30'}
                  onChange={(e) => {
                    if (isProUser) {
                      setFormData({ ...formData, duration: e.target.value });
                    }
                  }}
                  disabled={!isProUser}
                  className={`w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm sm:text-base touch-target ${
                    !isProUser ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="90">90 minutes</option>
                  <option value="120">2 hours</option>
                </select>
                {!isProUser && (
                  <p className="text-xs text-gray-500">
                    Upgrade to Pro to customize course structure
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2 text-sm sm:text-base">Course Preview</h4>
              <p className="text-xs sm:text-sm text-blue-700">
                Your course will have <strong>{formData.numberOfTopics || 3} main topics</strong> with{' '}
                <strong>{formData.numberOfQuizzes || 1} knowledge checks</strong> and take approximately{' '}
                <strong>{formData.duration || 30} minutes</strong> to complete.
              </p>
              {!isProUser && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Crown className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-yellow-800 font-medium">
                      Pro Feature: Upgrade to customize course structure
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );

    case 4:
      return (
        <div className="space-y-4 sm:space-y-6">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">📄 Additional Content (Optional)</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              Upload a PDF document or extract content from a website to enhance your course with additional materials.
            </p>
            
            {/* PDF Upload Section */}
            <div className="mb-6 sm:mb-8">
              <h4 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4 flex items-center">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500" />
                PDF Document Upload
              </h4>
              
              {!uploadedFile ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-8 text-center hover:border-green-500 transition-colors">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label
                    htmlFor="pdf-upload"
                    className="cursor-pointer block"
                  >
                    <Upload className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-2 sm:mb-4" />
                    <p className="text-sm sm:text-base text-gray-600 mb-1 sm:mb-2">
                      <span className="font-medium text-green-600">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500">PDF files only (max 10MB)</p>
                  </label>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="text-sm sm:text-base font-medium text-gray-900">{uploadedFile.name}</p>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={removeFile}
                      className="p-1 text-gray-400 hover:text-red-500 touch-target"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {isProcessing && (
                    <div className="mt-3 flex items-center space-x-2 text-sm text-blue-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processing PDF...</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Website Content Section */}
            <div>
              <h4 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4 flex items-center">
                <Globe className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-green-500" />
                Website Content Extraction
              </h4>
              
              {!formData.websiteContent ? (
                <div className="space-y-3 sm:space-y-4">
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
                  />
                  <button
                    onClick={handleWebsiteScraping}
                    disabled={!isValidUrl(websiteUrl) || isScrapingWebsite}
                    className={`w-full p-2 sm:p-3 rounded-lg font-medium text-sm sm:text-base touch-target ${
                      isValidUrl(websiteUrl) && !isScrapingWebsite
                        ? 'bg-green-500 hover:bg-green-600 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isScrapingWebsite ? (
                      <div className="flex items-center justify-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Extracting content...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <Link className="h-4 w-4" />
                        <span>Extract Content</span>
                      </div>
                    )}
                  </button>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4 text-green-500" />
                      <span className="text-sm sm:text-base font-medium text-gray-900">Content extracted</span>
                    </div>
                    <button
                      onClick={removeWebsiteContent}
                      className="p-1 text-gray-400 hover:text-red-500 touch-target"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Website content has been successfully extracted and will be included in your course.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
};

export default CorporateStepRenderer;
