import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import './App.css';

// ✅ FIX: Added '/api' to the end so it matches your backend routes
const API_BASE_URL = 'https://vibeshare-nmmi.onrender.com/api';

// Lightbox Modal Component
function LightboxModal({ isOpen, photo, onClose, onPrevious, onNext }) {
  if (!isOpen || !photo) return null;

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-container" onClick={(e) => e.stopPropagation()}>
        <button className="lightbox-close" onClick={onClose}>✕</button>
        <button className="lightbox-prev" onClick={onPrevious}>‹</button>
        
        <div className="lightbox-content">
          <img src={photo.imageUrl} alt={photo.username} className="lightbox-image" />
          <div className="lightbox-info">
            <p className="lightbox-username">📸 by {photo.username}</p>
            <p className="lightbox-date">
              {new Date(photo.createdAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            <button className="lightbox-download" onClick={() => downloadImage(photo.imageUrl, photo.username)}>
              ⬇️ Download
            </button>
          </div>
        </div>

        <button className="lightbox-next" onClick={onNext}>›</button>
      </div>
    </div>
  );
}

// Download Handler
const downloadImage = (imageUrl, username) => {
  const link = document.createElement('a');
  link.href = imageUrl;
  link.download = `${username}-photo-${Date.now()}.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

function App() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [roomName, setRoomName] = useState('');
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  // Fetch photos when user joins a room
  useEffect(() => {
    if (user) {
      fetchPhotos();
      const interval = setInterval(fetchPhotos, 3000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchPhotos = async () => {
    try {
      // This now correctly calls: .../api/photos/roomName
      const response = await axios.get(`${API_BASE_URL}/photos/${user.roomName}`);
      setPhotos(response.data);
    } catch (err) {
      console.error('Failed to fetch photos:', err);
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault(); // Prevents page reload
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
        formData.append('vibePhoto', file);
        formData.append('roomName', user.roomName);
        formData.append('username', user.username);

        console.log('📤 Uploading file:', { name: file.name, size: file.size });

        // This now correctly calls: .../api/upload
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
    setLightboxOpen(false);
    setSelectedPhoto(null);
  };

  // Open lightbox with photo
  const openLightbox = (photo, index) => {
    setSelectedPhoto(photo);
    setSelectedPhotoIndex(index);
    setLightboxOpen(true);
  };

  // Navigate to previous photo
  const handlePreviousPhoto = () => {
    const newIndex = (selectedPhotoIndex - 1 + photos.length) % photos.length;
    setSelectedPhoto(photos[newIndex]);
    setSelectedPhotoIndex(newIndex);
  };

  // Navigate to next photo
  const handleNextPhoto = () => {
    const newIndex = (selectedPhotoIndex + 1) % photos.length;
    setSelectedPhoto(photos[newIndex]);
    setSelectedPhotoIndex(newIndex);
  };

  // Group photos by username (owner)
  const groupedPhotos = photos.reduce((acc, photo) => {
    if (!acc[photo.username]) {
      acc[photo.username] = [];
    }
    acc[photo.username].push(photo);
    return acc;
  }, {});

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
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* Lightbox Modal */}
        <LightboxModal
          isOpen={lightboxOpen}
          photo={selectedPhoto}
          onClose={() => setLightboxOpen(false)}
          onPrevious={handlePreviousPhoto}
          onNext={handleNextPhoto}
        />

        {/* Grouped Photos by Owner with Carousel */}
        {photos.length > 0 ? (
          <div className="owner-groups">
            {Object.entries(groupedPhotos).map(([ownerName, ownerPhotos]) => (
              <div key={ownerName} className="owner-group">
                <h2 className="owner-title">📸 {ownerName}'s Photos</h2>
                <div className="carousel-container">
                  <div className="carousel">
                    {ownerPhotos.map((photo, index) => {
                      const globalIndex = photos.findIndex((p) => p._id === photo._id);
                      return (
                        <div
                          key={photo._id}
                          className="carousel-item"
                          onClick={() => openLightbox(photo, globalIndex)}
                        >
                          <img
                            src={photo.imageUrl}
                            alt={ownerName}
                            className="carousel-image"
                          />
                          <div className="carousel-overlay">
                            <span className="expand-icon">🔍</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-gallery">
            <p className="empty-icon">🖼️</p>
            <p className="empty-text">No photos yet. Be the first to share!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;