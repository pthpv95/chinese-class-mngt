export default function Loading() {
  return (
    <div className="max-w-2xl animate-pulse">
      <div className="mb-5 sm:mb-6">
        <div className="h-3 w-24 bg-gray-200 dark:bg-gray-800 rounded mb-2" />
        <div className="h-6 w-64 bg-gray-200 dark:bg-gray-800 rounded" />
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 space-y-4">
        <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="h-4 w-4/6 bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="mt-4 h-10 w-28 bg-gray-200 dark:bg-gray-800 rounded-lg" />
      </div>
    </div>
  )
}
