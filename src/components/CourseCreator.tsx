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
  const generateCourseModules = async (formData: any, trackType: 'Corporate' | 'Educational') => {
    const numberOfTopics = formData.numberOfTopics || 3;
    const topicDuration = 0;
    
    // Generate topics based on the course description
    const courseDescription = formData.courseDescription || '';
    const learnerDescription = formData.learnerDescription || '';
    
    // Create topic titles based on the course description
    const topicTitles = generateTopicTitles(courseDescription, numberOfTopics, trackType);
    
    // Pre-pass all module titles to AI to improve uniqueness
    const allTitles = [...topicTitles];
    
    // Generate content for each module asynchronously
    const modules = [];
    for (let i = 0; i < topicTitles.length; i++) {
      const title = topicTitles[i];
      const content = await generateModuleContent(title, courseDescription, learnerDescription, trackType, i + 1, numberOfTopics, allTitles);
      
      modules.push({
        id: i + 1,
      title: title,
      duration: topicDuration,
        content: content,
      keyPoints: generateKeyPoints(title, courseDescription, trackType)
      });
    }
    
    return modules;
  };

  // Function to generate topic titles based on course description
  const generateTopicTitles = (courseDescription: string, numberOfTopics: number, trackType: 'Corporate' | 'Educational') => {
    // Clean up course description to extract the actual topic
    const cleanCourseDescription = (desc: string) => {
      if (!desc) return 'the subject';
      
      // Remove common prompt phrases and course creation language
      let cleaned = desc.toLowerCase()
        .replace(/create\s+a\s+course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/create\s+course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/make\s+a\s+course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/make\s+course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/build\s+a\s+course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/build\s+course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/develop\s+a\s+course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/develop\s+course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/create\s+a\s+course/gi, '')
        .replace(/create\s+course/gi, '')
        .replace(/make\s+a\s+course/gi, '')
        .replace(/make\s+course/gi, '')
        .replace(/build\s+a\s+course/gi, '')
        .replace(/build\s+course/gi, '')
        .replace(/develop\s+a\s+course/gi, '')
        .replace(/develop\s+course/gi, '')
        .replace(/course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/training\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/learning\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/about\s+/gi, '')
        .replace(/regarding\s+/gi, '')
        .replace(/concerning\s+/gi, '')
        .replace(/in\s+/gi, '')
        .replace(/the\s+/gi, '')
        .trim();
      
      // Remove any remaining course-related words
      const courseWords = ['course', 'training', 'learning', 'lesson', 'module', 'class', 'workshop', 'seminar'];
      courseWords.forEach(word => {
        cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
      });
      
      // Clean up extra spaces and normalize
      cleaned = cleaned.replace(/\s+/g, ' ').trim();
      
      // If we end up with nothing meaningful, return a default
      if (!cleaned || cleaned.length < 2) {
        return 'the subject';
      }
      
      return cleaned;
    };
    
        // Extract key words from cleaned course description to make titles more specific
    const cleanedDescription = cleanCourseDescription(courseDescription);
    
    // Helper function to capitalize each word in a phrase
    const capitalizeWords = (phrase: string) => {
      return phrase.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    };
    
    // Improved topic generation based on the cleaned description
    const generateSpecificTopics = (description: string, trackType: string, count: number) => {
      // Split into words and preserve more context
      const words = description.toLowerCase().split(' ').filter(word => 
        word.length > 2 && !['the', 'and', 'for', 'with', 'this', 'that', 'will', 'your', 'learn', 'about', 'from', 'how', 'what', 'when', 'where', 'why'].includes(word)
      );
      
      // Create a more descriptive topic by combining words
      let mainTopic = '';
      if (words.length >= 2) {
        // Combine first two words for better context
        mainTopic = `${words[0]} ${words[1]}`;
      } else if (words.length === 1) {
        mainTopic = words[0];
      } else {
        mainTopic = 'subject';
      }
      
      const capitalizedTopic = capitalizeWords(mainTopic);
        
        // Create more specific and contextual topics
        const specificTopics = {
      corporate: [
            `Introduction to ${capitalizedTopic}`,
            `Core ${capitalizedTopic} Principles`,
            `Practical ${capitalizedTopic} Applications`,
            `${capitalizedTopic} Best Practices`,
            `${capitalizedTopic} Implementation`,
            `${capitalizedTopic} Assessment & Next Steps`
      ],
      educational: [
            `Introduction to ${capitalizedTopic}`,
            `Core ${capitalizedTopic} Concepts`,
            `Practical ${capitalizedTopic} Examples`,
            `${capitalizedTopic} Fundamentals`,
            `${capitalizedTopic} Advanced Topics`,
            `${capitalizedTopic} Review & Assessment`
          ]
        };
      
      const baseTopics = specificTopics[trackType.toLowerCase() as keyof typeof specificTopics] || specificTopics.educational;
      
      // Return the requested number of topics
      return baseTopics.slice(0, count);
    };
    
    const dynamicTitles = generateSpecificTopics(cleanedDescription, trackType, numberOfTopics);
    
    // If we need more topics than generated, extend them
    if (numberOfTopics > dynamicTitles.length) {
      const words = cleanedDescription.toLowerCase().split(' ').filter(word => 
        word.length > 2 && !['the', 'and', 'for', 'with', 'this', 'that', 'will', 'your', 'learn', 'about', 'from', 'how', 'what', 'when', 'where', 'why'].includes(word)
      );
      
      let mainTopic = '';
      if (words.length >= 2) {
        mainTopic = `${words[0]} ${words[1]}`;
      } else if (words.length === 1) {
        mainTopic = words[0];
      } else {
        mainTopic = 'subject';
      }
      
              const capitalizedTopic = capitalizeWords(mainTopic);
        const extendedTitles = [...dynamicTitles];
        for (let i = dynamicTitles.length; i < numberOfTopics; i++) {
          extendedTitles.push(`Advanced ${capitalizedTopic} Topic ${i - dynamicTitles.length + 1}`);
        }
    return extendedTitles;
    }
    
    return dynamicTitles;
  };

  // Function to generate detailed module content with topics and subtopics
  // Function to generate AI-powered unique content using Groq API
  const generateAIContent = async (moduleType: string, courseSubject: string, trackType: string, moduleNumber: number, totalModules: number, moduleTitle: string, moduleTitles: string[]): Promise<string> => {
    try {
      console.log(`Calling AI service for ${moduleType} module about ${courseSubject}`);
      
      const response = await supabase.functions.invoke('generate-course-content', {
        body: {
          prompt: `Generate unique course content for ${moduleType} module about ${courseSubject}`,
          moduleType,
          courseSubject,
          trackType,
          moduleNumber,
          totalModules,
          moduleTitle,
          moduleTitles
        }
      });

      console.log('AI service response:', response);

      if (response.error) {
        console.error('AI service error:', response.error);
        throw new Error(response.error.message);
      }

      if (!response.data || !response.data.content) {
        console.error('No content received from AI service');
        throw new Error('No content received from AI service');
      }

      console.log(`AI content received, length: ${response.data.content.length}`);
      return response.data.content;
    } catch (error) {
      console.error('Error generating AI content:', error);
      // Fallback to template content if AI generation fails
      return '';
    }
  };

  const generateModuleContent = async (title: string, courseDescription: string, learnerDescription: string, trackType: string, moduleNumber: number, totalModules: number, allModuleTitles?: string[]) => {
    const context = trackType === 'Corporate' ? 'professional training' : 'educational learning';
    
    // Clean up course description to extract the actual topic
    const cleanCourseDescription = (desc: string) => {
      if (!desc) return 'the subject';
      
      // Remove common prompt phrases and course creation language
      let cleaned = desc.toLowerCase()
        .replace(/create\s+a\s+course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/create\s+course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/make\s+a\s+course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/make\s+course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/build\s+a\s+course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/build\s+course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/develop\s+a\s+course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/develop\s+course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/create\s+a\s+course/gi, '')
        .replace(/create\s+course/gi, '')
        .replace(/make\s+a\s+course/gi, '')
        .replace(/make\s+course/gi, '')
        .replace(/build\s+a\s+course/gi, '')
        .replace(/build\s+course/gi, '')
        .replace(/develop\s+a\s+course/gi, '')
        .replace(/develop\s+course/gi, '')
        .replace(/course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/training\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/learning\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/about\s+/gi, '')
        .replace(/regarding\s+/gi, '')
        .replace(/concerning\s+/gi, '')
        .replace(/in\s+/gi, '')
        .replace(/the\s+/gi, '')
        .trim();
      
      // Remove any remaining course-related words
      const courseWords = ['course', 'training', 'learning', 'lesson', 'module', 'class', 'workshop', 'seminar'];
      courseWords.forEach(word => {
        cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
      });
      
      // Clean up extra spaces and normalize
      cleaned = cleaned.replace(/\s+/g, ' ').trim();
      
      // If we end up with nothing meaningful, return a default
      if (!cleaned || cleaned.length < 2) {
        return 'the subject';
      }
      
      return cleaned;
    };
    
    const courseContext = cleanCourseDescription(courseDescription);
    const learnerContext = learnerDescription.substring(0, 100);
    
    // Generate topic-specific content based on the course subject
    const generateTopicSpecificContent = (topic: string, courseSubject: string, trackType: string) => {
      const subject = courseSubject.toLowerCase();
      
      // Define topic-specific content based on common course subjects
      const contentMap: { [key: string]: { [key: string]: string } } = {
                 'digital marketing': {
           'introduction': `Digital marketing encompasses all marketing efforts that use electronic devices or the internet. This includes search engines, social media, email, websites, and other digital channels to connect with current and prospective customers. In today's digital-first world, understanding digital marketing is essential for any business looking to grow and compete effectively.

Digital marketing differs from traditional marketing in its ability to target specific audiences, measure results in real-time, and adjust strategies quickly based on data. Whether you're promoting a product, service, or brand, digital marketing offers unprecedented opportunities to reach your target audience with precision and efficiency.

The digital marketing landscape is constantly evolving with new platforms, technologies, and consumer behaviors emerging regularly. This makes it both exciting and challenging for marketers who need to stay current with trends while maintaining effective, data-driven strategies.`,
           
           'fundamentals': `The core principles of digital marketing include understanding your audience, creating valuable content, and measuring performance. Key concepts include search engine optimization (SEO), content marketing, social media marketing, email marketing, and paid advertising.

Digital marketing success relies heavily on data and analytics. Understanding key metrics like conversion rates, click-through rates, engagement rates, and return on ad spend (ROAS) is crucial for optimizing campaigns and demonstrating value to stakeholders.

The customer journey in digital marketing typically follows the AIDA model: Awareness, Interest, Desire, and Action. Each stage requires different strategies and content types to effectively guide prospects toward conversion.

Critical thinking in digital marketing involves several specific frameworks:

1. **Customer Persona Framework**: Develop detailed profiles of your ideal customers including demographics, psychographics, pain points, and buying behaviors to create targeted campaigns.

2. **Customer Journey Mapping**: Map out the complete customer experience from first awareness to post-purchase, identifying touchpoints and opportunities for engagement.

3. **A/B Testing Framework**: Systematically test different versions of campaigns, landing pages, and content to optimize performance based on data.

4. **ROI Analysis Framework**: Calculate return on investment for each marketing channel using metrics like customer acquisition cost (CAC), lifetime value (LTV), and conversion rates.

5. **Content Strategy Framework**: Plan content creation using the 4-1-1 rule (4 educational pieces, 1 soft sell, 1 hard sell) and editorial calendars.

6. **Channel Attribution Framework**: Understand which marketing channels contribute to conversions using attribution models like first-touch, last-touch, or multi-touch attribution.

Each framework provides specific methodologies and metrics to evaluate marketing effectiveness and make data-driven decisions.`,
           
           'practical': `Real-world digital marketing applications include creating comprehensive marketing campaigns that span multiple channels. This involves developing content strategies, managing social media presence, running paid advertising campaigns, and analyzing performance data to optimize results.

Common digital marketing tools include Google Analytics for website tracking, social media management platforms like Hootsuite or Buffer, email marketing services like Mailchimp, and advertising platforms like Google Ads and Facebook Ads. Understanding how to use these tools effectively is essential for success.

Digital marketing challenges include staying current with algorithm changes, managing multiple campaigns across platforms, and demonstrating ROI to stakeholders. Successful digital marketers develop systems for staying organized, measuring results, and continuously learning about new trends and technologies.

Specific practical applications include:

1. **SEO Implementation Process**:
   - Keyword research using tools like Google Keyword Planner and SEMrush
   - On-page optimization (title tags, meta descriptions, header structure)
   - Technical SEO (site speed, mobile optimization, XML sitemaps)
   - Link building strategies and outreach campaigns

2. **Social Media Management**:
   - Content calendar creation and scheduling
   - Platform-specific content optimization (Instagram vs LinkedIn)
   - Community management and engagement strategies
   - Social media advertising and targeting

3. **Email Marketing Campaigns**:
   - List segmentation and personalization
   - Email sequence design (welcome series, nurture campaigns)
   - A/B testing subject lines and content
   - Automation workflows and trigger emails

4. **Paid Advertising Management**:
   - Campaign structure and ad group organization
   - Keyword research and negative keyword management
   - Ad copy creation and testing
   - Bid management and budget optimization

5. **Analytics and Reporting**:
   - Google Analytics setup and goal tracking
   - Custom dashboard creation
   - Regular reporting and KPI monitoring
   - Data-driven optimization recommendations`
         },
        
                 'stock market': {
           'introduction': `The stock market is a complex financial system where shares of publicly traded companies are bought and sold. Understanding how the stock market works is essential for anyone interested in investing, whether for personal financial growth or as part of a broader investment strategy.

Stock markets serve as a crucial component of the global economy, providing companies with access to capital for growth and expansion while offering investors opportunities to participate in business success. The market operates on principles of supply and demand, with prices reflecting investors' collective assessment of a company's value and future prospects.

Investing in stocks involves understanding fundamental concepts like market capitalization, price-to-earnings ratios, dividends, and market volatility. Successful investing requires a combination of fundamental analysis, technical analysis, and emotional discipline to make informed decisions in an often unpredictable market environment.`,
           
           'fundamentals': `Core stock market concepts include understanding how stocks represent ownership in companies, how markets function through exchanges and electronic trading systems, and how various factors influence stock prices. Key principles include diversification, risk management, and long-term thinking.

Market analysis involves both fundamental analysis (examining company financials, industry trends, and economic factors) and technical analysis (studying price patterns and market indicators). Successful investors develop their own approach that combines these methods with their risk tolerance and investment goals.

Important stock market terminology includes terms like bull and bear markets, market capitalization, dividends, earnings per share (EPS), and various order types. Understanding these terms is essential for effective communication and decision-making in the investment world.

Critical thinking in stock market investing involves several specific frameworks:

1. **SWOT Analysis Framework**: Evaluate companies using Strengths, Weaknesses, Opportunities, and Threats analysis to assess competitive position and growth potential.

2. **Risk-Reward Ratio Framework**: Calculate potential gains versus potential losses for each investment, typically aiming for a 2:1 or 3:1 reward-to-risk ratio.

3. **Diversification Framework**: Spread investments across different sectors, company sizes, and geographic regions to reduce portfolio risk.

4. **Valuation Framework**: Use multiple valuation methods including P/E ratios, price-to-book ratios, discounted cash flow analysis, and dividend yield comparisons.

5. **Market Timing Framework**: Consider economic cycles, interest rate trends, and market sentiment indicators to optimize entry and exit points.

6. **Behavioral Finance Framework**: Recognize and avoid common biases like confirmation bias, herd mentality, and loss aversion that can cloud investment judgment.

Each framework provides specific criteria and metrics to evaluate investment opportunities systematically rather than relying on emotions or guesswork.`,
           
           'practical': `Practical stock market applications include developing investment strategies, conducting company research, and managing investment portfolios. This involves learning how to read financial statements, analyze market trends, and make informed buy/sell decisions.

Common investment tools include online brokerage platforms, financial analysis software, and market research resources. Understanding how to use these tools effectively can significantly improve investment decision-making and portfolio performance.

Stock market challenges include managing emotional responses to market volatility, avoiding common behavioral biases, and maintaining discipline during market downturns. Successful investors develop systems for research, decision-making, and portfolio management that help them stay focused on long-term goals.

Specific practical applications include:

1. **Company Research Process**: 
   - Read quarterly earnings reports and annual filings (10-K, 10-Q)
   - Analyze financial ratios (current ratio, debt-to-equity, return on equity)
   - Review management team track record and company competitive advantages
   - Assess industry trends and market position

2. **Portfolio Management Techniques**:
   - Asset allocation strategies (60/40 stocks/bonds, age-based allocation)
   - Rebalancing schedules (quarterly or annually)
   - Dollar-cost averaging for regular investments
   - Stop-loss orders for risk management

3. **Risk Assessment Methods**:
   - Beta calculation for volatility measurement
   - Maximum drawdown analysis
   - Correlation analysis between holdings
   - Stress testing portfolio under different market scenarios

4. **Market Analysis Tools**:
   - Technical indicators (moving averages, RSI, MACD)
   - Fundamental analysis metrics (P/E, P/B, PEG ratios)
   - Economic indicators (GDP growth, interest rates, inflation)
   - Sentiment indicators (VIX fear index, put/call ratios)`
         },
        
                 'leadership': {
           'introduction': `Leadership is the ability to influence, guide, and inspire others toward achieving common goals. Effective leadership involves more than just managing tasks; it requires understanding human behavior, building relationships, and creating environments where people can thrive and perform at their best.

Leadership exists at all levels of an organization, from frontline supervisors to C-suite executives. While formal authority can help, true leadership comes from earning respect, building trust, and demonstrating competence and character. Great leaders understand that their success is measured by the success of their team and organization.

The modern leadership landscape is evolving rapidly, with increasing emphasis on emotional intelligence, adaptability, and the ability to lead diverse teams in complex, changing environments. Today's leaders must balance traditional management skills with new approaches that foster innovation, collaboration, and continuous learning.`,
           
           'fundamentals': `Core leadership principles include leading by example, communicating effectively, making sound decisions, and developing others. Successful leaders understand that leadership is not about being the smartest person in the room, but about creating an environment where the best ideas can emerge and be implemented.

Leadership styles vary from autocratic to democratic to laissez-faire, with the most effective leaders adapting their style to the situation and the people they're leading. Understanding different leadership approaches and when to use them is crucial for success.

Key leadership competencies include strategic thinking, emotional intelligence, conflict resolution, and change management. Leaders must also understand organizational dynamics, team development stages, and how to create cultures that support high performance and innovation.

Critical thinking in leadership involves several specific frameworks:

1. **Situational Leadership Framework**: Adapt leadership style based on team member competence and commitment levels using the Hersey-Blanchard model.

2. **Decision-Making Framework**: Use structured approaches like the Vroom-Yetton model to determine when to make decisions alone, consult, or involve the team.

3. **Conflict Resolution Framework**: Apply the Thomas-Kilmann Conflict Mode Instrument to understand different conflict resolution styles and when to use each.

4. **Change Management Framework**: Implement Kotter's 8-Step Change Model to guide organizational transformations effectively.

5. **Performance Management Framework**: Use the GROW model (Goals, Reality, Options, Way Forward) for coaching conversations and performance improvement.

6. **Strategic Thinking Framework**: Apply SWOT analysis, Porter's Five Forces, and scenario planning to develop strategic direction and competitive advantage.

Each framework provides specific methodologies and tools to address common leadership challenges systematically.`,
           
           'practical': `Practical leadership applications include managing teams, leading projects, and driving organizational change. This involves developing skills in coaching, mentoring, performance management, and strategic planning.

Common leadership challenges include managing difficult conversations, balancing competing priorities, and maintaining team morale during challenging times. Successful leaders develop frameworks and approaches for handling these situations effectively.

Leadership development involves continuous learning and self-reflection. This includes seeking feedback, learning from mistakes, and staying current with leadership research and best practices. The most effective leaders are those who view leadership as a journey of continuous improvement rather than a destination.

Specific practical applications include:

1. **Team Building and Management**:
   - Conducting team assessments using tools like DISC or Myers-Briggs
   - Creating team charters and establishing clear roles and responsibilities
   - Implementing regular team meetings and one-on-one check-ins
   - Building psychological safety and trust within teams

2. **Performance Management**:
   - Setting SMART goals and key performance indicators (KPIs)
   - Conducting regular performance reviews and feedback sessions
   - Creating individual development plans and career paths
   - Implementing recognition and reward systems

3. **Communication and Influence**:
   - Developing communication plans for different stakeholders
   - Mastering difficult conversations using frameworks like SBI (Situation, Behavior, Impact)
   - Building influence through relationship development and networking
   - Creating compelling presentations and storytelling techniques

4. **Change Management**:
   - Assessing organizational readiness for change
   - Creating change communication strategies
   - Managing resistance and building buy-in
   - Monitoring change progress and adjusting strategies

5. **Strategic Planning and Execution**:
   - Conducting environmental scans and competitive analysis
   - Developing strategic plans with clear objectives and timelines
   - Creating implementation roadmaps and project plans
   - Monitoring progress and making strategic adjustments

6. **Crisis Management**:
   - Developing crisis response protocols and communication plans
   - Leading teams through uncertainty and high-pressure situations
   - Making quick decisions with limited information
   - Maintaining team morale and focus during challenging times`
         },
        
                 'programming': {
           'introduction': `Programming is the process of creating instructions for computers to execute specific tasks. It involves writing code using programming languages to solve problems, automate processes, and create software applications that serve various purposes in our digital world.

Programming is both an art and a science, requiring logical thinking, creativity, and attention to detail. Whether you're building websites, mobile apps, data analysis tools, or complex software systems, programming provides the foundation for creating technology solutions that can transform how we work and live.

The programming landscape is diverse, with different languages and technologies suited for different purposes. From web development with HTML, CSS, and JavaScript to data science with Python and R, to mobile development with Swift and Kotlin, understanding the right tools for your goals is essential for success.`,
           
           'fundamentals': `Core programming concepts include variables, data types, control structures (loops and conditionals), functions, and object-oriented programming principles. Understanding these fundamentals is crucial regardless of which programming language you choose to learn.

Programming logic involves breaking down complex problems into smaller, manageable components and designing algorithms to solve them. This requires systematic thinking, pattern recognition, and the ability to anticipate and handle edge cases.

Important programming practices include writing clean, readable code, using version control systems like Git, testing your code thoroughly, and documenting your work. These practices are essential for creating maintainable, scalable software that can be understood and modified by others.

Critical thinking in programming involves several specific frameworks:

1. **Problem Decomposition Framework**: Break complex problems into smaller, manageable sub-problems using techniques like divide-and-conquer and stepwise refinement.

2. **Algorithm Design Framework**: Use systematic approaches like pseudocode development, flowcharts, and design patterns to plan solutions before coding.

3. **Debugging Framework**: Apply systematic debugging techniques including binary search debugging, logging, and unit testing to identify and fix issues.

4. **Code Review Framework**: Use checklists covering readability, efficiency, security, and maintainability to evaluate code quality.

5. **Testing Framework**: Implement different testing strategies including unit tests, integration tests, and user acceptance testing to ensure code reliability.

6. **Performance Analysis Framework**: Use profiling tools and complexity analysis to optimize code performance and identify bottlenecks.

Each framework provides specific methodologies and tools to approach programming challenges systematically and produce high-quality, maintainable code.`,
           
           'practical': `Practical programming applications include building real-world projects, contributing to open-source software, and solving specific problems in your field or industry. This involves applying your programming knowledge to create useful tools, automate tasks, or develop applications that serve real user needs.

Common programming tools include integrated development environments (IDEs), code editors, debugging tools, and testing frameworks. Learning how to use these tools effectively can significantly improve your productivity and code quality.

Programming challenges include debugging complex issues, optimizing code performance, and staying current with rapidly evolving technologies and frameworks. Successful programmers develop systematic approaches to problem-solving and maintain a commitment to continuous learning.

Specific practical applications include:

1. **Web Development Process**:
   - Frontend development with HTML, CSS, and JavaScript frameworks
   - Backend development with languages like Python, Node.js, or Java
   - Database design and management (SQL and NoSQL databases)
   - API development and integration with third-party services

2. **Mobile App Development**:
   - Native development for iOS (Swift) and Android (Kotlin/Java)
   - Cross-platform development with React Native or Flutter
   - App store optimization and deployment processes
   - User experience design and interface development

3. **Data Science and Analytics**:
   - Data cleaning and preprocessing techniques
   - Statistical analysis and machine learning algorithms
   - Data visualization using tools like Tableau or D3.js
   - Big data processing with frameworks like Hadoop or Spark

4. **Software Testing and Quality Assurance**:
   - Unit testing frameworks and test-driven development
   - Integration testing and continuous integration/continuous deployment (CI/CD)
   - Performance testing and load testing
   - Security testing and vulnerability assessment

5. **DevOps and Deployment**:
   - Version control with Git and collaborative development workflows
   - Containerization with Docker and orchestration with Kubernetes
   - Cloud deployment on platforms like AWS, Azure, or Google Cloud
   - Monitoring and logging systems for production applications

6. **Project Management and Collaboration**:
   - Agile development methodologies (Scrum, Kanban)
   - Code review processes and pair programming
   - Documentation standards and technical writing
   - Open-source contribution and community involvement`
         }
      };
      
      // Find the best matching subject
      let bestMatch = 'general';
      let bestScore = 0;
      
      Object.keys(contentMap).forEach(subject => {
        if (subject.includes(courseSubject.toLowerCase()) || courseSubject.toLowerCase().includes(subject)) {
          const score = Math.min(subject.length, courseSubject.length);
          if (score > bestScore) {
            bestScore = score;
            bestMatch = subject;
          }
        }
      });
      
      // Return topic-specific content or fallback to general content
      if (contentMap[bestMatch] && contentMap[bestMatch][topic]) {
        return contentMap[bestMatch][topic];
      }
      
             // Fallback content for topics not covered in the map
       const fallbackContent = {
         'introduction': `Welcome to the world of ${courseSubject}. This field represents a dynamic and evolving area that offers numerous opportunities for learning, growth, and professional development. Whether you're just starting your journey or looking to enhance existing skills, understanding the fundamentals is crucial for success.

${courseSubject} encompasses various aspects that are essential for anyone looking to excel in this area. The field continues to evolve with new developments, technologies, and methodologies emerging regularly. This makes it both exciting and challenging for learners who need to stay current while building a solid foundation of knowledge and skills.

The importance of ${courseSubject} in today's world cannot be overstated. From personal development to professional advancement, the skills and knowledge you'll gain in this course will be directly applicable to real-world situations and challenges you may encounter in your career or personal life.

Key areas you'll explore include:
- Core concepts and terminology specific to ${courseSubject}
- Industry best practices and current trends
- Practical applications and real-world use cases
- Tools and technologies commonly used in the field
- Career opportunities and professional development paths`,
         
         'fundamentals': `The core principles of ${courseSubject} involve understanding fundamental concepts, methodologies, and best practices that form the foundation of this field. These principles provide the framework upon which more advanced knowledge and skills are built.

Key concepts in ${courseSubject} include understanding the basic terminology, processes, and approaches that are commonly used in this area. Mastery of these fundamentals is essential for anyone looking to develop expertise and apply their knowledge effectively in practical situations.

The fundamental approach to ${courseSubject} involves systematic thinking, problem-solving, and continuous learning. These skills are transferable across various contexts and will serve you well regardless of your specific goals or career path.

Critical thinking in ${courseSubject} involves several specific frameworks:

1. **Problem Analysis Framework**: Break down complex challenges into manageable components using systematic analysis techniques.

2. **Research and Information Gathering Framework**: Develop skills in finding, evaluating, and synthesizing information from multiple sources.

3. **Solution Development Framework**: Use structured approaches to develop and evaluate potential solutions to problems.

4. **Implementation Planning Framework**: Create detailed action plans with timelines, resources, and success metrics.

5. **Evaluation and Iteration Framework**: Establish feedback loops to assess outcomes and continuously improve approaches.

6. **Knowledge Integration Framework**: Connect new learning with existing knowledge and apply concepts across different contexts.

Each framework provides specific methodologies and tools to approach ${courseSubject} challenges systematically and achieve better results.`,
         
         'practical': `Practical applications of ${courseSubject} involve applying theoretical knowledge to real-world situations and challenges. This includes developing hands-on skills, working through case studies, and implementing solutions to actual problems.

Common tools and techniques in ${courseSubject} include various methodologies, software, and approaches that professionals use to achieve their goals. Understanding how to use these tools effectively is essential for success in this field.

The challenges in ${courseSubject} often involve staying current with developments, managing complexity, and balancing theoretical knowledge with practical application. Successful practitioners develop systems and approaches that help them navigate these challenges effectively.

Specific practical applications include:

1. **Project Planning and Execution**:
   - Define clear objectives and success criteria for ${courseSubject} projects
   - Create detailed project timelines with milestones and deliverables
   - Identify required resources, tools, and team members
   - Implement monitoring and evaluation systems to track progress

2. **Problem-Solving and Decision Making**:
   - Apply systematic approaches to analyze complex problems in ${courseSubject}
   - Use decision-making frameworks to evaluate options and choose optimal solutions
   - Develop contingency plans for potential challenges and setbacks
   - Practice critical thinking skills through real-world scenarios

3. **Communication and Collaboration**:
   - Effectively communicate ${courseSubject} concepts to different audiences
   - Collaborate with team members on complex projects and initiatives
   - Present findings and recommendations in clear, compelling ways
   - Build relationships with stakeholders and subject matter experts

4. **Continuous Learning and Improvement**:
   - Stay current with latest developments and trends in ${courseSubject}
   - Seek feedback and incorporate lessons learned into future work
   - Develop personal learning networks and professional communities
   - Create systems for ongoing skill development and knowledge acquisition

5. **Technology and Tool Mastery**:
   - Learn to use industry-standard tools and software relevant to ${courseSubject}
   - Develop proficiency in data analysis, research, and presentation tools
   - Master productivity and collaboration platforms for remote and team work
   - Stay updated with emerging technologies that impact the field

6. **Professional Development**:
   - Build a portfolio of ${courseSubject} projects and achievements
   - Develop networking strategies to connect with industry professionals
   - Create career development plans with specific goals and timelines
   - Pursue certifications, training, and educational opportunities

Each application area provides concrete steps and examples to help you develop practical skills and achieve success in ${courseSubject}.`
       };
      
      return fallbackContent[topic as keyof typeof fallbackContent] || fallbackContent.introduction;
    };
    
    // Generate AI-powered unique content for each module
    try {
      let moduleType = 'introduction';
      if (title.toLowerCase().includes('core') || title.toLowerCase().includes('concept')) {
        moduleType = 'fundamentals';
      } else if (title.toLowerCase().includes('practical') || title.toLowerCase().includes('application')) {
        moduleType = 'practical';
      } else if (title.toLowerCase().includes('assessment') || title.toLowerCase().includes('review')) {
        moduleType = 'assessment';
      }

      console.log(`Generating AI content for module ${moduleNumber}: ${moduleType} - ${courseContext}`);
      
      const aiContent = await generateAIContent(moduleType, courseContext, trackType, moduleNumber, totalModules, title, allModuleTitles || []);
      
      if (aiContent && aiContent.trim().length > 100) {
        console.log(`AI content generated successfully for module ${moduleNumber}, length: ${aiContent.length}`);
        return aiContent;
    } else {
        console.log(`AI content generation failed or returned empty content for module ${moduleNumber}`);
      }
    } catch (error) {
      console.error(`AI content generation failed for module ${moduleNumber}, falling back to template:`, error);
    }

        // Fallback to template content if AI generation fails
    // Create unique fallback content based on module number and type
    const createUniqueFallbackContent = (moduleNumber: number, moduleType: string) => {
      const uniqueElements = [
        `Module ${moduleNumber} focuses specifically on ${moduleType} aspects of ${courseContext}.`,
        `This is the ${moduleNumber === 1 ? 'first' : moduleNumber === 2 ? 'second' : moduleNumber === 3 ? 'third' : `${moduleNumber}th`} module in your learning journey.`,
        `Building on ${moduleNumber > 1 ? 'previous modules' : 'your existing knowledge'}, this module will ${moduleType === 'introduction' ? 'introduce you to' : moduleType === 'fundamentals' ? 'deepen your understanding of' : 'help you apply'} ${courseContext}.`,
        `By the end of this module, you'll have ${moduleType === 'introduction' ? 'a solid foundation' : moduleType === 'fundamentals' ? 'advanced knowledge' : 'practical skills'} in ${courseContext}.`
      ];

      return `${title}

Overview
${uniqueElements[0]} ${uniqueElements[1]}

What You'll Learn
${uniqueElements[2]} ${uniqueElements[3]}

Topic 1: ${moduleType === 'introduction' ? 'Getting Started' : moduleType === 'fundamentals' ? 'Core Principles' : 'Practical Applications'}
- Understanding ${courseContext} in context

${courseContext} represents a dynamic field that requires both theoretical knowledge and practical application. This module will provide you with the essential ${moduleType === 'introduction' ? 'foundations' : moduleType === 'fundamentals' ? 'principles' : 'applications'} you need to succeed.

- Key concepts and terminology

You'll learn important terms and concepts specific to ${courseContext}, including industry-standard terminology and fundamental principles that form the basis of this field.

- Real-world relevance

The knowledge you gain in this module is directly applicable to real-world situations in ${courseContext}. You'll understand how these concepts are used in professional settings and practical scenarios.

Topic 2: ${moduleType === 'introduction' ? 'Building Your Foundation' : moduleType === 'fundamentals' ? 'Advanced Concepts' : 'Implementation Strategies'}
- Essential ${moduleType === 'introduction' ? 'prerequisites' : moduleType === 'fundamentals' ? 'methodologies' : 'techniques'}

This section covers the ${moduleType === 'introduction' ? 'basic requirements' : moduleType === 'fundamentals' ? 'advanced approaches' : 'practical methods'} you need to understand ${courseContext} effectively.

- Learning objectives

By the end of this module, you'll be able to ${moduleType === 'introduction' ? 'define and explain' : moduleType === 'fundamentals' ? 'analyze and evaluate' : 'implement and apply'} key concepts in ${courseContext}.

- Success indicators

Your progress will be measured through your ability to ${moduleType === 'introduction' ? 'articulate basic concepts' : moduleType === 'fundamentals' ? 'demonstrate understanding' : 'apply practical skills'} related to ${courseContext}.

Topic 3: ${moduleType === 'introduction' ? 'Moving Forward' : moduleType === 'fundamentals' ? 'Practical Integration' : 'Advanced Applications'}
- Your learning path

This module ${moduleNumber === 1 ? 'establishes the foundation' : moduleNumber === 2 ? 'builds upon your introduction' : 'integrates your knowledge'} for the rest of your ${courseContext} journey.

- Tools and resources

You'll have access to ${moduleType === 'introduction' ? 'basic learning materials' : moduleType === 'fundamentals' ? 'advanced resources' : 'practical tools'} specifically designed for ${courseContext} learners.

- Best practices

To maximize your learning in this module, focus on ${moduleType === 'introduction' ? 'understanding core concepts' : moduleType === 'fundamentals' ? 'applying theoretical knowledge' : 'practicing real-world scenarios'} in ${courseContext}.

Module Summary
This is module ${moduleNumber} of ${totalModules} in your comprehensive ${context} course. You've now ${moduleType === 'introduction' ? 'established a solid foundation' : moduleType === 'fundamentals' ? 'developed advanced understanding' : 'gained practical experience'} in ${courseContext} and are ready to ${moduleNumber < totalModules ? 'continue to the next module' : 'apply your knowledge in real-world situations'}.`;
    };

         // Determine module type for fallback content
         let fallbackModuleType = 'introduction';
         if (title.toLowerCase().includes('core') || title.toLowerCase().includes('concept')) {
           fallbackModuleType = 'fundamentals';
         } else if (title.toLowerCase().includes('practical') || title.toLowerCase().includes('application')) {
           fallbackModuleType = 'practical';
         } else if (title.toLowerCase().includes('assessment') || title.toLowerCase().includes('review')) {
           fallbackModuleType = 'assessment';
         }
         
         return createUniqueFallbackContent(moduleNumber, fallbackModuleType);
  };

  // Function to generate detailed key points for each module
  const generateKeyPoints = (title: string, courseDescription: string, trackType: string) => {
    // Clean up course description to extract the actual topic
    const cleanCourseDescription = (desc: string) => {
      if (!desc) return 'the subject';
      
      // Remove common prompt phrases and course creation language
      let cleaned = desc.toLowerCase()
        .replace(/create\s+a\s+course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/create\s+course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/make\s+a\s+course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/make\s+course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/build\s+a\s+course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/build\s+course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/develop\s+a\s+course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/develop\s+course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/create\s+a\s+course/gi, '')
        .replace(/create\s+course/gi, '')
        .replace(/make\s+a\s+course/gi, '')
        .replace(/make\s+course/gi, '')
        .replace(/build\s+a\s+course/gi, '')
        .replace(/build\s+course/gi, '')
        .replace(/develop\s+a\s+course/gi, '')
        .replace(/develop\s+course/gi, '')
        .replace(/course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/training\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/learning\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/about\s+/gi, '')
        .replace(/regarding\s+/gi, '')
        .replace(/concerning\s+/gi, '')
        .replace(/in\s+/gi, '')
        .replace(/the\s+/gi, '')
        .trim();
      
      // Remove any remaining course-related words
      const courseWords = ['course', 'training', 'learning', 'lesson', 'module', 'class', 'workshop', 'seminar'];
      courseWords.forEach(word => {
        cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
      });
      
      // Clean up extra spaces and normalize
      cleaned = cleaned.replace(/\s+/g, ' ').trim();
      
      // If we end up with nothing meaningful, return a default
      if (!cleaned || cleaned.length < 2) {
        return 'the subject';
      }
      
      return cleaned;
    };
    
    // Generate dynamic key points based on the module title and course context
    const courseContext = cleanCourseDescription(courseDescription);
    
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

  const generateCourseTitle = (courseDescription: string, trackType: string) => {
    if (!courseDescription || courseDescription.trim() === '') {
      return `${trackType} Course`;
    }

    // Clean the description and remove common course creation phrases
    let cleanDescription = courseDescription.trim().toLowerCase();
    
    // Remove common course creation phrases that don't help with title generation
    const phrasesToRemove = [
      'i want to create a course on',
      'i want to create',
      'create a course on',
      'create course on',
      'create a course',
      'create course',
      'make a course on',
      'make course on',
      'build a course on',
      'build course on',
      'develop a course on',
      'develop course on',
      'course on',
      'course about',
      'training on',
      'training about',
      'learn about',
      'learn',
      'introduction to',
      'basics of',
      'fundamentals of',
      'essentials of',
      'principles of',
      'guide to',
      'overview of',
      'about',
      'regarding',
      'concerning'
    ];
    
    phrasesToRemove.forEach(phrase => {
      cleanDescription = cleanDescription.replace(new RegExp(phrase, 'gi'), '');
    });
    
    // Extract meaningful words (focus on nouns and key concepts)
    const words = cleanDescription
      .split(/\s+/)
      .filter(word => 
        word.length > 2 && 
        !['the', 'and', 'for', 'with', 'this', 'that', 'will', 'your', 'learn', 'about', 'from', 'how', 'what', 'when', 'where', 'why', 'who', 'which', 'their', 'have', 'been', 'they', 'were', 'said', 'each', 'which', 'she', 'do', 'how', 'its', 'if', 'up', 'out', 'many', 'then', 'them', 'these', 'so', 'some', 'her', 'would', 'make', 'like', 'into', 'him', 'time', 'has', 'two', 'more', 'go', 'no', 'way', 'could', 'my', 'than', 'first', 'been', 'call', 'who', 'oil', 'sit', 'now', 'find', 'down', 'day', 'did', 'get', 'come', 'made', 'may', 'part', 'create', 'course', 'introduction', 'fundamentals', 'essentials', 'principles', 'guide', 'overview'].includes(word)
      )
      .slice(0, 4); // Take first 4 meaningful words to preserve more context

    if (words.length === 0) {
      return `${trackType} Course`;
    }

    // Create a more descriptive title by combining multiple words
    const createDescriptiveTitle = (wordList: string[], trackType: string) => {
      // Helper function to capitalize each word
      const capitalizeWords = (words: string[]) => {
        return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      };
      
      if (wordList.length === 1) {
        const word = wordList[0];
        return capitalizeWords([word]);
      }
      
      if (wordList.length === 2) {
        return capitalizeWords(wordList);
      }
      
      if (wordList.length >= 3) {
        // For 3+ words, use the first 3 words to keep titles concise
        return capitalizeWords(wordList.slice(0, 3));
      }
      
      return `${trackType} Course`;
    };

    return createDescriptiveTitle(words, trackType);
  };

  // Function to generate a comprehensive system prompt
  const generateSystemPrompt = (formData: any, trackType: 'Corporate' | 'Educational') => {
    // Clean up course description to extract the actual topic
    const cleanCourseDescription = (desc: string) => {
      if (!desc) return 'the subject';
      
      // Remove common prompt phrases and course creation language
      let cleaned = desc.toLowerCase()
        .replace(/create\s+a\s+course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/create\s+course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/make\s+a\s+course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/make\s+course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/build\s+a\s+course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/build\s+course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/develop\s+a\s+course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/develop\s+course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/create\s+a\s+course/gi, '')
        .replace(/create\s+course/gi, '')
        .replace(/make\s+a\s+course/gi, '')
        .replace(/make\s+course/gi, '')
        .replace(/build\s+a\s+course/gi, '')
        .replace(/build\s+course/gi, '')
        .replace(/develop\s+a\s+course/gi, '')
        .replace(/develop\s+course/gi, '')
        .replace(/course\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/training\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/learning\s+(?:on|about|regarding|concerning)\s+/gi, '')
        .replace(/about\s+/gi, '')
        .replace(/regarding\s+/gi, '')
        .replace(/concerning\s+/gi, '')
        .replace(/in\s+/gi, '')
        .replace(/the\s+/gi, '')
        .trim();
      
      // Remove any remaining course-related words
      const courseWords = ['course', 'training', 'learning', 'lesson', 'module', 'class', 'workshop', 'seminar'];
      courseWords.forEach(word => {
        cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
      });
      
      // Clean up extra spaces and normalize
      cleaned = cleaned.replace(/\s+/g, ' ').trim();
      
      // If we end up with nothing meaningful, return a default
      if (!cleaned || cleaned.length < 2) {
        return 'the subject';
      }
      
      return cleaned;
    };
    
    const courseDescription = cleanCourseDescription(formData.courseDescription || '');
    const learnerDescription = formData.learnerDescription || '';
    const numberOfTopics = formData.numberOfTopics || 3;
    const topicDuration = 0;
    const numberOfQuizzes = formData.numberOfQuizzes || 1;
    const pdfContent = formData.pdfContent || '';
    const websiteContent = formData.websiteContent || '';

    if (trackType === 'Corporate') {
      return `You are an expert corporate trainer named Nia, specializing in professional development and workplace training. You're here to guide learners through a comprehensive course focused on: ${courseDescription}

COURSE DETAILS:
- Course Description: ${courseDescription}
- Target Learners: ${learnerDescription}
- Number of Topics: ${numberOfTopics}
- Number of Quizzes: ${numberOfQuizzes}
${pdfContent ? `- PDF Content: ${pdfContent.substring(0, 200)}...` : ''}
${websiteContent ? `- Website Content: ${websiteContent.substring(0, 200)}...` : ''}

YOUR ROLE:
- Guide learners through structured learning modules specific to ${courseDescription}
- Provide industry-specific examples and case studies related to ${courseDescription}
- Adapt your teaching style to ${learnerDescription}
- Encourage active participation and practical application
- Offer constructive feedback and support
${websiteContent ? `- Incorporate relevant information from the provided website content when applicable` : ''}

TEACHING APPROACH:
- Use real-world scenarios and practical examples from ${courseDescription}
- Provide actionable strategies and techniques for ${courseDescription}
- Address common challenges and pain points in ${courseDescription}
- Foster a supportive and engaging learning environment
- Ensure practical application of ${courseDescription} concepts
${websiteContent ? `- Reference and integrate insights from the website content to provide context-specific examples` : ''}

SPECIFIC FOCUS:
- Every response should directly relate to ${courseDescription}
- Provide examples and scenarios specific to ${courseDescription}
- Address the needs and challenges of ${learnerDescription}
- Ensure all content is immediately applicable to ${courseDescription}
${websiteContent ? `- Use the website content to provide relevant, up-to-date information and examples` : ''}

Remember to stay focused on ${courseDescription} while providing relevant context and practical applications. Make the learning experience practical, engaging, and immediately applicable to the learner's work environment.`;
    } else {
      return `You are an expert educational tutor named Leo, specializing in academic instruction and student development. You're here to guide learners through an engaging lesson focused on: ${courseDescription}

COURSE DETAILS:
- Course Description: ${courseDescription}
- Target Learners: ${learnerDescription}
- Number of Topics: ${numberOfTopics}
- Number of Quizzes: ${numberOfQuizzes}
${pdfContent ? `- PDF Content: ${pdfContent.substring(0, 200)}...` : ''}
${websiteContent ? `- Website Content: ${websiteContent.substring(0, 200)}...` : ''}

YOUR ROLE:
- Guide learners through structured learning modules specific to ${courseDescription}
- Provide clear explanations and examples related to ${courseDescription}
- Adapt to ${learnerDescription} understanding level
- Encourage questions and active participation
- Offer supportive feedback and encouragement
${websiteContent ? `- Use the website content to provide current, relevant examples and information` : ''}

TEACHING APPROACH:
- Break down ${courseDescription} concepts into understandable parts
- Use relevant examples and analogies from ${courseDescription}
- Provide step-by-step guidance when needed
- Create an encouraging and patient learning environment
- Ensure comprehension of ${courseDescription} before moving forward
${websiteContent ? `- Incorporate real-world examples from the website content to make concepts more relatable` : ''}

SPECIFIC FOCUS:
- Every response should directly relate to ${courseDescription}
- Provide examples and explanations specific to ${courseDescription}
- Address the learning needs of ${learnerDescription}
- Ensure all content builds understanding of ${courseDescription}
${websiteContent ? `- Reference the website content to provide contemporary, relevant context and examples` : ''}

Remember to focus on ${courseDescription} while building a strong foundation in the subject matter. Make the learning experience engaging, supportive, and tailored to ${learnerDescription} educational level.`;
    }
  };

  // Function to generate quizzes for the course
  const generateQuizzesForCourse = async (modules: any[], numberOfQuizzes: number, courseDescription: string) => {
    console.log('generateQuizzesForCourse called with:', { modules, numberOfQuizzes, courseDescription });
    const quizzes = [];
    
    for (let i = 0; i < numberOfQuizzes; i++) {
      const quizModules = modules.slice(i * Math.ceil(modules.length / numberOfQuizzes), (i + 1) * Math.ceil(modules.length / numberOfQuizzes));
      const quizTitle = `Knowledge Check ${i + 1}`;
      const questions = [];
      console.log(`Generating quiz ${i + 1} with ${quizModules.length} modules`);

      // Generate AI-powered questions for each module
      for (const module of quizModules) {
        try {
          console.log(`Generating AI quiz questions for module: ${module.title}`);
          
          const response = await supabase.functions.invoke('generate-quiz', {
            body: {
              sectionTitle: module.title,
              sectionContent: module.content,
              keyPoints: module.keyPoints || [],
              numberOfQuestions: 2, // 2 questions per module
              courseTopic: courseDescription
            }
          });

          if (response.error) {
            console.error('Failed to generate AI quiz questions:', response.error);
            // Fallback to basic questions if AI generation fails
            questions.push(createFallbackQuestion(module, questions.length));
            continue;
          }

          if (response.data && response.data.success && response.data.questions) {
            console.log(`Generated ${response.data.questions.length} AI questions for module: ${module.title}`);
            questions.push(...response.data.questions);
          } else {
            console.error('Invalid response from AI quiz generation:', response.data);
            questions.push(createFallbackQuestion(module, questions.length));
          }
        } catch (error) {
          console.error('Error generating AI quiz questions:', error);
          questions.push(createFallbackQuestion(module, questions.length));
        }
      }

      // Ensure we have at least 3 questions per quiz
      while (questions.length < 3) {
        questions.push({
          id: `fallback-${i}-${questions.length}`,
          question: `What is the primary goal of this course?`,
          options: [
            'To provide comprehensive understanding of core concepts',
            'To offer advanced technical skills only',
            'To introduce basic concepts without depth',
            'To focus on theoretical knowledge only'
          ],
          correctAnswer: 0,
          explanation: 'The course aims to provide a comprehensive understanding of core concepts.'
        });
      }

      quizzes.push({
        id: `quiz-${i + 1}`,
        title: quizTitle,
        questions: questions.slice(0, 5), // Limit to 5 questions per quiz
        isCompleted: false
      });
    }
    
    console.log('Final generated quizzes:', quizzes);
    
    // Ensure we always return at least one quiz with basic questions
    if (quizzes.length === 0) {
      console.log('No quizzes generated, creating fallback quiz');
      const fallbackQuiz = {
        id: 'quiz-fallback',
        title: 'Knowledge Check',
        questions: [
          {
            id: 'fallback-1',
            question: 'What is the primary goal of this course?',
            options: [
              'To provide comprehensive understanding of core concepts',
              'To offer advanced technical skills only',
              'To introduce basic concepts without depth',
              'To focus on theoretical knowledge only'
            ],
            correctAnswer: 0,
            explanation: 'The course aims to provide a comprehensive understanding of core concepts.'
          },
          {
            id: 'fallback-2',
            question: 'Which of the following best describes this course?',
            options: [
              'A comprehensive learning experience',
              'A basic introduction only',
              'Advanced technical training',
              'Theoretical concepts only'
            ],
            correctAnswer: 0,
            explanation: 'This course provides a comprehensive learning experience.'
          }
        ],
        isCompleted: false
      };
      quizzes.push(fallbackQuiz);
    }
    
    return quizzes;
  };

  // Helper function to create fallback questions when AI generation fails
  const createFallbackQuestion = (module: any, questionIndex: number) => {
    return {
      id: `fallback-${module.id}-${questionIndex}`,
      question: `What is the main concept discussed in "${module.title}"?`,
      options: [
        `Understanding ${module.title.toLowerCase()}`,
        `Advanced techniques in ${module.title.toLowerCase()}`,
        `Basic introduction to ${module.title.toLowerCase()}`,
        `Practical applications of ${module.title.toLowerCase()}`
      ],
      correctAnswer: 0,
      explanation: `This module focuses on understanding the core concept of ${module.title}.`
    };
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
      const courseTitle = generateCourseTitle(courseDescription, selectedTrack!);

      // Set the correct tutor persona based on track type
      const tutorPersona = selectedTrack === 'Corporate' ? 'Nia' : 'Leo';
      
      // Generate structured course plan with modules
      const courseModules = await generateCourseModules(formData, selectedTrack!);
      
      // Generate comprehensive system prompt
      const systemPrompt = generateSystemPrompt(formData, selectedTrack!);
      
      // Create enhanced course plan with proper structure
      const enhancedCoursePlan = {
        ...formData,
        tutorPersona: tutorPersona,
        title: courseTitle,
        duration: 0, // Default duration per module
        modules: courseModules,
        trackType: selectedTrack,
        courseDescription: formData.courseDescription,
        learnerDescription: formData.learnerDescription,
        numberOfTopics: formData.numberOfTopics || 3,
        numberOfQuizzes: formData.numberOfQuizzes || 1,
        websiteContent: formData.websiteContent || null,
        websiteUrl: formData.websiteUrl || null
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
      // We'll keep track of the final course object we want to use for redirect/UI
      let finalCourseData = courseData;
      
      // Generate quizzes automatically for the course
      console.log('Starting quiz generation process...');
      console.log('formData.numberOfQuizzes:', formData.numberOfQuizzes);
      console.log('courseModules:', courseModules);
      console.log('courseDescription:', courseDescription);
      
      try {
        const numberOfQuizzes = formData.numberOfQuizzes || 1;
        console.log(`Number of quizzes to generate: ${numberOfQuizzes}`);
        
        if (numberOfQuizzes > 0) {
          console.log(`Generating ${numberOfQuizzes} quizzes for the course...`);
          const generatedQuizzes = await generateQuizzesForCourse(courseModules, numberOfQuizzes, courseDescription);
          
          if (generatedQuizzes && generatedQuizzes.length > 0) {
            // Update the course plan with generated quizzes
            const updatedCoursePlan = {
              ...enhancedCoursePlan,
              quizzes: generatedQuizzes
            };
            
            console.log('Generated quizzes:', generatedQuizzes);
            console.log('Updated course plan:', updatedCoursePlan);
            
            // Update the course in the database with quizzes
            const { error: updateError } = await supabase
              .from('courses')
              .update({ course_plan: updatedCoursePlan })
              .eq('id', courseData.id);
              
            if (updateError) {
              console.error('Error updating course with quizzes:', updateError);
              console.error('Update error details:', updateError.details);
              console.error('Update error hint:', updateError.hint);
            } else {
              console.log('Quizzes generated and saved successfully to database');
              
              // Update the course data reference so we redirect with quizzes
              const updatedCourseData = {
                ...courseData,
                course_plan: updatedCoursePlan
              };
              finalCourseData = updatedCourseData;
            }
          } else {
            console.error('No quizzes were generated');
          }
        } else {
          console.log('No quizzes requested (numberOfQuizzes = 0)');
        }
      } catch (quizError) {
        console.error('Error generating quizzes:', quizError);
        // Don't fail the course creation if quiz generation fails
      }
      
      // Credit consumption is now handled automatically by database trigger
      console.log('Credit consumption will be handled automatically by database trigger');
      
      // Dispatch event to notify other components that credits were consumed
      window.dispatchEvent(new CustomEvent('credits-consumed'));

      setCreatedCourse(finalCourseData);
      setCourseCreated(true);

      toast({
        title: "Course Created!",
        description: "Redirecting to the course editor...",
      });

      // Immediately notify parent so it can redirect with quizzes if available
      onCourseCreated(finalCourseData);

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
