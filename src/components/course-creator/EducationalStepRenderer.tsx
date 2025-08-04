import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, Loader2, Globe, Link, AlertCircle, Crown } from 'lucide-react';
import { processPDFWithGemini, getDefaultCoursePrompt } from '@/utils/pdfUtils';
import { extractWebsiteContent, getDefaultWebsitePrompt, isValidUrl } from '@/utils/webScrapingUtils';
import { useToast } from '@/hooks/use-toast';

interface EducationalStepRendererProps {
  step: number;
  formData: any;
  onFormDataChange: (data: any) => void;
  userId: string;
  userPlan?: string;
  creditInfo?: {
    availableCredits: number;
    totalCredits: number;
    planType: string;
  };
}

const EducationalStepRenderer: React.FC<EducationalStepRendererProps> = ({
  step,
  formData,
  onFormDataChange,
  userId,
  userPlan = 'Free',
  creditInfo
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScrapingWebsite, setIsScrapingWebsite] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const { toast } = useToast();

  const isProUser = userPlan === 'Standard' || userPlan === 'Pro' || userPlan === 'Business' || userPlan === 'Enterprise';

  // Ensure defaults for free users so Continue button works
  useEffect(() => {
    console.log('EducationalStepRenderer useEffect:', {
      isProUser,
      step,
      formData: {
        numberOfTopics: formData.numberOfTopics,
        numberOfQuizzes: formData.numberOfQuizzes,
        duration: formData.duration
      }
    });

    if (!isProUser && step === 4) {
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
        onFormDataChange(newFormData);
      }
    }
  }, [isProUser, step, formData, onFormDataChange]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!isProUser) {
      toast({
        title: "Pro Feature Required",
        description: "PDF upload is only available for Standard, Pro, Business, and Enterprise users. Please upgrade your plan to access this feature.",
        variant: "destructive",
      });
      return;
    }

    if (!creditInfo || creditInfo.availableCredits < 1) {
      toast({
        title: "Insufficient Credits",
        description: `You have ${creditInfo?.availableCredits || 0} credits available. Please purchase additional credits or wait until your credits reset.`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const prompt = getDefaultCoursePrompt(formData.courseDescription || '');
      const result = await processPDFWithGemini(file, prompt, userId);
      
      if (result.success) {
        onFormDataChange({
          ...formData,
          pdfContent: result.extractedContent,
          pdfFileName: file.name
        });
        
        toast({
          title: "PDF Processed Successfully",
          description: `Content extracted! Credits consumed: 1. Remaining: ${result.remainingCredits}`,
          variant: "default",
        });
      } else {
        toast({
          title: "PDF Processing Failed",
          description: result.error || "Failed to process PDF",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error processing PDF:', error);
      toast({
        title: "PDF Processing Error",
        description: "An error occurred while processing the PDF",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [formData, userId, onFormDataChange, toast, isProUser, creditInfo]);

  const handleWebsiteScraping = useCallback(async () => {
    if (!isValidUrl(websiteUrl)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid website URL",
        variant: "destructive",
      });
      return;
    }

    if (!creditInfo || creditInfo.availableCredits < 1) {
      toast({
        title: "Insufficient Credits",
        description: `You have ${creditInfo?.availableCredits || 0} credits available. Please purchase additional credits or wait until your credits reset.`,
        variant: "destructive",
      });
      return;
    }

    setIsScrapingWebsite(true);
    try {
      const prompt = getDefaultWebsitePrompt(formData.courseDescription || '');
      const result = await extractWebsiteContent(websiteUrl, prompt, userId);
      
      if (result.success) {
        onFormDataChange({
          ...formData,
          websiteContent: result.extractedContent,
          websiteUrl: websiteUrl
        });
        
        toast({
          title: "Website Content Extracted",
          description: `Content extracted! Credits consumed: 1. Remaining: ${result.remainingCredits}`,
          variant: "default",
        });
      } else {
        toast({
          title: "Website Scraping Failed",
          description: result.error || "Failed to extract website content",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error scraping website:', error);
      toast({
        title: "Website Scraping Error",
        description: "An error occurred while scraping the website",
        variant: "destructive",
      });
    } finally {
      setIsScrapingWebsite(false);
    }
  }, [websiteUrl, formData, userId, onFormDataChange, toast, creditInfo]);

  const removeWebsiteContent = () => {
    onFormDataChange({
      ...formData,
      websiteContent: null,
      websiteUrl: null
    });
  };

  const renderCreditInfo = () => {
    if (!creditInfo) return null;
    
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Crown className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              {creditInfo.planType} Plan
            </span>
          </div>
          <div className="text-sm text-blue-700">
            {creditInfo.availableCredits} / {creditInfo.totalCredits} credits available
          </div>
        </div>
        <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(creditInfo.availableCredits / creditInfo.totalCredits) * 100}%` }}
          ></div>
        </div>
      </div>
    );
  };

  switch (step) {
    case 1:
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">What level are you teaching?</h3>
            <RadioGroup
              value={formData.teachingLevel || ''}
              onValueChange={(value) => onFormDataChange({ ...formData, teachingLevel: value })}
              className="space-y-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="primary" id="primary" />
                <Label htmlFor="primary">Primary School</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="secondary" id="secondary" />
                <Label htmlFor="secondary">Secondary School</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="university" id="university" />
                <Label htmlFor="university">University</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="college" id="college" />
                <Label htmlFor="college">College</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="tafe" id="tafe" />
                <Label htmlFor="tafe">TAFE / Community College</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="professional" id="professional" />
                <Label htmlFor="professional">Professional Development</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      );

    case 2:
      return (
        <div className="space-y-6">
          <div>
            <Label htmlFor="courseDescription">Describe Your Course</Label>
            <Textarea
              id="courseDescription"
              placeholder="What is your course about? What will students learn?"
              value={formData.courseDescription || ''}
              onChange={(e) => onFormDataChange({ ...formData, courseDescription: e.target.value })}
              className="mt-2"
              rows={4}
            />
          </div>
        </div>
      );

    case 3:
      return (
        <div className="space-y-6">
          <div>
            <Label htmlFor="learnerDescription">Describe Your Learner</Label>
            <Textarea
              id="learnerDescription"
              placeholder="Who are your students? What's their background and experience level?"
              value={formData.learnerDescription || ''}
              onChange={(e) => onFormDataChange({ ...formData, learnerDescription: e.target.value })}
              className="mt-2"
              rows={4}
            />
          </div>
        </div>
      );

    case 4:
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold mb-4">📊 Course Structure</h3>
            <p className="text-gray-600 mb-6">
              Choose how you want your course structured. We'll automatically generate the appropriate number of sections and topics.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 flex items-center">
                  Number of Topics
                  {!isProUser && (
                    <div className="flex items-center space-x-1 text-yellow-600 ml-2">
                      <Crown className="h-4 w-4" />
                      <span className="text-xs font-medium">Pro+</span>
                    </div>
                  )}
                </label>
                <select
                  value={formData.numberOfTopics || '3'}
                  onChange={(e) => {
                    if (isProUser) {
                      onFormDataChange({ ...formData, numberOfTopics: parseInt(e.target.value) });
                    }
                  }}
                  disabled={!isProUser}
                  className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 ${
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

              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 flex items-center">
                  Number of Quizzes
                  {!isProUser && (
                    <div className="flex items-center space-x-1 text-yellow-600 ml-2">
                      <Crown className="h-4 w-4" />
                      <span className="text-xs font-medium">Pro+</span>
                    </div>
                  )}
                </label>
                <select
                  value={formData.numberOfQuizzes || '1'}
                  onChange={(e) => {
                    if (isProUser) {
                      onFormDataChange({ ...formData, numberOfQuizzes: parseInt(e.target.value) });
                    }
                  }}
                  disabled={!isProUser}
                  className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 ${
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

              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 flex items-center">
                  Course Duration
                  {!isProUser && (
                    <div className="flex items-center space-x-1 text-yellow-600 ml-2">
                      <Crown className="h-4 w-4" />
                      <span className="text-xs font-medium">Pro+</span>
                    </div>
                  )}
                </label>
                <select
                  value={formData.duration || '30'}
                  onChange={(e) => {
                    if (isProUser) {
                      onFormDataChange({ ...formData, duration: e.target.value });
                    }
                  }}
                  disabled={!isProUser}
                  className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 ${
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

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Course Preview</h4>
              <p className="text-sm text-blue-700">
                Your course will have <strong>{formData.numberOfTopics || 3} main topics</strong> with{' '}
                <strong>{formData.numberOfQuizzes || 1} knowledge checks</strong> and take approximately{' '}
                <strong>{formData.duration || 30} minutes</strong> to complete.
              </p>
              {!isProUser && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Crown className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-yellow-800 font-medium">
                      Pro Feature: Upgrade to customize course structure
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );

    case 5:
      return (
        <div className="space-y-6">
          {renderCreditInfo()}
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Additional Content (Optional)</h3>
            
            {/* PDF Upload Section */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Upload PDF Document</span>
                  {!isProUser && (
                    <div className="flex items-center space-x-1 text-yellow-600">
                      <Crown className="h-4 w-4" />
                      <span className="text-sm font-medium">Pro+</span>
                    </div>
                  )}
                </CardTitle>
                <CardDescription>
                  {isProUser 
                    ? "Upload a PDF to extract content for your course (1 credit per upload)"
                    : "PDF upload is available for Pro, Business, and Enterprise users only"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isProUser ? (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 mb-2">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        PDF files only, max 10MB
                      </p>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file);
                        }}
                        className="hidden"
                        id="pdf-upload"
                      />
                      <Button
                        onClick={() => document.getElementById('pdf-upload')?.click()}
                        disabled={isProcessing}
                        className="mt-2"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload PDF
                          </>
                        )}
                      </Button>
                    </div>
                    {formData.pdfContent && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-green-800">
                          <strong>PDF Content Extracted:</strong> {formData.pdfFileName}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-800">
                        Upgrade to Pro plan to access PDF upload functionality
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Website Scraping Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="h-5 w-5" />
                  <span>Extract Website Content</span>
                </CardTitle>
                <CardDescription>
                  Enter a website URL to extract relevant content for your course (1 credit per extraction)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="https://example.com"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleWebsiteScraping}
                      disabled={isScrapingWebsite || !websiteUrl}
                    >
                      {isScrapingWebsite ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Extracting...
                        </>
                      ) : (
                        <>
                          <Link className="h-4 w-4 mr-2" />
                          Extract
                        </>
                      )}
                    </Button>
                  </div>
                  {formData.websiteContent && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-green-800">
                          <strong>Website Content Extracted:</strong> {formData.websiteUrl}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={removeWebsiteContent}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Combined Content Preview */}
            {(formData.pdfContent || formData.websiteContent) && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Content Summary</CardTitle>
                  <CardDescription>
                    Preview of extracted content that will be used for course generation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {formData.pdfContent && (
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">PDF Content:</h4>
                        <div className="bg-gray-50 p-3 rounded text-sm text-gray-600 max-h-32 overflow-y-auto">
                          {formData.pdfContent.substring(0, 300)}...
                        </div>
                      </div>
                    )}
                    {formData.websiteContent && (
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Website Content:</h4>
                        <div className="bg-gray-50 p-3 rounded text-sm text-gray-600 max-h-32 overflow-y-auto">
                          {formData.websiteContent.substring(0, 300)}...
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      );

    default:
      return null;
  }
};

export default EducationalStepRenderer;
