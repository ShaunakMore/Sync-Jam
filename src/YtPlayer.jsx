import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from "react";

const YouTubePlayer = forwardRef(({ initialVideoId }, ref) => {
  // This component is a wrapper for the YouTube IFrame Player API
  const playerRef = useRef(null);
  const playerInstance = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    // Function to load the YouTube player
    function loadPlayer() {
      if (!playerRef.current || isCancelled) return;

      //Create a new YouTube player instance
      playerInstance.current = new window.YT.Player(playerRef.current, {
        height: "360",
        width: "640",
        videoId: initialVideoId,
        events: {
          onReady: () => {
            console.log("Player ready!");
            setIsReady(true);
          },
        },
      });
    }
    // Check if the YouTube IFrame API is already loaded
    // If not, load it dynamically
    if (!window.YT || !window.YT.Player) 
      {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);

      window.onYouTubeIframeAPIReady = loadPlayer;
    } else {
      loadPlayer();
    }

    return () => {
      isCancelled = true;
      if (playerInstance.current) {
        playerInstance.current.destroy();
      }
    };
  }, []);

  // Expose player methods to parent component via ref
  // This allows the parent component to control the player (play, pause, seek, etc.)
  useImperativeHandle(ref, () => ({
    play: () => {
      if (playerInstance.current) {
        console.log("Playing video");
        playerInstance.current.playVideo();
      }
    },
    pause: () => {
      if (playerInstance.current) {
        console.log("Pausing video");
        playerInstance.current.pauseVideo();
      }
    },
    seekTo: (seconds) => {
      if (playerInstance.current) {
        console.log("Seeking to", seconds);
        playerInstance.current.seekTo(seconds, true);
      }
    },
    loadVideoById: (id) => {
      if (playerInstance.current) {
        console.log("Loading video:", id);
        playerInstance.current.loadVideoById(id);
        playerInstance.current.playVideo();
      } else {
        console.error("Player instance not available");
      }
    },
    getCurrentTime: () => {
      return playerInstance.current?.getCurrentTime() || 0;
    },
  }), [isReady]);

  return (
    <div className="player-wrapper">
      <div ref={playerRef} id="yt-player-container"></div>
    </div>
  );
});

export default YouTubePlayer;