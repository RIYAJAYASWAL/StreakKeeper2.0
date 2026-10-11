import React from 'react';
import { SkeletonCard, SkeletonRow } from './Skeleton';
import { EmptyState, EmptyStateProps } from './EmptyState';
import { Button } from './Button';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Card } from './Card';

export interface DataStateWrapperProps {
  isLoading: boolean;
  isError?: boolean;
  error?: Error | null;
  isEmpty?: boolean;
  onRetry?: () => void;
  loadingVariant?: 'cards' | 'rows' | 'custom';
  loadingCount?: number;
  customSkeleton?: React.ReactNode;
  emptyState?: EmptyStateProps;
  children: React.ReactNode;
}

export function DataStateWrapper({
  isLoading,
  isError = false,
  error,
  isEmpty = false,
  onRetry,
  loadingVariant = 'cards',
  loadingCount = 3,
  customSkeleton,
  emptyState,
  children,
}: DataStateWrapperProps) {
  // 1. Loading State
  if (isLoading) {
    if (customSkeleton) return <>{customSkeleton}</>;
    return (
      <div className={loadingVariant === 'cards' ? 'grid grid-cols-1 md:grid-cols-3 gap-4' : 'space-y-3'}>
        {Array.from({ length: loadingCount }).map((_, i) =>
          loadingVariant === 'cards' ? (
            <SkeletonCard key={i} />
          ) : (
            <SkeletonRow key={i} />
          )
        )}
      </div>
    );
  }

  // 2. Error State
  if (isError) {
    return (
      <Card className="p-8 border-rose-200 bg-rose-50/40 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-navy-900">Failed to load data</h4>
        <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
          {error?.message || 'A network or server error occurred while retrieving this content.'}
        </p>
        {onRetry && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onRetry}
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            Try Again
          </Button>
        )}
      </Card>
    );
  }

  // 3. Empty State
  if (isEmpty && emptyState) {
    return <EmptyState {...emptyState} />;
  }

  // 4. Content
  return <>{children}</>;
}
