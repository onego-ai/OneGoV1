
export const limitWords = (text: string, maxWords: number = 150): string => {
  const words = text.split(' ');
  if (words.length <= maxWords) {
    return text;
  }
  return words.slice(0, maxWords).join(' ') + '...';
};

export const formatFeedbackText = (text: string): string => {
  // Limit words first
  const limitedText = limitWords(text);
  
  // Add proper spacing between bullet points and sections
  return limitedText
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/•/g, '<br/>•')
    .replace(/\n/g, '<br/>')
    .replace(/<br\/><br\/>/g, '<br/>')
    .trim();
};
