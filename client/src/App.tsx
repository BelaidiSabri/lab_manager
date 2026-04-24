import { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    axios
      .get('http://localhost:5000/')
      .then((res) => setMessage(res.data))
      .catch((err) => {
        console.error(err);
        setMessage('Error connecting to backend');
      });
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Frontend ↔ Backend Test</h1>
      <p>Backend says: <strong>{message || 'Loading...'}</strong></p>
    </div>
  );
}

export default App;