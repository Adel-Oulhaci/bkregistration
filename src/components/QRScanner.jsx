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
  const [cameraList, setCameraList] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [debugInfo, setDebugInfo] = useState('');

  const addDebugInfo = (info) => {
    setDebugInfo(prev => `${prev}\n${info}`);
    console.log(info);
  };

  useEffect(() => {
    // List available cameras on component mount
    const getCameras = async () => {
      try {
        addDebugInfo('Requesting camera list...');
        const devices = await Html5Qrcode.getCameras();
        addDebugInfo(`Found ${devices.length} cameras`);
        setCameraList(devices);
        if (devices.length > 0) {
          setSelectedCamera(devices[devices.length - 1].id); // Usually back camera
        }
        devices.forEach(device => {
          addDebugInfo(`Camera: ${device.label} (${device.id})`);
        });
      } catch (err) {
        addDebugInfo(`Error getting cameras: ${err.message}`);
        setError(`Error accessing cameras: ${err.message}`);
      }
    };

    getCameras();
  }, []);

  const startScanning = async () => {
    try {
      addDebugInfo('Starting scanner...');
      setError('');
      setIsScanning(true);

      if (!selectedCamera) {
        throw new Error('No camera selected');
      }

      addDebugInfo(`Initializing scanner with camera: ${selectedCamera}`);
      const html5QrCode = new Html5Qrcode("reader");

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        formatsToSupport: [Html5Qrcode.QrFormat.QR_CODE]
      };

      addDebugInfo('Starting camera stream...');
      await html5QrCode.start(
        selectedCamera,
        config,
        async (decodedText) => {
          addDebugInfo(`QR Code detected: ${decodedText}`);
          await handleScanSuccess(decodedText, html5QrCode);
        },
        (errorMessage) => {
          addDebugInfo(`Scanning error: ${errorMessage}`);
        }
      );

      addDebugInfo('Scanner started successfully');
    } catch (err) {
      addDebugInfo(`Error in startScanning: ${err.message}`);
      setError(`Failed to start scanner: ${err.message}`);
      setIsScanning(false);
    }
  };

  const handleScanSuccess = async (result, scanner) => {
    try {
      addDebugInfo('Processing scan result...');
      const scannedData = JSON.parse(result);
      
      if (!scannedData.id) {
        throw new Error('Invalid QR code format: missing ID');
      }

      const docRef = doc(db, "registrations", scannedData.id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        
        if (data.email === scannedData.email) {
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

          if (scanner) {
            await scanner.stop();
          }
          setIsScanning(false);
          setScanResult({
            ...data,
            lastCheckIn: checkInData,
            totalCheckIns: (data.totalCheckIns || 0) + 1
          });
          setCheckInStatus('Check-in successful!');
          addDebugInfo('Check-in processed successfully');
        } else {
          setError('Invalid QR code data: email mismatch');
        }
      } else {
        setError('Registration not found in database');
      }
    } catch (err) {
      addDebugInfo(`Error processing scan: ${err.message}`);
      setError(`Error processing QR code: ${err.message}`);
    }
  };

  const handleReset = async () => {
    addDebugInfo('Resetting scanner...');
    try {
      const html5QrCode = new Html5Qrcode("reader");
      if (html5QrCode) {
        await html5QrCode.stop();
      }
    } catch (err) {
      addDebugInfo(`Error in reset: ${err.message}`);
    }
    setScanResult(null);
    setError('');
    setCheckInStatus('');
    setIsScanning(false);
    setDebugInfo('');
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white mx-8 md:mx-0 shadow rounded-3xl sm:p-10">
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-semibold mb-6">QR Code Scanner</h2>
            
            {/* Debug Information */}
            {debugInfo && (
              <div className="mb-4 p-3 bg-gray-100 text-gray-700 rounded-md text-sm font-mono whitespace-pre-wrap">
                Debug Info:
                {debugInfo}
              </div>
            )}

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
                {cameraList.length > 0 && !isScanning && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Camera
                    </label>
                    <select
                      value={selectedCamera}
                      onChange={(e) => setSelectedCamera(e.target.value)}
                      className="w-full p-2 border rounded-md mb-4"
                    >
                      {cameraList.map((camera) => (
                        <option key={camera.id} value={camera.id}>
                          {camera.label || `Camera ${camera.id}`}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={startScanning}
                      className="block w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                    >
                      Start Scanner
                    </button>
                  </div>
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
