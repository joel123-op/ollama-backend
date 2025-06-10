export default function Sidebar() {
  return (
    <div className="w-64 bg-zinc-800 p-4 text-white h-full border-r border-zinc-700 overflow-y-auto">
      <h2 className="text-lg font-bold mb-4">History</h2>
      <ul className="space-y-2 text-sm">
        <li className="p-2 rounded hover:bg-zinc-700">Chat 1</li>
        <li className="p-2 rounded hover:bg-zinc-700">career_guide.pdf</li>
      </ul>
    </div>
  );
}
