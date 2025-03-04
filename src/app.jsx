import React, { useState, useEffect } from 'react';

export default function App() {
  const [printers, setPrinters] = useState([]);
  const [loggedIn, setLoggedIn] = useState(false);

  const handleLogin = () => {
    // Simple password check
    const password = prompt('Enter password');
    if (password === '1234') setLoggedIn(true);
  };

  const discoverPrinters = async () => {
    const foundPrinters = await window.electron.discoverPrinters();
    setPrinters(foundPrinters);
  };

  const registerPrinter = async (ip) => {
    await window.electron.registerPrinter({ ip, name: `Printer ${ip}` });
    alert('Printer registered successfully!');
  };

  if (!loggedIn) {
    return (
      <div className="login">
        <button onClick={handleLogin}>Login</button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h1>Printer Management</h1>
      
      <button onClick={discoverPrinters}>
        Scan for Printers
      </button>

      <div className="printer-list">
        {printers.map(printer => (
          <div key={printer.ip} className="printer-card">
            <h3>{printer.ip}</h3>
            <p>Status: {printer.status}</p>
            <button onClick={() => registerPrinter(printer.ip)}>
              Add Printer
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}