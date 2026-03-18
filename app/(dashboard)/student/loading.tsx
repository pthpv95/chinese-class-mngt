export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800 rounded-xl" />
      ))}
    </div>
  )
}
