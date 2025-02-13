import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home/Home";
import CreateEvent from "./pages/CreateEvent/CreateEvent";
import EventDetail from "./pages/EventDetail/EventDetail";
import "./App.css";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/api/event" element={<CreateEvent />} />
        <Route path="/api/events/:id" element={<EventDetail />} />
      </Routes>
    </>
  );
}

export default App;
