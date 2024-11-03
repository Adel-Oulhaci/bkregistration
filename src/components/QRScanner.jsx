import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Link } from 'react-router-dom';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

function QRScanner() {
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    console.log('Initializing QR scanner');
    const scanner = new Html5QrcodeScanner('reader', {
      qrbox: {
        width: 250,
        height: 250,
      },
      fps: 5,
    });

    async function success(result) {
      console.log('QR Code scanned:', result);
      try {
        const scannedData = JSON.parse(result);
        console.log('Parsed QR data:', scannedData);

        if (!scannedData.id) {
          throw new Error('Invalid QR code format: missing ID');
        }

        // Verify the registration in Firestore
        console.log('Fetching registration data from Firestore:', scannedData.id);
        const docRef = doc(db, "registrations", scannedData.id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('Registration found:', data);
          
          // Verify email match
          if (data.email === scannedData.email) {
            setIsScanning(false);
            scanner.clear();
            setScanResult(data);
          } else {
            console.log('Email mismatch');
            setError('Invalid QR code data: email mismatch');
          }
        } else {
          console.log('Registration not found');
          setError('Registration not found in database');
        }
      } catch (err) {
        console.error('Error processing QR code:', err);
        setError(`Error processing QR code: ${err.message}`);
      }
    }

    function error(err) {
      console.warn('QR Scanner error:', err);
      setError(`Scanner error: ${err}`);
    }

    scanner.render(success, error);

    return () => {
      if (isScanning) {
        console.log('Cleaning up scanner');
        scanner.clear();
      }
    };
  }, [isScanning]);

  const handleReset = () => {
    setScanResult(null);
    setError('');
    setIsScanning(true);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white mx-8 md:mx-0 shadow rounded-3xl sm:p-10">
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-semibold mb-6">QR Code Scanner</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                {error}
                <button
                  onClick={handleReset}
                  className="block w-full mt-2 text-center text-red-700 underline"
                >
                  Try Again
                </button>
              </div>
            )}
            
            {scanResult ? (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Scanned Data:</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p><strong>First Name:</strong> {scanResult.firstName}</p>
                  <p><strong>Last Name:</strong> {scanResult.lastName}</p>
                  <p><strong>Email:</strong> {scanResult.email}</p>
                  <p><strong>Phone:</strong> {scanResult.phone}</p>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={handleReset}
                    className="block w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                  >
                    Scan Another Code
                  </button>
                  <Link
                    to="/"
                    className="block text-center text-blue-500 hover:text-blue-600 underline"
                  >
                    Back to Registration
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <div id="reader" className="mb-4"></div>
                <Link
                  to="/"
                  className="block text-center text-blue-500 hover:text-blue-600 underline"
                >
                  Back to Registration
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default QRScanner;
