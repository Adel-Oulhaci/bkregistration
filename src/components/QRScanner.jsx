import { useState, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Link } from 'react-router-dom';
import { db } from './firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

function QRScanner() {
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [checkInStatus, setCheckInStatus] = useState('');
  const [html5QrCode, setHtml5QrCode] = useState(null);

  useEffect(() => {
    // Initialize scanner instance
    const scanner = new Html5Qrcode('reader');
    setHtml5QrCode(scanner);

    return () => {
      if (scanner && scanner.isScanning) {
        scanner.stop().catch(err => console.error('Error stopping scanner:', err));
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      setError('');
      setIsScanning(true);

      const cameras = await Html5Qrcode.getCameras();
      if (cameras && cameras.length > 0) {
        const camera = cameras[cameras.length - 1]; // Usually back camera
        
        await html5QrCode.start(
          camera.id,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          async (decodedText) => {
            await handleScanSuccess(decodedText);
          },
          (errorMessage) => {
            console.log(errorMessage);
          }
        );
      } else {
        setError('No cameras found on your device');
      }
    } catch (err) {
      setError('Error accessing camera: ' + err.message);
      setIsScanning(false);
    }
  };

  const handleScanSuccess = async (result) => {
    try {
      const scannedData = JSON.parse(result);
      
      if (!scannedData.id) {
        throw new Error('Invalid QR code format: missing ID');
      }

      // Verify the registration in Firestore
      const docRef = doc(db, "registrations", scannedData.id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Verify email match
        if (data.email === scannedData.email) {
          // Record check-in
          const now = new Date();
          const checkInData = {
            timestamp: now.toISOString(),
            date: now.toLocaleDateString(),
            time: now.toLocaleTimeString()
          };

          await updateDoc(docRef, {
            checkIns: arrayUnion(checkInData),
            totalCheckIns: (data.totalCheckIns || 0) + 1,
            lastCheckIn: checkInData
          });

          if (html5QrCode && html5QrCode.isScanning) {
            await html5QrCode.stop();
          }
          setIsScanning(false);
          setScanResult({
            ...data,
            lastCheckIn: checkInData,
            totalCheckIns: (data.totalCheckIns || 0) + 1
          });
          setCheckInStatus('Check-in successful!');
        } else {
          setError('Invalid QR code data: email mismatch');
        }
      } else {
        setError('Registration not found in database');
      }
    } catch (err) {
      setError(`Error processing QR code: ${err.message}`);
    }
  };

  const handleReset = async () => {
    if (html5QrCode && html5QrCode.isScanning) {
      await html5QrCode.stop();
    }
    setScanResult(null);
    setError('');
    setCheckInStatus('');
    setIsScanning(false);
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
                {checkInStatus && (
                  <div className="p-3 bg-green-100 text-green-700 rounded-md mb-4">
                    {checkInStatus}
                  </div>
                )}
                <h3 className="text-lg font-medium">Scanned Data:</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p><strong>First Name:</strong> {scanResult.firstName}</p>
                  <p><strong>Last Name:</strong> {scanResult.lastName}</p>
                  <p><strong>Email:</strong> {scanResult.email}</p>
                  <p><strong>Phone:</strong> {scanResult.phone}</p>
                  <p><strong>Total Check-ins:</strong> {scanResult.totalCheckIns}</p>
                  <p><strong>Last Check-in:</strong> {scanResult.lastCheckIn?.date} at {scanResult.lastCheckIn?.time}</p>
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
                {!isScanning && (
                  <button
                    onClick={startScanning}
                    className="block w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors mb-4"
                  >
                    Start Scanner
                  </button>
                )}
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
