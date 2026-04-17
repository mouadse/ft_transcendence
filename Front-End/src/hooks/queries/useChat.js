import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { chatAPI } from '../../api/chat';
import { uiStore } from '../../stores/uiStore';
import { authStore } from '../../stores/authStore';

export function useChatConversations(params = {}) {
  return useQuery({
    queryKey: ['chat', 'conversations', params],
    queryFn: () => chatAPI.getHistory(params),
    staleTime: 1000 * 20,
  });
}

export function useConversationMessages(conversationId) {
  return useQuery({
    queryKey: ['chat', 'conversation', conversationId],
    queryFn: () => chatAPI.getHistory({ conversation_id: conversationId }),
    enabled: !!conversationId,
    staleTime: 1000 * 10,
  });
}

export function useCoachSummary(params = {}) {
  const userId = authStore((state) => state.user?.id);

  return useQuery({
    queryKey: ['chat', 'coach-summary', userId, params],
    queryFn: () => chatAPI.getCoachSummary(userId, params),
    enabled: !!userId,
    staleTime: 1000 * 60,
  });
}

export function useSendChatMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ message, conversationId }) =>
      chatAPI.sendMessage({
        message,
        conversation_id: conversationId,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      if (data?.conversation_id) {
        queryClient.invalidateQueries({ queryKey: ['chat', 'conversation', data.conversation_id] });
      }
    },
    onError: (error) => {
      uiStore.getState().addToast('Failed to send message', 'error');
      console.error('Chat error:', error);
    },
  });
}

export function useSubmitChatFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, feedback }) =>
      chatAPI.submitFeedback({ message_id: messageId, feedback }),
    onSuccess: (_, variables) => {
      if (variables?.conversationId) {
        queryClient.invalidateQueries({ queryKey: ['chat', 'conversation', variables.conversationId] });
      }
    },
    onError: (error) => {
      uiStore.getState().addToast('Unable to save feedback', 'error');
      console.error('Feedback error:', error);
    },
  });
}
