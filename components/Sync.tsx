import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import { Html5QrcodeScanner } from 'html5-qrcode';
import LZString from 'lz-string';
import { db } from '../services/db';
import { Wifi, Upload, Download, Smartphone, QrCode, CheckCircle, RefreshCw, X, ArrowRight } from 'lucide-react';

export const Sync: React.FC = () => {
  const [role, setRole] = useState<'host' | 'client' | null>(null);
  const [step, setStep] = useState(1);
  const [qrData, setQrData] = useState('');
  const [status, setStatus] = useState('');
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // WebRTC Refs
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  useEffect(() => {
    return () => {
      if (peerRef.current) peerRef.current.close();
    };
  }, []);

  const initializePeer = () => {
    const peer = new RTCPeerConnection({
      iceServers: [] // Local only, using mDNS candidates
    });

    peer.onicecandidate = (e) => {
      if (e.candidate === null) {
        // Gathering complete
        const sdp = JSON.stringify(peer.localDescription);
        const compressed = LZString.compressToBase64(sdp);
        setQrData(compressed);
        addLog('Signal generated. Scan this on the other device.');
      }
    };

    peer.onconnectionstatechange = () => {
      addLog(`Connection State: ${peer.connectionState}`);
      if (peer.connectionState === 'connected') {
        setConnected(true);
        setStatus('Connected via Local Network');
      }
    };

    peerRef.current = peer;
    return peer;
  };

  const startHost = async () => {
    setRole('host');
    setStep(2);
    addLog('Initializing Host...');
    
    const peer = initializePeer();
    
    // Create Data Channel
    const channel = peer.createDataChannel("sync");
    setupDataChannel(channel);
    
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
  };

  const startClient = async () => {
    setRole('client');
    setStep(2);
    addLog('Initializing Client...');
    
    const peer = initializePeer();

    peer.ondatachannel = (e) => {
      setupDataChannel(e.channel);
    };
  };

  const setupDataChannel = (channel: RTCDataChannel) => {
    dataChannelRef.current = channel;
    channel.onopen = () => addLog('Data Channel Open');
    channel.onmessage = (e) => handleDataMessage(e.data);
  };

  const handleDataMessage = (data: string) => {
    try {
      const payload = JSON.parse(data);
      if (payload.type === 'SYNC_DATA') {
        addLog('Received Data Payload...');
        const result = db.mergeData(payload.content);
        addLog(`Sync Complete! Added ${result?.newSalesCount} new sales.`);
        alert("Synchronization Successful!");
      }
    } catch (e) {
      console.error(e);
      addLog('Error parsing incoming data');
    }
  };

  const syncNow = () => {
    if (dataChannelRef.current?.readyState === 'open') {
      const allData = db.getAllData();
      dataChannelRef.current.send(JSON.stringify({
        type: 'SYNC_DATA',
        content: allData
      }));
      addLog('Data sent to peer.');
    } else {
      addLog('Channel not ready.');
    }
  };

  // QR Scanner Logic
  useEffect(() => {
    if (step === 3 && role) {
      const scannerId = "reader";
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const scanner = new Html5QrcodeScanner(
          scannerId, 
          { fps: 10, qrbox: { width: 250, height: 250 } },
          /* verbose= */ false
        );
        
        scanner.render(async (decodedText) => {
          scanner.clear();
          addLog('QR Scanned successfully.');
          
          try {
            const sdpStr = LZString.decompressFromBase64(decodedText);
            const remoteDesc = JSON.parse(sdpStr);
            
            if (role === 'client') {
              // Client scans Host Offer
              if (!peerRef.current) return;
              await peerRef.current.setRemoteDescription(remoteDesc);
              const answer = await peerRef.current.createAnswer();
              await peerRef.current.setLocalDescription(answer);
              setStep(4); // Show Answer QR
            } else {
               // Host scans Client Answer
               if (!peerRef.current) return;
               await peerRef.current.setRemoteDescription(remoteDesc);
               addLog('Remote description set. Waiting for connection...');
               setStep(4); // Connection should happen now
            }
          } catch (e) {
            addLog('Error processing QR data: ' + e);
          }
        }, (error) => {
          // console.warn(error);
        });

        return () => {
            try { scanner.clear(); } catch(e){}
        };
      }, 500);
    }
  }, [step, role]);

  const reset = () => {
    window.location.reload();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <RefreshCw className="text-blue-600" />
          System-to-System Sync
        </h2>
        <p className="text-slate-500 mt-1">
          Synchronize data between devices on the same WiFi network (e.g. Phone Hotspot) without internet.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Connection Panel */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 min-h-[500px] flex flex-col">
          
          {step === 1 && (
            <div className="flex-1 flex flex-col justify-center gap-6">
              <button 
                onClick={startHost}
                className="p-6 border-2 border-slate-100 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
              >
                <div className="flex items-center gap-4 mb-2">
                  <div className="bg-blue-100 p-3 rounded-full text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Upload size={24} />
                  </div>
                  <div>
                     <h3 className="font-bold text-lg text-slate-800">Host (Sender)</h3>
                     <p className="text-sm text-slate-500">I have the data to share</p>
                  </div>
                </div>
              </button>

              <button 
                onClick={startClient}
                className="p-6 border-2 border-slate-100 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group"
              >
                <div className="flex items-center gap-4 mb-2">
                  <div className="bg-emerald-100 p-3 rounded-full text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Download size={24} />
                  </div>
                  <div>
                     <h3 className="font-bold text-lg text-slate-800">Client (Receiver)</h3>
                     <p className="text-sm text-slate-500">I want to receive data</p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {step >= 2 && !connected && (
             <div className="flex-1 flex flex-col items-center space-y-6">
                <div className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                   <h3 className="font-bold text-slate-700">
                     {role === 'host' ? 'Step 1: Host Offer' : 'Step 2: Client Answer'}
                   </h3>
                   <p className="text-xs text-slate-500 mb-4">
                     {role === 'host' ? 'Ask the Client to scan this code' : 'Ask the Host to scan this code'}
                   </p>
                   
                   {qrData ? (
                     <div className="bg-white p-2 rounded-lg inline-block border shadow-sm">
                       <QRCode value={qrData} size={200} level="L" />
                     </div>
                   ) : (
                     <div className="h-[200px] flex items-center justify-center">
                        <span className="loading-spinner">Generating Signal...</span>
                     </div>
                   )}
                </div>

                <div className="flex items-center text-slate-400">
                   <ArrowRight className="rotate-90 md:rotate-0" />
                </div>

                <button 
                   onClick={() => setStep(3)}
                   className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                   <QrCode size={18} />
                   Scan Peer's Code
                </button>
             </div>
          )}

          {step === 3 && !connected && (
            <div className="flex-1">
               <h3 className="font-bold text-center mb-4">Scan {role === 'host' ? 'Client Answer' : 'Host Offer'}</h3>
               <div id="reader" className="w-full h-[300px] bg-black rounded-xl overflow-hidden"></div>
               <button onClick={() => setStep(2)} className="mt-4 text-center w-full text-slate-500 text-sm hover:underline">Cancel Scan</button>
            </div>
          )}

          {connected && (
             <div className="flex-1 flex flex-col items-center justify-center space-y-6 animate-fade-in">
                <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 animate-bounce">
                   <Wifi size={48} />
                </div>
                <div className="text-center">
                   <h2 className="text-2xl font-bold text-slate-800">Connected!</h2>
                   <p className="text-slate-500">Secure P2P Link Established</p>
                </div>

                <button 
                  onClick={syncNow}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
                >
                  <RefreshCw size={24} />
                  Sync Data Now
                </button>
             </div>
          )}

        </div>

        {/* Logs & Info */}
        <div className="space-y-6">
           <div className="bg-slate-900 text-green-400 p-6 rounded-xl font-mono text-xs h-[300px] overflow-y-auto shadow-inner">
              <div className="mb-2 text-slate-500"># System Log</div>
              {logs.map((log, i) => (
                <div key={i} className="mb-1">> {log}</div>
              ))}
              {!logs.length && <span className="opacity-50">Waiting for actions...</span>}
           </div>

           <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 text-sm">
             <h4 className="font-bold flex items-center gap-2 mb-2">
               <Smartphone size={16} /> Instructions
             </h4>
             <ul className="list-disc pl-4 space-y-1 opacity-90">
               <li>Ensure both devices are on the <b>same WiFi network</b> (or one is hotspotting the other).</li>
               <li>Device A selects <b>Host</b>. Device B selects <b>Client</b>.</li>
               <li>Scan the QR codes sequentially to exchange connection signals.</li>
               <li>Once connected, click "Sync Data" to merge sales and inventory.</li>
             </ul>
           </div>
           
           <button onClick={reset} className="text-slate-400 text-sm hover:text-red-500 flex items-center gap-1">
             <X size={14} /> Reset Connection
           </button>
        </div>

      </div>
    </div>
  );
};