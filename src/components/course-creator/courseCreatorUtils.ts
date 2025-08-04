
export const getIndustryGoals = (industry: string) => {
  const goals: { [key: string]: string[] } = {
    'Real Estate': ['Handle buyer objections', 'Qualify leads faster', 'Deliver stronger listing presentations', 'Improve follow-up consistency'],
    'SaaS': ['Qualify leads faster', 'Handle objections around pricing', 'Improve demo presentations', 'Close more deals'],
    'Finance': ['Build trust during a sales call', 'Explain complex products simply', 'Handle compliance requirements', 'Improve client relationships'],
    'Retail': ['Improve upselling at checkout', 'Handle angry customers', 'Train new floor staff', 'Increase conversion rates'],
    'Healthcare': ['Explain procedures clearly', 'Handle patient concerns', 'Improve bedside manner', 'Manage difficult situations'],
    'Call Center': ['Reduce call times', 'Improve customer satisfaction', 'Handle escalations', 'Increase first-call resolution'],
    'Hospitality': ['Enhance guest experience', 'Handle complaints professionally', 'Upsell services', 'Improve team coordination'],
    'Trades': ['Safety protocols', 'Client communication', 'Quality standards', 'Efficiency improvements'],
    'Creative/Marketing': ['Present ideas effectively', 'Handle client feedback', 'Improve collaboration', 'Meet deadlines'],
    'Education': ['Engage students better', 'Handle classroom management', 'Improve teaching methods', 'Parent communication']
  };
  return goals[industry] || ['Improve communication skills', 'Handle customer objections', 'Build stronger relationships', 'Increase performance'];
};

export const getIndustryAudience = (industry: string) => {
  const audiences: { [key: string]: string[] } = {
    'Real Estate': ['Myself (1:1 improvement)', 'New real estate agents', 'Sales team', 'Property managers'],
    'SaaS': ['Myself (1:1 improvement)', 'Sales development reps', 'Account executives', 'Customer success team'],
    'Finance': ['Myself (1:1 improvement)', 'Financial advisors', 'Loan officers', 'Investment consultants'],
    'Retail': ['Myself (1:1 improvement)', 'Sales associates', 'Store managers', 'Customer service team'],
    'Healthcare': ['Myself (1:1 improvement)', 'Nurses', 'Patient coordinators', 'Medical assistants'],
    'Call Center': ['Myself (1:1 improvement)', 'Customer service reps', 'Team leads', 'New hires'],
    'default': ['Myself (1:1 improvement)', 'New hires / onboarding', 'Sales team', 'Support agents', 'Managers or team leads']
  };
  return audiences[industry] || audiences.default;
};

export const getIndustryChallenges = (industry: string) => {
  const challenges: { [key: string]: string[] } = {
    'SaaS': ['Client ghosting', 'Budget pushback', 'Feature objections', 'Competitor comparisons'],
    'Retail': ['Customer complaints', 'Last-minute objections', 'Return requests', 'Price negotiations'],
    'Healthcare': ['Explaining procedures', 'Managing nervous patients', 'Insurance questions', 'Treatment compliance'],
    'Real Estate': ['Price negotiations', 'Buyer hesitation', 'Market concerns', 'Financing issues'],
    'Finance': ['Risk discussions', 'Complex product explanations', 'Regulatory compliance', 'Investment concerns'],
    'default': ['Difficult conversations', 'Objection handling', 'Time management', 'Performance improvement']
  };
  return challenges[industry] || challenges.default;
};

export const getEducationalObjectives = (subject: string) => {
  const objectives: { [key: string]: string[] } = {
    'Math': ['Solve algebra problems', 'Understand geometry concepts', 'Master calculus basics', 'Improve problem-solving skills'],
    'English': ['Improve essay writing', 'Analyze literature', 'Understand grammar rules', 'Develop vocabulary'],
    'Science': ['Understand DNA structure', 'Learn about chemical reactions', 'Explore physics principles', 'Conduct experiments'],
    'Coding': ['Learn to code a basic website', 'Introduction to Python', 'Understand algorithms', 'Build simple applications'],
    'Public Speaking': ['Speak confidently in public', 'Overcome stage fright', 'Structure presentations', 'Engage audiences'],
    'default': ['Critical thinking skills', 'Problem-solving abilities', 'Creative expression', 'Analytical thinking']
  };
  return objectives[subject] || objectives.default;
};

export const getEducationalChallenges = (subject: string) => {
  const challenges: { [key: string]: string[] } = {
    'Math': ['Understanding fractions', 'Word problems', 'Geometry proofs', 'Algebraic equations'],
    'English': ['Writing introductions', 'Grammar rules', 'Reading comprehension', 'Vocabulary building'],
    'Science': ['Remembering key facts', 'Understanding concepts', 'Lab procedures', 'Scientific method'],
    'Coding': ['Syntax errors', 'Logic problems', 'Debugging', 'Algorithm thinking'],
    'Public Speaking': ['Public speaking fear', 'Organizing thoughts', 'Voice projection', 'Managing nerves'],
    'default': ['Staying motivated', 'Time management', 'Study techniques', 'Test anxiety']
  };
  return challenges[subject] || challenges.default;
};
