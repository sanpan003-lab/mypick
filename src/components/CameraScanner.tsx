import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, X, RefreshCcw } from 'lucide-react';

interface CameraScannerProps {
  onCapture: (base64Image: string) => void;
  onClose: () => void;
}

export function CameraScanner({ onCapture, onClose }: CameraScannerProps) {
  const webcamRef = useRef<Webcam>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      onCapture(imageSrc);
    }
  }, [webcamRef, onCapture]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  return (
    <div className="fixed inset-0 bg-black z-[150] flex flex-col">
      <div className="flex justify-between items-center p-4 text-white z-10 bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={onClose} className="p-2 rounded-full bg-black/40 hover:bg-black/60">
          <X size={24} />
        </button>
        <button onClick={toggleCamera} className="p-2 rounded-full bg-black/40 hover:bg-black/60">
          <RefreshCcw size={24} />
        </button>
      </div>
      
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode }}
          className="w-full h-full object-cover"
          disablePictureInPicture={false}
          forceScreenshotSourceSize={false}
          imageSmoothing={true}
          mirrored={false}
          minScreenshotHeight={undefined}
          minScreenshotWidth={undefined}
          screenshotQuality={0.92}
          onUserMedia={() => {}}
          onUserMediaError={() => {}}
        />
        
        {/* Viewfinder overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-64 h-64 border-2 border-white/50 rounded-lg relative">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg"></div>
          </div>
        </div>
      </div>

      <div className="p-6 pb-10 bg-black flex justify-center items-center">
        <button 
          onClick={capture}
          className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-white/20 hover:bg-white/40 transition-colors"
        >
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
            <Camera size={32} className="text-black" />
          </div>
        </button>
      </div>
    </div>
  );
}
