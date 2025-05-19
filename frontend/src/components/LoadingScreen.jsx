// src/components/LoadingScreen.jsx
export function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div
      className="fixed inset-0 flex justify-center items-center bg-[#0a0a0f] bg-opacity-90 z-50 text-gray-400 text-lg font-medium"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center space-y-3">
        <div className="w-10 h-10 rounded-full border-4 border-[#00baff] border-t-transparent animate-spin"></div>
        <p>{message}</p>
      </div>
    </div>
  );
}
