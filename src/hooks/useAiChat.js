import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useAiChat() {
  const [messages, setMessages]   = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState(null);

  const sendMessage = useCallback(async (userText) => {
    if (!userText.trim() || isLoading) return;
    setError(null);

    const next = [...messages, { role: 'user', content: userText }];
    setMessages(next);
    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-chat', {
        body: { messages: next },
      });
      if (fnError) throw fnError;
      setMessages(prev => [...prev, { role: 'assistant', content: data?.reply ?? 'No response.' }]);
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error('[useAiChat]', err);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, error, sendMessage, clearMessages };
}
