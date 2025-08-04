import { supabase } from '@/integrations/supabase/client';

export interface PDFExtractionResult {
  success: boolean;
  extractedContent?: string;
  error?: string;
  message?: string;
  creditsConsumed?: number;
  remainingCredits?: number;
  totalCredits?: number;
}

/**
 * Process PDF with Gemini API
 */
export const processPDFWithGemini = async (
  file: File, 
  prompt: string, 
  userId: string
): Promise<PDFExtractionResult> => {
  try {
    // Convert file to base64
    const base64 = await fileToBase64(file);
    
    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('process-pdf', {
      body: {
        file: base64,
        prompt,
        userId
      }
    });

    if (error) {
      throw new Error(`PDF processing failed: ${error.message}`);
    }

    if (!data.success) {
      throw new Error(data.error || 'PDF processing failed');
    }

    return {
      success: true,
      extractedContent: data.extractedContent,
      message: data.message,
      creditsConsumed: data.creditsConsumed,
      remainingCredits: data.remainingCredits,
      totalCredits: data.totalCredits
    };

  } catch (error) {
    console.error('Error processing PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Convert file to base64
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

/**
 * Get default course prompt for PDF processing
 */
export const getDefaultCoursePrompt = (courseDescription: string): string => {
  return `Please extract relevant content from this PDF that can be used to enhance a course about: ${courseDescription}

Please focus on:
1. Key concepts and topics that align with the course description
2. Important definitions and explanations
3. Practical examples and case studies
4. Relevant statistics or data points
5. Structured content that can be integrated into course modules

Extract information that will be valuable for learners taking this course.`;
};

/**
 * Get general PDF extraction prompt
 */
export const getGeneralPDFPrompt = (): string => {
  return `Please extract the key content from this PDF in a structured format.

Please focus on:
1. Main topics and themes
2. Key concepts and definitions
3. Important facts and data
4. Practical applications or examples
5. Summary of main points

Format the response in a clear, organized manner that maintains the PDF's structure and key information.`;
};

/**
 * Fetch user's PDF extraction history
 */
export const getPDFExtractionHistory = async (userId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('pdf_extractions')
      .select('*')
      .eq('user_id', userId)
      .order('processed_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching PDF extraction history:', error);
    throw error;
  }
};

/**
 * Delete a PDF extraction
 */
export const deletePDFExtraction = async (extractionId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('pdf_extractions')
      .delete()
      .eq('id', extractionId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error deleting PDF extraction:', error);
    throw error;
  }
};

/**
 * Format extraction date for display
 */
export const formatExtractionDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}; 