export default function Loading() {
  return (
    <div className="max-w-2xl animate-pulse">
      <div className="h-7 w-36 bg-gray-200 dark:bg-gray-800 rounded mb-6" />
      <div className="space-y-4">
        <div className="h-10 w-full bg-gray-200 dark:bg-gray-800 rounded-lg" />
        <div className="h-10 w-full bg-gray-200 dark:bg-gray-800 rounded-lg" />
        <div className="h-10 w-full bg-gray-200 dark:bg-gray-800 rounded-lg" />
        <div className="h-32 w-full bg-gray-200 dark:bg-gray-800 rounded-lg" />
        <div className="h-10 w-28 bg-gray-200 dark:bg-gray-800 rounded-lg" />
      </div>
    </div>
  )
}
