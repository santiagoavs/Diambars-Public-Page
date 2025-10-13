// src/hooks/useOrdersQuery.js - React Query wrapper for orders
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/authContext';
import ordersAPI from '../api/ordersApi';

// Query keys
export const orderKeys = {
  all: ['orders'],
  lists: () => [...orderKeys.all, 'list'],
  list: (filters) => [...orderKeys.lists(), filters],
  details: () => [...orderKeys.all, 'detail'],
  detail: (id) => [...orderKeys.details(), id],
};

/**
 * Hook to fetch user orders with React Query caching
 */
export const useOrdersQuery = (filters = {}) => {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Fetch orders with caching
  const {
    data: orders = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: orderKeys.list(filters),
    queryFn: async () => {
      if (!isAuthenticated) {
        return [];
      }

      const response = await ordersAPI.getMyOrders({
        ...filters,
        page: filters.page || 1,
        limit: filters.limit || 10,
        sort: filters.sort || 'createdAt',
        order: filters.order || 'desc'
      });

      if (!response.success) {
        throw new Error(response.message || 'Error al cargar órdenes');
      }

      // Format orders
      const formattedOrders = (response.data.orders || []).map(order => ({
        ...order,
        isPending: ['pending_approval', 'quoted'].includes(order.status),
        needsResponse: order.status === 'quoted' && !order.quoteResponse,
        hasQualityPending: order.status === 'quality_check' && 
          (order.productionPhotos || []).some(p => !p.clientResponse)
      }));

      return formattedOrders;
    },
    enabled: isAuthenticated,
    staleTime: 3 * 60 * 1000, // 3 minutes (orders change more frequently)
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Mutation to create order from design
  const createOrderMutation = useMutation({
    mutationFn: (orderData) => ordersAPI.createOrderFromApprovedDesign(orderData),
    onSuccess: () => {
      // ⚡ Invalidate both orders and designs cache
      queryClient.invalidateQueries(orderKeys.lists());
      queryClient.invalidateQueries(['designs']);
    },
  });

  // Mutation to respond to quote
  const respondToQuoteMutation = useMutation({
    mutationFn: ({ orderId, response }) => ordersAPI.respondToQuote(orderId, response),
    onSuccess: () => {
      queryClient.invalidateQueries(orderKeys.lists());
    },
  });

  return {
    // Data
    orders,
    
    // Loading states
    isLoading,
    error,
    
    // Refetch function
    refetch,
    
    // Mutations
    createOrder: createOrderMutation.mutateAsync,
    respondToQuote: respondToQuoteMutation.mutateAsync,
    
    // Computed states
    hasOrders: orders.length > 0,
    isEmpty: !isLoading && orders.length === 0,
  };
};
