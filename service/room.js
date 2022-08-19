class room {
    constructor(io) {
        this.io = io
    }

    connect() {
        this.io.on('connection', (socket) => {
            console.log('a user connected');
        })
    }
}

module.exports = room

