// src/hooks/useDesignsQuery.js - React Query wrapper for designs
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/authContext';
import DesignService from '../api/designService';

// Query keys
export const designKeys = {
  all: ['designs'],
  lists: () => [...designKeys.all, 'list'],
  list: (filters) => [...designKeys.lists(), filters],
  details: () => [...designKeys.all, 'detail'],
  detail: (id) => [...designKeys.details(), id],
};

/**
 * Hook to fetch user designs with React Query caching
 */
export const useDesignsQuery = (options = {}) => {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch designs with caching
  const {
    data: designs = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: designKeys.list(options),
    queryFn: async () => {
      if (!isAuthenticated) {
        return [];
      }

      const response = await DesignService.getUserDesigns(options);
      
      if (!response.success || !Array.isArray(response.data?.designs)) {
        throw new Error("Formato de respuesta inválido");
      }

      // ⚡ Use minimal formatting for list views
      const formattedDesigns = response.data.designs
        .map(design => DesignService.formatDesign(design, true))
        .filter(design => design !== null);

      return {
        designs: formattedDesigns,
        pagination: {
          page: response.data.page || 1,
          limit: response.data.limit || 10,
          total: response.data.total || 0,
          pages: response.data.pages || 0,
        }
      };
    },
    enabled: isAuthenticated, // Only run if authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Mutation to create design
  const createDesignMutation = useMutation({
    mutationFn: (designData) => DesignService.create(designData),
    onSuccess: () => {
      // ⚡ Invalidate designs cache to refetch
      queryClient.invalidateQueries(designKeys.lists());
    },
  });

  // Mutation to update design
  const updateDesignMutation = useMutation({
    mutationFn: ({ id, data }) => DesignService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(designKeys.lists());
    },
  });

  // Mutation to respond to quote
  const respondToQuoteMutation = useMutation({
    mutationFn: ({ id, response }) => DesignService.respondToQuote(id, response),
    onSuccess: () => {
      queryClient.invalidateQueries(designKeys.lists());
    },
  });

  // Mutation to cancel design
  const cancelDesignMutation = useMutation({
    mutationFn: ({ id, reason }) => DesignService.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(designKeys.lists());
    },
  });

  return {
    // Data
    designs: designs?.designs || [],
    pagination: designs?.pagination || { page: 1, limit: 10, total: 0, pages: 0 },
    
    // Loading states
    isLoading,
    error,
    
    // Refetch function
    refetch,
    
    // Mutations
    createDesign: createDesignMutation.mutateAsync,
    updateDesign: updateDesignMutation.mutateAsync,
    respondToQuote: respondToQuoteMutation.mutateAsync,
    cancelDesign: cancelDesignMutation.mutateAsync,
    
    // Computed states
    hasDesigns: (designs?.designs || []).length > 0,
    isEmpty: !isLoading && (designs?.designs || []).length === 0,
    hasMore: (designs?.pagination?.page || 0) < (designs?.pagination?.pages || 0),
    
    // Filtered designs
    pendingDesigns: (designs?.designs || []).filter(d => d.status === 'pending'),
    quotedDesigns: (designs?.designs || []).filter(d => d.status === 'quoted'),
    approvedDesigns: (designs?.designs || []).filter(d => d.status === 'approved'),
    draftDesigns: (designs?.designs || []).filter(d => d.status === 'draft'),
    completedDesigns: (designs?.designs || []).filter(d => d.status === 'completed'),
  };
};
