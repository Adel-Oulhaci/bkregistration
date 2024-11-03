import { Routes, Route } from 'react-router-dom';
import RegistrationForm from './components/RegistrationForm';
import QRScanner from './components/QRScanner';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<RegistrationForm />} />
      <Route path="/scan" element={<QRScanner />} />
    </Routes>
  );
}

export default App;