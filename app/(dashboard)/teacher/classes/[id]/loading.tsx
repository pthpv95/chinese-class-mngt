export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-800 rounded mb-2" />
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-800 rounded" />
        </div>
        <div className="h-9 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-5 w-16 bg-gray-200 dark:bg-gray-800 rounded-full" />
                <div className="h-5 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
              </div>
              <div className="h-5 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
