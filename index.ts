import express from 'express';
import { Server, Socket } from 'socket.io';
import http from 'http'
import cors from 'cors'
const app = express();
const server = new http.Server(app)
const io = new Server(server);
app.use(cors())


const rooms = new Map<Socket, Socket | null>();

io.on('connection', (socket) => {
    socket.on('join', (room: string) => {

        socket.join(room);
        socket.on('offer', (offer: unknown) => {
            socket.broadcast.in(room).emit('answer', offer) // forwards the offer to everyone except the sender
        })
    })
})

app.listen(4000);