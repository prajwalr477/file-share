import './App.css';
import FileShare from './FileShare/FileShare'; // Updated path to the FileShare component

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <FileShare /> {/* Render the FileShare component */}
      </header>
    </div>
  );
}

export default App;
