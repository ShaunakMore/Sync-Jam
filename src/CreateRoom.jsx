import { useParams } from "react-router-dom";
import { doc, getDoc, deleteDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { useEffect, useState, useRef } from "react";
import Cookies from 'js-cookie';
import { useNavigate } from "react-router-dom";
import { nanoid } from "nanoid";
import "./CreateRoom.css";
import YouTubePlayer from "./YtPlayer";
import { io } from "socket.io-client";

export default function Room() {
  const { roomId } = useParams();
  const [room, setRoom] = useState(null);
  const [users, setUsers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const ytPlayerRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const socket = useRef(null);
  const socketInitialized = useRef(false);
  const apiKey = import.meta.env.VITE_YT_API_KEY;


  const navigate = useNavigate();

 
  useEffect(() => {
    const userIdFromCookie = Cookies.get("SyncJamUserId") || nanoid(5); // checks if userId exists in cookies, if not, generates a new one
    Cookies.set("SyncJamUserId", userIdFromCookie);
    setCurrentUserId(userIdFromCookie);

    const roomRef = doc(db, "rooms", roomId); // Reference to the room document in Firestore

    getDoc(roomRef).then((docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const userAlreadyInRoom = data.users?.some(u => u.id === userIdFromCookie);

        if (!userAlreadyInRoom) {
          const updatedUsers = [...(data.users || []), { id: userIdFromCookie }];
          setDoc(roomRef, { users: updatedUsers }, { merge: true });
        }
      } else {
        console.log("Room doesn't exist, redirecting to home");
        navigate("/");
      }
    }).catch(error => {
      console.error("Error checking room:", error);
      navigate("/");
    });

    const unsubscribe = onSnapshot(roomRef, (docSnap) => { // Fetching the room data in real-time
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRoom(data);

        if (Array.isArray(data.users)) {
          const formattedUsers = data.users.map(user =>
            typeof user === 'string' ? { id: user } : user
          );
          setUsers(formattedUsers);
        } else {
          setUsers([]);
        }

        setIsAdmin(data.adminId === userIdFromCookie); // Check if the current user is the admin
      } else {
        console.log("Room no longer exists!");
      }
    });

    return () => unsubscribe();
  }, [roomId, navigate]);

  useEffect(() => { 
    // Socket connection and event listeners
    if (socketInitialized.current) return; //
    
    socket.current = io("http://localhost:3001");
    socketInitialized.current = true;
    
    socket.current.emit("joinRoom", roomId);
    console.log("Joined room:", roomId);
   
    return () => {
      if (socket.current) {
        socket.current.disconnect();
        socketInitialized.current = false;
      }
    };
  }, [roomId]);
  
 
  useEffect(() => {
    if (!socket.current || !ytPlayerRef.current) return;
    
    // Clear any existing listeners first
    socket.current.off("play");
    socket.current.off("pause");
    socket.current.off("seek");
    socket.current.off("loadVideoById");
    socket.current.off("roomClosed");
    
    // Set up new listeners
    socket.current.on("play", () => {
      console.log("Socket event: play");
      ytPlayerRef.current?.play();
    });
    
    socket.current.on("pause", () => {
      console.log("Socket event: pause");
      ytPlayerRef.current?.pause();
    });
    
    socket.current.on("seek", (data) => {
      console.log("Socket event: seek to", data.time);
      ytPlayerRef.current?.seekTo(data.time);
    });
    
    socket.current.on("loadVideoById", ({ videoId }) => {
      console.log("Socket event: loadVideoById", videoId);
      ytPlayerRef.current?.loadVideoById(videoId);
    });
    
    
    socket.current.on("roomClosed", () => {
      console.log("Room was closed by admin, redirecting to home");
      navigate("/");
    });
    
  }, [ytPlayerRef.current, socket.current, navigate]);

  // Function to handle room deletion, called when the admin clicks the close room button
  const handleDeleteRoom = async () => {
    const roomRef = doc(db, "rooms", roomId);
    try {
     
      if (socket.current) {
        console.log("Emitting roomClosed event");
        socket.current.emit("roomClosed", roomId);
      }
      
      // Delete the room document from Firestore
      await deleteDoc(roomRef);
      console.log("Room deleted successfully");
      navigate("/");
    } catch (error) {
      console.error("Error deleting room:", error);
    }
  };

  // Function to copy the room URL to the clipboard, called when the admin clicks the copy link button
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      alert("Room URL copied to clipboard!");
    }).catch((err) => {
      console.error("Failed to copy URL:", err);
    });
  };

  // Functions to handle play, pause, and seek actions, called when respective buttons are clicked
  //Also emit events to the socket server so that all the users in the room can be notified
  const handlePlay = () => {
    console.log("Play button clicked");
    ytPlayerRef.current?.play();
    if (isAdmin) {
      socket.current.emit("play", roomId);
    }
  };

  const handlePause = () => {
    console.log("Pause button clicked");
    ytPlayerRef.current?.pause();
    if (isAdmin) {
      socket.current.emit("pause", roomId);
    }
  };

  const handleSeek = () => {
    const currentTime = ytPlayerRef.current?.getCurrentTime() || 0;
    console.log("Seek button clicked, current time:", currentTime);
    ytPlayerRef.current?.seekTo(currentTime + 30);
    if (isAdmin) {
      socket.current.emit("seek", { roomId, time: currentTime + 30 });
    }
  };

  const handleSyncMusic = () => {
    if (isAdmin) {
      const currentTime = ytPlayerRef.current?.getCurrentTime() || 0;
      console.log("Syncing music at time:", currentTime);
      socket.current.emit("seek", { roomId, time: currentTime });
    } else {
      alert("Only the admin can sync music!");
    }
  }

  const handleSearch = async () => {
    try {
      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(searchTerm)}&key=${apiKey}`);
      const data = await response.json();
      setSearchResults(data.items || []);
    } catch (error) {
      console.error("Error searching YouTube:", error);
    }
  };

  // Function to handle video selection from search results, called when a video is clicked
  // It loads the selected video in the YouTube player and emits an event to the socket server if the user is an admin
  const handleVideoSelect = (videoId) => {
    console.log("Selected video:", videoId);
    ytPlayerRef.current?.loadVideoById(videoId);
  
    if (isAdmin && socket.current) {
      console.log("Admin is changing video, emitting to others:", videoId);
      socket.current.emit("loadVideoById", {
        roomId,
        videoId,
      });
    }
  };

  return (
    <div className="room-container">
      {isAdmin && (
        <div className="admin-controls">
          <button className="close-room-btn" onClick={handleDeleteRoom}>❌ Close Room</button>
          <button className="copy-link-btn" onClick={handleCopyLink}>🔗 Copy Room URL</button>
        </div>
      )}

      <YouTubePlayer ref={ytPlayerRef} initialVideoId="dQw4w9WgXcQ" />

      <div className="room-controls">
        <button onClick={handlePlay}>▶️ Play</button>
        <button onClick={handlePause}>⏸ Pause</button>
        <button onClick={handleSeek}>⏩ Skip 30 sec</button>
        <button onClick={handleSyncMusic}>🔄 Sync Music</button>
      </div>

      <div className="yt-search">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search YouTube videos..."
        />
        <button onClick={handleSearch}>Search</button>

        <div className="search-results">
          {searchResults.map((video) => (
            <div key={video.id.videoId} onClick={() => handleVideoSelect(video.id.videoId)} className="search-item">
              <img src={video.snippet.thumbnails.default.url} alt={video.snippet.title} />
              <p>{video.snippet.title}</p>
            </div>
          ))}
        </div>
      </div>

      <h1 className="room-title">Room: {roomId}</h1>
      {isAdmin && <p className="admin-badge">👑 You are the admin</p>}

      <div className="user-bar">
        {users.map((user) => (
          <div key={user.id} className="user-avatar">
            <div className="icon">🎧</div>
            <span className="userid">{user.id}</span>
          </div>
        ))}
      </div>
    </div>
  );
}