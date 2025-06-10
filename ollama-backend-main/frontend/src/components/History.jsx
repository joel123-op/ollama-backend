import React from 'react';

function History({ history }) {
  return (
    <div>
      <h2 className="text-lg font-semibold">Chat History</h2>
      <ul className="space-y-2">
        {history.map((h, idx) => (
          <li key={idx} className="bg-gray-200 p-2 rounded">
            <p><strong>Q:</strong> {h.question}</p>
            <p><strong>A:</strong> {h.answer}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default History;