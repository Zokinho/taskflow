export function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex justify-center py-12 ${className}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-500" />
    </div>
  );
}
