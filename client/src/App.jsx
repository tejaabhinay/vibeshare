import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import './App.css';

const API_BASE_URL = 'https://vibeshare-nmmi.onrender.com';

function App() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [roomName, setRoomName] = useState('');
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch photos when user joins a room
  useEffect(() => {
    if (user) {
      fetchPhotos();
      // Poll for new photos every 3 seconds
      const interval = setInterval(fetchPhotos, 3000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchPhotos = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/photos/${user.roomName}`);
      setPhotos(response.data);
    } catch (err) {
      console.error('Failed to fetch photos:', err);
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !roomName.trim()) {
      setError('Please enter both username and room name');
      return;
    }

    setUser({
      username: username.trim(),
      roomName: roomName.trim(),
    });

    setUsername('');
    setRoomName('');
  };

  const onDrop = async (acceptedFiles) => {
    if (!acceptedFiles.length) {
      setError('Please drop valid image files');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      for (const file of acceptedFiles) {
        const formData = new FormData();
        // Field name must match server: upload.any() accepts any field name
        formData.append('vibePhoto', file);
        formData.append('roomName', user.roomName);
        formData.append('username', user.username);

        console.log('📤 Uploading file:', { name: file.name, size: file.size });

        const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        console.log('✅ Upload response:', response.data);
      }

      setSuccess(`Successfully uploaded ${acceptedFiles.length} photo(s)`);
      await fetchPhotos();
    } catch (err) {
      console.error('❌ Upload error:', err.response?.data || err.message);
      setError(`Failed to upload: ${err.response?.data?.error || err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
    },
  });

  const handleLogout = () => {
    setUser(null);
    setPhotos([]);
    setError('');
    setSuccess('');
  };

  // View 1: Login Screen
  if (!user) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1 className="app-title">🎨 VibeShare</h1>
          <p className="app-subtitle">Share your vibes with friends</p>

          <form onSubmit={handleLoginSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="roomName">Room Name</label>
              <input
                id="roomName"
                type="text"
                placeholder="Enter or join a room"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="form-input"
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="login-button">
              Enter Room
            </button>
          </form>
        </div>
      </div>
    );
  }

  // View 2: Gallery Screen
  return (
    <div className="gallery-container">
      <header className="gallery-header">
        <div className="header-content">
          <h1 className="app-title">🎨 VibeShare</h1>
          <p className="room-info">
            Room: <strong>{user.roomName}</strong> | User: <strong>{user.username}</strong>
          </p>
        </div>
        <button onClick={handleLogout} className="logout-button">
          Leave Room
        </button>
      </header>

      <div className="gallery-content">
        {/* Upload Zone */}
        <div
          {...getRootProps()}
          className={`dropzone ${isDragActive ? 'active' : ''} ${uploading ? 'uploading' : ''}`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div className="upload-progress">
              <div className="spinner"></div>
              <p>Uploading photos...</p>
            </div>
          ) : isDragActive ? (
            <div className="dropzone-content">
              <p className="dropzone-icon">📥</p>
              <p className="dropzone-text">Drop your photos here!</p>
            </div>
          ) : (
            <div className="dropzone-content">
              <p className="dropzone-icon">📸</p>
              <p className="dropzone-text">Drag & drop your photos here</p>
              <p className="dropzone-subtext">or click to select files</p>
            </div>
          )}
        </div>

        {/* Messages */}
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* Photos Grid */}
        <div className="photos-grid">
          {photos.length > 0 ? (
            photos.map((photo) => (
              <div key={photo._id} className="photo-card">
                <img src={photo.imageUrl} alt={photo.username} className="photo-image" />
                <div className="photo-info">
                  <p className="photo-username">by {photo.username}</p>
                  <p className="photo-date">
                    {new Date(photo.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-gallery">
              <p className="empty-icon">🖼️</p>
              <p className="empty-text">No photos yet. Be the first to share!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
