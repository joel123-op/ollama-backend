export default function InputBar() {
  return (
    <form className="p-4 bg-zinc-900 border-t border-zinc-700 flex items-center">
      <input
        type="text"
        placeholder="Ask something..."
        className="flex-1 p-2 bg-zinc-800 text-white border border-zinc-600 rounded-lg focus:outline-none"
      />
      <button
        type="submit"
        className="ml-3 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg"
      >
        Send
      </button>
    </form>
  );
}
 
