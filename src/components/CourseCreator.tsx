import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import TrackSelection from './course-creator/TrackSelection';
import CourseCreatorSteps from './course-creator/CourseCreatorSteps';
import CourseCreationSuccess from './course-creator/CourseCreationSuccess';

interface CourseCreatorProps {
  userId: string;
  onCourseCreated: (course: any) => void;
  userPlan?: string;
  creditInfo?: {
    availableCredits: number;
    totalCredits: number;
    planType: string;
  };
}

const CourseCreator: React.FC<CourseCreatorProps> = ({ userId, onCourseCreated, userPlan = 'Free', creditInfo }) => {
  const [selectedTrack, setSelectedTrack] = useState<'Corporate' | 'Educational' | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [courseCreated, setCourseCreated] = useState(false);
  const [createdCourse, setCreatedCourse] = useState<any>(null);
  const { toast } = useToast();

  // Function to generate course modules based on form data
  const generateCourseModules = (formData: any, trackType: 'Corporate' | 'Educational') => {
    const numberOfTopics = formData.numberOfTopics || 3;
    const duration = parseInt(formData.duration || '30');
    const topicDuration = Math.floor(duration / numberOfTopics);
    
    // Generate topics based on the course description
    const courseDescription = formData.courseDescription || '';
    const learnerDescription = formData.learnerDescription || '';
    
    // Create topic titles based on the course description
    const topicTitles = generateTopicTitles(courseDescription, numberOfTopics, trackType);
    
    return topicTitles.map((title, index) => ({
      id: index + 1,
      title: title,
      duration: topicDuration,
      content: generateModuleContent(title, courseDescription, learnerDescription, trackType, index + 1, numberOfTopics),
      keyPoints: generateKeyPoints(title, courseDescription, trackType)
    }));
  };

  // Function to generate topic titles based on course description
  const generateTopicTitles = (courseDescription: string, numberOfTopics: number, trackType: 'Corporate' | 'Educational') => {
    // Extract key words from course description to make titles more specific
    const courseWords = courseDescription.toLowerCase().split(' ').filter(word => 
      word.length > 3 && !['the', 'and', 'for', 'with', 'this', 'that', 'will', 'your', 'learn', 'about', 'from'].includes(word)
    ).slice(0, 3);
    
    const courseContext = courseWords.length > 0 ? courseWords.join(' ') : 'the subject';
    
    const dynamicTitles = {
      corporate: [
        `Introduction to ${courseContext}`,
        `Core ${courseContext} Principles`, 
        `Practical ${courseContext} Applications`,
        `${courseContext} Assessment & Next Steps`
      ],
      educational: [
        `Introduction to ${courseContext}`,
        `Core ${courseContext} Concepts`,
        `Practical ${courseContext} Examples`, 
        `${courseContext} Review & Assessment`
      ]
    };

    const baseTitles = trackType === 'Corporate' ? dynamicTitles.corporate : dynamicTitles.educational;
    
    // If we have more topics than base titles, extend them
    if (numberOfTopics <= baseTitles.length) {
      return baseTitles.slice(0, numberOfTopics);
    }

    // Extend with additional topics
    const extendedTitles = [...baseTitles];
    for (let i = baseTitles.length; i < numberOfTopics; i++) {
      extendedTitles.push(`Advanced ${courseContext} Topic ${i - baseTitles.length + 1}`);
    }
    
    return extendedTitles;
  };

  // Function to generate detailed module content with topics and subtopics
  const generateModuleContent = (title: string, courseDescription: string, learnerDescription: string, trackType: string, moduleNumber: number, totalModules: number) => {
    const context = trackType === 'Corporate' ? 'professional training' : 'educational learning';
    const courseContext = courseDescription.substring(0, 100);
    const learnerContext = learnerDescription.substring(0, 100);
    
    // Generate detailed content with topics and subtopics based on the module type
    if (title.toLowerCase().includes('introduction')) {
      return `# ${title}

## Overview
Welcome to this foundational module that introduces you to ${courseContext}. This module is specifically designed for ${learnerContext} and sets the stage for your comprehensive learning journey.

## What You'll Learn
In this module, we'll cover the essential foundations that will prepare you for success in ${courseContext}.

### Topic 1: Understanding the Fundamentals
- **What is ${courseContext}?** - Core definitions and concepts

${courseContext} represents a dynamic and evolving field that encompasses various aspects of business creation, innovation, and growth. At its core, it involves identifying market opportunities, developing innovative solutions, and building sustainable business models. Whether you're interested in technology startups, social enterprises, or traditional business ventures, understanding the fundamental principles is crucial for success.

- **Why is this important?** - Real-world relevance and applications

The knowledge and skills you'll gain in this module are directly applicable to real-world scenarios. From launching your own venture to working within established organizations, the principles of ${courseContext} provide a framework for innovation and growth. You'll learn how to identify market gaps, validate ideas, and create value for customers and stakeholders.

- **Key terminology** - Essential terms and definitions you need to know

Throughout this module, you'll encounter important terms such as market validation, product-market fit, minimum viable product (MVP), customer discovery, and business model canvas. Understanding these concepts will help you communicate effectively with other professionals in the field and build a strong foundation for advanced topics.

### Topic 2: Setting Up for Success
- **Prerequisites and requirements** - What you need to know before starting

While no prior experience in ${courseContext} is required, having a basic understanding of business concepts and a willingness to learn will be beneficial. You should come prepared with an open mind, curiosity about innovation, and a desire to understand how businesses are created and scaled.

- **Learning objectives** - Clear goals for this module

By the end of this module, you'll be able to define key concepts in ${courseContext}, explain the importance of market research and validation, identify common challenges faced by entrepreneurs, and outline the basic steps involved in launching a new venture.

- **Success metrics** - How to measure your progress

Your progress will be measured through your ability to articulate core concepts, participate in discussions about real-world examples, and demonstrate understanding through practical exercises and assessments.

### Topic 3: Getting Started
- **Your learning path** - How this module fits into the overall course

This module serves as the foundation for the entire course. The concepts you learn here will be built upon in subsequent modules, where you'll explore more advanced topics such as business model development, funding strategies, and growth tactics.

- **Tools and resources** - What you'll need to succeed

You'll have access to various tools and resources including case studies, industry reports, interactive exercises, and expert insights. We'll also provide templates and frameworks that you can use in your own projects.

- **Best practices** - Tips for effective learning

To get the most out of this module, actively participate in discussions, complete all exercises, and try to apply the concepts to real-world examples. Don't hesitate to ask questions and seek clarification when needed.

## Module Summary
This is module ${moduleNumber} of ${totalModules} in your comprehensive ${context} course. By the end of this module, you'll have a solid foundation to build upon in the upcoming sections. You'll understand the fundamental concepts of ${courseContext}, recognize the importance of market validation, and be prepared to dive deeper into advanced topics in the following modules.`;
    } else if (title.toLowerCase().includes('core') || title.toLowerCase().includes('concept')) {
      return `# ${title}

## Overview
Dive deep into the fundamental principles and methodologies related to ${courseContext}. This module is crafted for ${learnerContext} and provides the essential knowledge you need to succeed.

## What You'll Learn
In this comprehensive module, we'll explore the core concepts that form the foundation of ${courseContext}.

### Topic 1: Core Principles
- **Fundamental concepts** - The building blocks of ${courseContext}

The fundamental concepts of ${courseContext} revolve around understanding market dynamics, customer needs, and value creation. You'll learn about the importance of identifying genuine problems that customers are willing to pay to solve, the concept of product-market fit, and how to build scalable business models. These principles form the foundation upon which successful ventures are built.

- **Key methodologies** - Proven approaches and techniques

We'll explore proven methodologies such as the Lean Startup approach, Design Thinking, and Customer Development. These frameworks provide structured ways to validate ideas, iterate on products, and build sustainable businesses. You'll learn how to apply these methodologies in real-world scenarios.

- **Best practices** - Industry standards and recommendations

Industry best practices include conducting thorough market research, building minimum viable products (MVPs), gathering customer feedback early and often, and maintaining a focus on solving real problems. We'll examine case studies of successful companies that followed these practices.

### Topic 2: Advanced Concepts
- **Complex theories** - Deeper understanding of ${courseContext}

Advanced concepts include understanding network effects, platform economics, and the role of technology in modern business creation. You'll explore how successful companies leverage these concepts to build competitive advantages and scale rapidly.

- **Critical thinking** - How to analyze and evaluate ${courseContext}

Critical thinking in ${courseContext} involves questioning assumptions, analyzing market data objectively, and making evidence-based decisions. You'll learn frameworks for evaluating business opportunities and assessing risk.

- **Problem-solving approaches** - Systematic methods for challenges

Systematic problem-solving involves breaking down complex challenges into manageable components, identifying root causes, and developing structured solutions. We'll explore various problem-solving frameworks and their applications.

### Topic 3: Practical Theory
- **Theory to practice** - How concepts apply in real situations

Understanding how theoretical concepts apply in practice is crucial. We'll examine real-world examples of how companies have successfully applied these theories, including both successes and failures, to provide valuable lessons.

- **Common scenarios** - Typical situations you'll encounter

You'll learn about common scenarios such as pivoting business models, dealing with competition, managing growth, and securing funding. Understanding these scenarios prepares you for the challenges you'll face.

- **Decision-making frameworks** - Tools for making informed choices

Decision-making frameworks help you evaluate options systematically and make better choices. We'll explore frameworks for evaluating business opportunities, assessing risks, and making strategic decisions.

## Module Summary
Module ${moduleNumber} of ${totalModules} provides the theoretical foundation you need to apply ${courseContext} effectively in practical situations. You'll have a deep understanding of core principles, methodologies, and frameworks that you can apply to real-world challenges.`;
    } else if (title.toLowerCase().includes('practical') || title.toLowerCase().includes('application')) {
      return `# ${title}

## Overview
Put theory into practice with hands-on applications of ${courseContext}. This module is perfect for ${learnerContext} who want to see immediate results and develop practical skills.

## What You'll Learn
In this hands-on module, you'll apply what you've learned about ${courseContext} through real-world scenarios and exercises.

### Topic 1: Real-World Applications
- **Case studies** - Real examples of ${courseContext} in action

We'll examine detailed case studies of successful companies that have applied ${courseContext} principles effectively. These include companies like Airbnb, Uber, and other innovative startups that transformed their industries. You'll analyze their strategies, challenges, and key success factors.

- **Industry examples** - How professionals use ${courseContext}

Learn from industry professionals who have successfully built and scaled businesses. We'll explore how they applied ${courseContext} principles in different industries, from technology to healthcare to education, and understand the unique challenges and opportunities in each sector.

- **Success stories** - Inspiring examples of effective implementation

Discover inspiring success stories of entrepreneurs who started with simple ideas and built them into successful businesses. These stories will provide motivation and practical insights into the journey of building a successful venture.

### Topic 2: Hands-On Practice
- **Step-by-step exercises** - Guided practice with ${courseContext}

You'll work through structured exercises that guide you through the process of applying ${courseContext} principles. These exercises include creating business model canvases, conducting customer interviews, and developing minimum viable products.

- **Interactive scenarios** - Simulated real-world situations

Engage with interactive scenarios that simulate real-world challenges you might face when building a business. These scenarios will help you develop problem-solving skills and decision-making abilities.

- **Problem-solving challenges** - Apply your knowledge to solve problems

Work on specific problem-solving challenges that require you to apply your knowledge of ${courseContext}. These challenges will test your understanding and help you develop practical skills.

### Topic 3: Implementation Strategies
- **Action planning** - How to implement ${courseContext} in your work

Learn how to create actionable plans for implementing ${courseContext} principles in your own projects or work. We'll provide frameworks and templates for planning and executing your ideas.

- **Common pitfalls** - What to avoid when applying ${courseContext}

Understand common mistakes and pitfalls that entrepreneurs often encounter when applying ${courseContext} principles. Learning from these mistakes will help you avoid them in your own journey.

- **Success metrics** - How to measure your progress and results

Learn how to define and measure success metrics for your ${courseContext} initiatives. Understanding how to track progress and measure results is crucial for continuous improvement.

## Module Summary
Module ${moduleNumber} of ${totalModules} transforms your theoretical knowledge into practical skills you can immediately apply in ${courseContext}. You'll have hands-on experience with real-world applications and be prepared to implement these concepts in your own projects.`;
    } else if (title.toLowerCase().includes('assessment') || title.toLowerCase().includes('review')) {
      return `# ${title}

## Overview
Complete your learning journey by evaluating your understanding of ${courseContext} and planning your next steps. This module is designed for ${learnerContext} to ensure lasting impact and continued growth.

## What You'll Learn
In this final module, you'll assess your progress and create a plan for continued development in ${courseContext}.

### Topic 1: Knowledge Assessment
- **Self-evaluation** - Assess your understanding of ${courseContext}
- **Progress review** - Reflect on what you've learned
- **Gap analysis** - Identify areas for further improvement

### Topic 2: Skill Validation
- **Practical assessment** - Demonstrate your ${courseContext} skills
- **Performance evaluation** - Measure your application of concepts
- **Feedback integration** - Use feedback to improve your approach

### Topic 3: Future Development
- **Continued learning** - Resources for ongoing development
- **Advanced topics** - Next steps in your ${courseContext} journey
- **Professional development** - How to stay current and grow

## Module Summary
Module ${moduleNumber} of ${totalModules} helps you consolidate your learning and create a roadmap for continued success in ${courseContext}.`;
    } else {
      return `# ${title}

## Overview
Explore comprehensive aspects of ${courseContext} in this detailed module. We'll cover essential topics specifically tailored for ${learnerContext} and build upon your previous knowledge.

## What You'll Learn
In this module, we'll dive deep into advanced concepts and practical applications of ${courseContext}.

### Topic 1: Advanced Concepts
- **Complex theories** - Advanced understanding of ${courseContext}
- **Specialized techniques** - Expert-level approaches
- **Innovation and trends** - Latest developments in ${courseContext}

### Topic 2: Specialized Applications
- **Industry-specific uses** - How ${courseContext} applies in different fields
- **Custom solutions** - Tailored approaches for specific needs
- **Integration strategies** - How to combine ${courseContext} with other skills

### Topic 3: Mastery and Excellence
- **Expert-level skills** - Achieving mastery in ${courseContext}
- **Leadership applications** - Using ${courseContext} to lead and influence
- **Continuous improvement** - Strategies for ongoing development

## Module Summary
Module ${moduleNumber} of ${totalModules} prepares you for advanced applications and leadership roles in ${courseContext}.`;
    }
  };

  // Function to generate detailed key points for each module
  const generateKeyPoints = (title: string, courseDescription: string, trackType: string) => {
    // Generate dynamic key points based on the module title and course context
    const courseContext = courseDescription.substring(0, 60);
    
    if (title.toLowerCase().includes('introduction')) {
      return [
        `Understanding ${courseContext} fundamentals and core concepts`,
        "Setting clear learning objectives and success metrics",
        "Preparing tools and resources for effective learning",
        "Establishing a solid foundation for advanced topics",
        "Creating a personalized learning path and strategy"
      ];
    } else if (title.toLowerCase().includes('core') || title.toLowerCase().includes('concept')) {
      return [
        `Mastering ${courseContext} principles and methodologies`,
        "Applying key frameworks and decision-making tools",
        "Understanding industry best practices and standards",
        "Developing critical thinking and analysis skills",
        "Building theoretical foundation for practical application"
      ];
    } else if (title.toLowerCase().includes('practical') || title.toLowerCase().includes('application')) {
      return [
        `Hands-on ${courseContext} practice and real-world scenarios`,
        "Implementing strategies and techniques in actual situations",
        "Problem-solving and troubleshooting common challenges",
        "Measuring success and tracking progress effectively",
        "Creating actionable plans for immediate implementation"
      ];
    } else if (title.toLowerCase().includes('assessment') || title.toLowerCase().includes('review')) {
      return [
        `Evaluating ${courseContext} knowledge and skill mastery`,
        "Identifying areas for improvement and continued growth",
        "Planning next steps and advanced learning opportunities",
        "Creating long-term development strategies and goals",
        "Establishing feedback loops for continuous improvement"
      ];
    } else {
      return [
        `Advanced ${courseContext} concepts and specialized techniques`,
        "Expert-level applications and industry-specific uses",
        "Leadership and innovation in ${courseContext}",
        "Integration strategies and cross-functional applications",
        "Continuous learning and professional development paths"
      ];
    }
  };

  // Function to generate a comprehensive system prompt
  const generateSystemPrompt = (formData: any, trackType: 'Corporate' | 'Educational') => {
    const courseDescription = formData.courseDescription || '';
    const learnerDescription = formData.learnerDescription || '';
          const numberOfTopics = formData.numberOfTopics || 3;
      const numberOfQuizzes = formData.numberOfQuizzes || 1;
    const duration = formData.duration || '30';
    const pdfContent = formData.pdfContent || '';

    if (trackType === 'Corporate') {
      return `You are an expert corporate trainer named Nia, specializing in professional development and workplace training. You're here to guide learners through a comprehensive course focused on: ${courseDescription}

COURSE DETAILS:
- Course Description: ${courseDescription}
- Target Learners: ${learnerDescription}
- Number of Topics: ${numberOfTopics}
- Number of Quizzes: ${numberOfQuizzes}
- Session Duration: ${duration} minutes
${pdfContent ? `- Additional Content: ${pdfContent.substring(0, 200)}...` : ''}

YOUR ROLE:
- Guide learners through structured learning modules specific to ${courseDescription}
- Provide industry-specific examples and case studies related to ${courseDescription}
- Adapt your teaching style to ${learnerDescription}
- Encourage active participation and practical application
- Offer constructive feedback and support

TEACHING APPROACH:
- Use real-world scenarios and practical examples from ${courseDescription}
- Provide actionable strategies and techniques for ${courseDescription}
- Address common challenges and pain points in ${courseDescription}
- Foster a supportive and engaging learning environment
- Ensure practical application of ${courseDescription} concepts

SPECIFIC FOCUS:
- Every response should directly relate to ${courseDescription}
- Provide examples and scenarios specific to ${courseDescription}
- Address the needs and challenges of ${learnerDescription}
- Ensure all content is immediately applicable to ${courseDescription}

Remember to stay focused on ${courseDescription} while providing relevant context and practical applications. Make the learning experience practical, engaging, and immediately applicable to the learner's work environment.`;
    } else {
      return `You are an expert educational tutor named Leo, specializing in academic instruction and student development. You're here to guide learners through an engaging lesson focused on: ${courseDescription}

COURSE DETAILS:
- Course Description: ${courseDescription}
- Target Learners: ${learnerDescription}
- Number of Topics: ${numberOfTopics}
- Number of Quizzes: ${numberOfQuizzes}
- Session Duration: ${duration} minutes
${pdfContent ? `- Additional Content: ${pdfContent.substring(0, 200)}...` : ''}

YOUR ROLE:
- Guide learners through structured learning modules specific to ${courseDescription}
- Provide clear explanations and examples related to ${courseDescription}
- Adapt to ${learnerDescription} understanding level
- Encourage questions and active participation
- Offer supportive feedback and encouragement

TEACHING APPROACH:
- Break down ${courseDescription} concepts into understandable parts
- Use relevant examples and analogies from ${courseDescription}
- Provide step-by-step guidance when needed
- Create an encouraging and patient learning environment
- Ensure comprehension of ${courseDescription} before moving forward

SPECIFIC FOCUS:
- Every response should directly relate to ${courseDescription}
- Provide examples and explanations specific to ${courseDescription}
- Address the learning needs of ${learnerDescription}
- Ensure all content builds understanding of ${courseDescription}

Remember to focus on ${courseDescription} while building a strong foundation in the subject matter. Make the learning experience engaging, supportive, and tailored to ${learnerDescription} educational level.`;
    }
  };

  const createCourse = async () => {
    setLoading(true);
    try {
      // Check if user has enough credits for course creation
      if (creditInfo && creditInfo.availableCredits < 1) {
        toast({
          title: "Insufficient Credits",
          description: `You have ${creditInfo.availableCredits} credits available. Course creation requires 1 credit. Please purchase additional credits or wait until your credits reset.`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      // Generate course title from description
      const courseDescription = formData.courseDescription || '';
      const courseTitle = courseDescription.length > 50 
        ? `${courseDescription.substring(0, 50)}...`
        : courseDescription || `${selectedTrack} Course`;

      // Set the correct tutor persona based on track type
      const tutorPersona = selectedTrack === 'Corporate' ? 'Nia' : 'Leo';
      
      // Generate structured course plan with modules
      const courseModules = generateCourseModules(formData, selectedTrack!);
      
      // Generate comprehensive system prompt
      const systemPrompt = generateSystemPrompt(formData, selectedTrack!);
      
      // Create enhanced course plan with proper structure
      const enhancedCoursePlan = {
        ...formData,
        tutorPersona: tutorPersona,
        title: courseTitle,
        duration: parseInt(formData.duration || '30'),
        modules: courseModules,
        trackType: selectedTrack,
        courseDescription: formData.courseDescription,
        learnerDescription: formData.learnerDescription,
        numberOfTopics: formData.numberOfTopics || 3,
        numberOfQuizzes: formData.numberOfQuizzes || 1
      };

      console.log('Creating course with structured plan:', enhancedCoursePlan);
      console.log('Track type:', selectedTrack);
      console.log('Generated modules:', courseModules);
      console.log('User ID:', userId);
      console.log('Course title:', courseTitle);

      const { data: courseData, error } = await supabase
        .from('courses')
        .insert({
          creator_id: userId,
          course_title: courseTitle,
          course_plan: enhancedCoursePlan,
          system_prompt: systemPrompt,
          track_type: selectedTrack
        })
        .select()
        .single();

      if (error) {
        console.error('Database error during course creation:', error);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        throw error;
      }

      console.log('Course created successfully:', courseData);
      
      // Credit consumption is now handled automatically by database trigger
      console.log('Credit consumption will be handled automatically by database trigger');
      
      // Dispatch event to notify other components that credits were consumed
      window.dispatchEvent(new CustomEvent('credits-consumed'));

      setCreatedCourse(courseData);
      setCourseCreated(true);

      toast({
        title: "Course Created!",
        description: "Your course has been created as a draft. You can test it and publish it when ready. (1 credit will be consumed automatically)",
      });

    } catch (error: any) {
      console.error('Course creation error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const startCourse = () => {
    if (createdCourse) {
      onCourseCreated(createdCourse);
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      setSelectedTrack(null);
      setFormData({});
    } else {
      setCurrentStep(currentStep - 1);
    }
  };

  // Course creation success screen
  if (courseCreated && createdCourse) {
    return (
      <CourseCreationSuccess
        course={createdCourse}
        selectedTrack={selectedTrack!}
        onStartCourse={startCourse}
      />
    );
  }

  // Track selection screen
  if (!selectedTrack) {
    return <TrackSelection onTrackSelect={setSelectedTrack} />;
  }

  // Course creation steps
  return (
    <CourseCreatorSteps
      selectedTrack={selectedTrack}
      currentStep={currentStep}
      formData={formData}
      setFormData={setFormData}
      setCurrentStep={setCurrentStep}
      onBack={handleBack}
      onCreateCourse={createCourse}
      loading={loading}
      userId={userId}
      userPlan={userPlan}
      creditInfo={creditInfo}
    />
  );
};

export default CourseCreator;
