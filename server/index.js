const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);


  // Relay file metadata to other clients
  socket.on('file-metadata', (metadata) => {
    console.log(`Relaying file metadata from ${socket.id}`, metadata); // Debugging log
    socket.broadcast.emit('file-metadata', metadata);
  });

  // Log when an offer is received and relay it to all other clients
  socket.on('offer', (offer) => {
    console.log(`Offer received from ${socket.id}`, offer);
    socket.broadcast.emit('offer', offer);
  });

  // Log when an answer is received and relay it to all other clients
  socket.on('answer', (answer) => {
    console.log(`Answer received from ${socket.id}`, answer);
    socket.broadcast.emit('answer', answer);
  });

  // Log when an ICE candidate is received and relay it to all other clients
  socket.on('ice-candidate', (candidate) => {
    console.log(`ICE candidate received from ${socket.id}`, candidate);
    socket.broadcast.emit('ice-candidate', candidate);
  });

  // Handle file transfer
  
  
  socket.on('file-chunk', (chunk) => {
    console.log(`Received file chunk from ${socket.id}`);
    socket.broadcast.emit('file-chunk', chunk);
  });
  
  

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

server.listen(5000, () => {
  console.log('Server listening on http://localhost:5000');
});