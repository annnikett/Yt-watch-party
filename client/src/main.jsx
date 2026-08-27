import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./styles.css";

// Note: intentionally not wrapping in <React.StrictMode>. StrictMode's
// dev-only double-invoke of effects would mount Room.jsx, connect + join a
// room, immediately "unmount" (leave_room + disconnect) to simulate a
// remount, which deletes the just-created room since it's momentarily
// empty, then remount for real against a room the server has already
// discarded. Fine for most components, but this one has real side effects
// (server-side room lifecycle) that shouldn't fire twice.
ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);