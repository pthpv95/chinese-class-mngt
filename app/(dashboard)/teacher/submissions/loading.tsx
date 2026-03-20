export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6">
        <div className="h-6 w-56 bg-gray-200 dark:bg-gray-800 rounded mb-2" />
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <div>
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-1.5" />
              <div className="h-3 w-40 bg-gray-200 dark:bg-gray-800 rounded" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-6 w-16 bg-gray-200 dark:bg-gray-800 rounded-full" />
              <div className="h-4 w-14 bg-gray-200 dark:bg-gray-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
