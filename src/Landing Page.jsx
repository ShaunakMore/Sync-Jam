import "./Landing Page.css";
import { db } from "./firebase";
import { doc, setDoc, collection, addDoc, Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; 
import { v4 as uuidv4 } from "uuid";
import Cookies from 'js-cookie';
import { nanoid } from "nanoid";

export default function LandingPage() {
    const [isVisible, setIsVisible] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 1000);

        // Check if the user ID cookie exists, if not, create a new one
        // This is to ensure that each user has a unique ID for tracking purposes and also does not require login
        // This is important for the functionality of the app, as it allows users to join rooms without needing to log in
        if(!Cookies.get("SyncJamUserId")){
            const userId = nanoid(5);
            Cookies.set("SyncJamUserId", userId);
            console.log("User ID set:", userId);    
        }
        return () => clearTimeout(timer);
        
      
    }, []);
    
    // Function to handle room creation
    // This function generates a unique room ID, creates a new room document in Firestore, and navigates to the room page
    const handleCreateRoom = async() => {
        const roomId = uuidv4(); 
        const roomRef = doc(db, "rooms", roomId); 
        const adminid = Cookies.get("SyncJamUserId")
        await setDoc(roomRef, {
        id: roomId,
        adminId: adminid,
        createdAt: new Date(),
        users: [{ id: adminid }],
        currentTrack: null,
        isPlaying: false,
        });
        navigate(`/room/${roomId}`);
    };

    return (
        <div className="landing-page ">
            <h1>Sync Jam</h1>
            <p>Sync music with friends</p>
            <ul>
            <button className="btn btn-primary" onClick={handleCreateRoom}>
                Create Room
            </button>
            <button className="btn btn-secondary" >Learn More</button>
            </ul>
            


            <div className="about-section">
                <h2>About Sync Jam</h2>
                <p>Sync Jam is a web application that allows users to sync music with their friends in real-time without the need to create an account.</p>
                <p>With Sync Jam, you can listen to music together with your friends, no matter where you are.</p>
                <p>Sync Jam is perfect for parties, long-distance relationships, or just hanging out with friends.</p>
            </div>
        </div>
    );
}
