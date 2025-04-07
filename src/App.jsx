
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";import { useState } from 'react'
import './App.css'
import LandingPage from './Landing Page'
import Room from './CreateRoom'
function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/room/:roomId" element={<Room />}/>
        </Routes>
      </div>
    </Router>
  )
}

export default App
