export default function ChatWindow() {
  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-4">
      <div className="text-right">
        <div className="inline-block bg-green-600 px-4 py-2 rounded-lg">
          What are the careers in physics?
        </div>
      </div>
      <div className="text-left">
        <div className="inline-block bg-zinc-700 px-4 py-2 rounded-lg">
          You could explore research, data science, or teaching!
        </div>
      </div>
    </div>
  );
}

