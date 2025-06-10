import React from 'react';

function FileList({ files }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold">Uploaded Files</h2>
      <ul className="list-disc list-inside">
        {files.map((f, idx) => (
          <li key={idx}>{f}</li>
        ))}
      </ul>
    </div>
  );
}

export default FileList;