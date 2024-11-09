import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './FileShare.css';

const socket = io('http://localhost:5000'); // Server URL

const FileShare = () => {
  const [file, setFile] = useState(null);
  const [peerConnection, setPeerConnection] = useState(new RTCPeerConnection());
  const [dataChannel, setDataChannel] = useState(null);
  const [status, setStatus] = useState('');
  const [isOfferSent, setIsOfferSent] = useState(false);
  const [receivedFileChunks, setReceivedFileChunks] = useState([]);
  const CHUNK_SIZE = 16384;

  const [fileMetadata, setFileMetadata] = useState(null);

  useEffect(() => {
    // Set up data channel if creating the offer
    let channel;

    // Handle incoming data channel
    peerConnection.ondatachannel = (event) => {
      channel = event.channel;
      setDataChannel(channel);

      channel.onopen = () => {
        console.log('Data channel opened');
        setStatus('Data channel is open.');
      };

      channel.onclose = () => {
        console.log('Data channel closed');
        setStatus('Data channel is closed.');
      };

      channel.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          setReceivedFileChunks((prevChunks) => [...prevChunks, event.data]);
          console.log("Received chunk of size:", event.data.byteLength);
        } else {
          console.warn("Unexpected data type received:", event.data);
        }
      };
    };

    // Handle offer/answer and ICE candidate events from the server
    socket.on('offer', async (offer) => {
      if (peerConnection.signalingState === "stable") { // Check signaling state
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', answer);
        console.log("Answer sent to the offer.");
      } else {
        console.warn("Signaling state is not stable, cannot set offer.");
      }
    });

    socket.on('answer', (answer) => {
      if (peerConnection.signalingState === "have-local-offer") { // Check signaling state
        peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      } else {
        console.warn("Signaling state is not 'have-local-offer', cannot set answer.");
      }
    });


    socket.on('ice-candidate', (candidate) => {
      peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', event.candidate);
      }
    };

    socket.on('file-metadata', (metadata) => {
      console.log("Received file metadata:", metadata); // Debugging log
      setFileMetadata(metadata); // Store metadata on the receiver
    });
  
    return () => {
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('file-metadata');
    };
  }, [peerConnection]);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
    const metadata = { name: selectedFile.name, type: selectedFile.type };
    setFileMetadata(metadata);
    setStatus('');
    
    console.log("Emitting file metadata:", metadata); // Debugging log
    socket.emit('file-metadata', metadata); // Emit metadata
  };
  
  

  const sendFile = () => {
    if (!file || !dataChannel) {
      setStatus('No file selected or data channel not available.');
      return;
    }

    if (dataChannel.readyState !== 'open') {
      setStatus('Data channel is not open yet.');
      return;
    }

    const fileReader = new FileReader();
    let offset = 0;

    const sendNextChunk = () => {
      const chunk = file.slice(offset, offset + CHUNK_SIZE);
      fileReader.readAsArrayBuffer(chunk);
    };

    fileReader.onload = (event) => {
      dataChannel.send(event.target.result);
      offset += event.target.result.byteLength;

      if (offset < file.size) {
        sendNextChunk();
      } else {
        setStatus('File sent successfully!');
        setFile(null);
      }
    };

    sendNextChunk();
  };

  const createOffer = () => {
    if (isOfferSent) return;

    const channel = peerConnection.createDataChannel('fileTransfer');
    setDataChannel(channel);

    channel.onopen = () => {
      console.log('Data channel opened');
      setStatus('Data channel is open.');
    };

    channel.onclose = () => {
      console.log('Data channel closed');
      setStatus('Data channel is closed.');
    };

    channel.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        setReceivedFileChunks((prevChunks) => [...prevChunks, event.data]);
        console.log("Received chunk of size:", event.data.byteLength);
      } else {
        console.warn("Unexpected data type received:", event.data);
      }
    };

    peerConnection.createOffer()
      .then((offer) => {
        peerConnection.setLocalDescription(offer);
        socket.emit('offer', offer);
        setIsOfferSent(true);
        setStatus('Offer sent!');
      })
      .catch(err => {
        console.error('Error creating offer:', err);
        setStatus('Error creating offer.');
      });
  };

  const handleReceiveFile = () => {
    if (receivedFileChunks.length === 0) {
      setStatus('No file available to receive.');
      return;
    }
  
    if (!fileMetadata) {
      setStatus('No file metadata available.');
      return;
    }
  
    // Create blob with received chunks and correct MIME type
    const receivedBlob = new Blob(receivedFileChunks, { type: fileMetadata.type });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(receivedBlob);
    link.download = fileMetadata.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  
    setStatus('File received successfully!');
    setReceivedFileChunks([]);
  };
  
  
  

  return (
    <div className="file-share-container">
      <h1>File Share App</h1>
      <div className="file-input">
        <input type="file" onChange={handleFileChange} />
        <button onClick={sendFile}>Send File</button>
        <button onClick={createOffer}>Create Offer</button>
        <button onClick={handleReceiveFile}>Receive File</button>
      </div>
      {status && <p className="status-message">{status}</p>}
    </div>
  );
};

export default FileShare;
