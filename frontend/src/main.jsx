// Vite + React entry point.
// index.html referencira ovaj fajl kao "/src/main.jsx".
// Mounta <App /> u #root i uvozi globalni CSS (paleta boja škole iz CONSTITUTION.md P-4).
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
