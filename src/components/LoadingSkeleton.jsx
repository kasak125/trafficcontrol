function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="glass-panel h-24 animate-pulse" />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="glass-panel h-40 animate-pulse" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="glass-panel h-[26rem] animate-pulse" />
        <div className="glass-panel h-[26rem] animate-pulse" />
      </div>
    </div>
  );
}

export default LoadingSkeleton;
