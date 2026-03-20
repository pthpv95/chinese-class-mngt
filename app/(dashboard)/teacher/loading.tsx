export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-8">
        <div className="h-7 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        <div className="h-9 w-40 bg-gray-200 dark:bg-gray-800 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-start justify-between mb-3">
              <div className="h-5 w-36 bg-gray-200 dark:bg-gray-800 rounded" />
              <div className="h-5 w-16 bg-gray-200 dark:bg-gray-800 rounded" />
            </div>
            <div className="flex gap-4">
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded" />
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
