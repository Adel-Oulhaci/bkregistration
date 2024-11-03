import { useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode.react';
import { db } from './firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { Download } from 'lucide-react';

function RegistrationForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [qrCodeData, setQrCodeData] = useState('');
  const [registrationId, setRegistrationId] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    console.log('Form submission started');
    
    try {
      // Check for existing email
      console.log('Checking for duplicate email:', formData.email);
      const registrationsRef = collection(db, "registrations");
      const q = query(registrationsRef, where("email", "==", formData.email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        console.log('Duplicate email found');
        setError('This email is already registered.');
        return;
      }

      console.log('Adding new registration to Firestore');
      // Add new registration with check-in history
      const docRef = await addDoc(registrationsRef, {
        ...formData,
        timestamp: new Date().toISOString(),
        status: 'active',
        checkIns: [], // Array to store check-in history
        totalCheckIns: 0,
        lastCheckIn: null
      });

      console.log('Document written with ID:', docRef.id);
      setRegistrationId(docRef.id);

      // Create QR code data
      const qrData = {
        id: docRef.id,
        ...formData
      };
      
      setQrCodeData(JSON.stringify(qrData));
      setSubmitted(true);
      console.log('Registration completed successfully');
      
    } catch (error) {
      console.error('Error in form submission:', error);
      setError('Failed to submit form. Please try again. Error: ' + error.message);
    }
  };

  const downloadQRCode = () => {
    const canvas = document.getElementById("qr-code");
    if (canvas) {
      const pngUrl = canvas
        .toDataURL("image/png")
        .replace("image/png", "image/octet-stream");
      
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `qrcode-${formData.firstName}-${formData.lastName}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      phone: '',
      email: ''
    });
    setSubmitted(false);
    setQrCodeData('');
    setError('');
    setRegistrationId('');
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white mx-8 md:mx-0 shadow rounded-3xl sm:p-10">
          <div className="max-w-md mx-auto">
            <div className="flex items-center space-x-5">
              <div className="block pl-2 font-semibold text-xl self-start text-gray-700">
                <h2 className="leading-relaxed">Registration Form</h2>
              </div>
            </div>
            
            {error && (
              <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}

            {!submitted ? (
              <form onSubmit={handleSubmit} className="divide-y divide-gray-200">
                <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                  <div className="flex flex-col">
                    <label className="leading-loose">First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="px-4 py-2 border focus:ring-gray-500 focus:border-gray-900 w-full sm:text-sm border-gray-300 rounded-md focus:outline-none text-gray-600"
                      required
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="leading-loose">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="px-4 py-2 border focus:ring-gray-500 focus:border-gray-900 w-full sm:text-sm border-gray-300 rounded-md focus:outline-none text-gray-600"
                      required
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="leading-loose">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="px-4 py-2 border focus:ring-gray-500 focus:border-gray-900 w-full sm:text-sm border-gray-300 rounded-md focus:outline-none text-gray-600"
                      required
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="leading-loose">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="px-4 py-2 border focus:ring-gray-500 focus:border-gray-900 w-full sm:text-sm border-gray-300 rounded-md focus:outline-none text-gray-600"
                      required
                    />
                  </div>
                </div>
                <div className="pt-4 flex items-center space-x-4">
                  <button
                    type="submit"
                    className="bg-blue-500 flex justify-center items-center w-full text-white px-4 py-3 rounded-md focus:outline-none hover:bg-blue-600"
                  >
                    Submit
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Registration Complete!</h3>
                <div className="flex flex-col items-center">
                  {qrCodeData && (
                    <>
                      <QRCode
                        id="qr-code"
                        value={qrCodeData}
                        size={256}
                        level="H"
                        className="mb-4"
                      />
                      <button
                        onClick={downloadQRCode}
                        className="flex items-center space-x-2 mb-4 bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
                      >
                        <Download size={20} />
                        <span>Download QR Code</span>
                      </button>
                    </>
                  )}
                  <div className="space-y-4 w-full">
                    <Link
                      to="/scan"
                      className="block text-center text-blue-500 hover:text-blue-600 underline mb-2"
                    >
                      Go to Scanner
                    </Link>
                    <button
                      onClick={resetForm}
                      className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 w-full"
                    >
                      Register Another Person
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegistrationForm;