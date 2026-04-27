import axios from 'axios';

function App() {
  const checkBackend = async () => {
    // This connects to YOUR server
    const response = await axios.get('http://localhost:5001/');
    alert(response.data); 
  };

  return (
    <div>
      <h1>LawSync Frontend</h1>
      <button onClick={checkBackend}>Test Connection</button>
    </div>
  );
}