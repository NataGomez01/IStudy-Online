const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

class room {
    constructor(io) {
        this.io = io
    }

    connect() {
        this.io.on('connection', (socket) => {
            socket.on('find_room', async (flash_data) => {
                const findPublicRoom = await prisma.rooms.findMany({
                    where: {
                        id_Card: flash_data.flash_id,
                        private: false,
                        onlines: 1 
                    }
                })

                const findSameUser = await prisma.rooms.findMany({
                    where: {
                        name_player1: flash_data.name
                    }
                })

                if(findPublicRoom[0] && !findSameUser[0]) {
                    await prisma.rooms.update({
                        where: {
                            id: findPublicRoom[0].id
                        }, 
                        data: {
                            onlines: 2,
                            name_player2: flash_data.name,
                            avatar_player2: flash_data.foto
                        }
                    })
                    socket.join(findPublicRoom[0].id)
                    this.io.to(findPublicRoom[0].id).emit('resFindRoom', {ready: true, message: 'One player joined in the room', room: findPublicRoom[0].id})
                } else {
                    const roomId = Math.floor(Math.random() * (9999 - 1000) + 1000)
                    const createRoom = await prisma.rooms.create({
                        data: {
                            id: roomId,
                            id_Card: flash_data.flash_id,
                            private: false,
                            onlines: 1,
                            name_player1: flash_data.name,
                            avatar_player1: flash_data.foto,
                            name_player2: '',
                            avatar_player2: '',
                            answered: 0
                        }
                    })
                    socket.join(createRoom.id)
                    socket.emit('resFindRoom', {ready: false, message: 'Waiting for more players...', room: createRoom.id})
                }
            })
            socket.on('create_room', async (flash_data) => {
                const roomId = Math.floor(Math.random() * (9999 - 1000) + 1000)
                const createRoom = await prisma.rooms.create({
                    data: {
                        id: roomId,
                        id_Card: flash_data.flash_id,
                        private: true,
                        onlines: 1,
                        name_player1: flash_data.name,
                        avatar_player1: flash_data.foto,
                        name_player2: '',
                        avatar_player2: '',
                        answered: 0
                    }
                })
                socket.join(createRoom.id)
                socket.emit('resCreateRoom', {ready: false, message: 'Waiting for more players...', room: createRoom.id})
            })
            socket.on('join_room', async (flash_data) => {
                const findRoom = await prisma.rooms.findMany({
                    where: {
                        id: flash_data.room_id,
                        onlines: 1
                    }
                })

                if(findRoom[0]) {
                    await prisma.rooms.update({
                        where: {
                            id: findRoom[0].id
                        }, 
                        data: {
                            onlines: 2,
                            name_player2: flash_data.name,
                            avatar_player2: flash_data.foto
                        }
                    })
                    socket.join(findRoom[0].id)
                    this.io.to(findRoom[0].id).emit('resJoinRoom', {ready: true, message: 'One player joined in the room', room: findRoom[0].id, flashId: findRoom[0].id_Card})
                } else {
                    socket.emit('resJoinRoom', {error: 'ID de sala inválida ou sala lotada'})
                }
            })
            // INSIDE GAME
            socket.on('answer_game', async (game_data) => {
                const findGame = await prisma.rooms.findUnique({
                    where: {
                        id: game_data.room_id
                    }
                })

                if(findGame.answered == 1) {
                    await prisma.rooms.update({
                        where: {
                            id: game_data.room_id
                        }, 
                        data: {
                            answered: 0
                        }
                    })
                    socket.join(game_data.room_id)
                    this.io.to(game_data.room_id).emit('resAnswer', {ready: true, roomAfk: game_data.roomAfk})
                } else if(findGame.answered == 0) {
                    await prisma.rooms.update({
                        where: {
                            id: game_data.room_id
                        }, 
                        data: {
                            answered: 1
                        }
                    })
                    socket.join(game_data.room_id)
                    socket.emit('resAnswer', {ready: false, message: 'Waiting other player...'})
                }
            })
            socket.on('finish_game', async (end_data) => {
                socket.join(end_data.room_id)
                if(end_data.results) {
                    this.io.to(end_data.room_id).emit('resEnd', end_data.results)
                }

                const res = await prisma.rooms.findUnique({
                    where: {
                        id: end_data.room_id
                    }
                })
                
                if(res) {
                    await prisma.rooms.delete({
                        where: {
                            id: end_data.room_id
                        }
                    })
                }
            })
            socket.on('left_game', async (end_data) => {
                socket.join(end_data.room_id)
                if(end_data.afk) {
                    this.io.to(end_data.room_id).emit('resAfk', {afk: true})
                } else {
                    this.io.to(end_data.room_id).emit('resAfk', {afk: false})
                }
                
            })
        })
    }
}

module.exports = room

