import React, { useState } from 'react';
import axios from 'axios';

function Upload({ user, refreshFiles }) {
  const [file, setFile] = useState(null);

  const uploadFile = async (e) => {
    e.preventDefault();
    if (!file) return;
    const token = await user.getIdToken();
    const formData = new FormData();
    formData.append('file', file);

    await axios.post('http://localhost:5000/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
    });
    refreshFiles();
    setFile(null);
  };

  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold">Upload File</h2>
      <form onSubmit={uploadFile}>
        <input type="file" onChange={e => setFile(e.target.files[0])} className="mb-2" />
        <button type="submit" className="px-2 py-1 bg-green-500 text-white rounded">Upload</button>
      </form>
    </div>
  );
}

export default Upload;