const express = require('express'); 
const http = require('http')
const { Server } = require('socket.io')
const room = require('./service/room')

const app = express(); 
const PORT = process.env.PORT || 5000; 

const server = http.createServer(app);

const io = new Server(server)
new room(io).connect()

app.get('/online', (req, res) => {
    res.sendFile(__dirname + '/index.html')
})

server.listen(PORT, () => {
    console.log(`🚀 Api iniciada com sucesso, na porta: ${PORT}`); 
});

module.exports = io