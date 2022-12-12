import express from "express";
import { Server, Socket } from "socket.io";
import http from "http";
import cors from "cors";
const app = express();
const server = new http.Server(app);
const io = new Server(server);
app.use(cors());

io.on("connection", (socket) => {
  console.log("connected");
  socket.on("join", (room: string) => {
    socket.join(room);
    socket.on("offer", (offer: unknown) => {
      console.log("forwarding offer");
      // forwards the offer to everyone except the sender
      socket.broadcast.in(room).emit("offer", offer);
    });
    socket.on("answer", (answer: unknown) => {
      // forwards the answer to the other person in the room
      socket.broadcast.in(room).emit("answer", answer);
    });
    socket.on("icecandidate", (icecandidate: unknown) => {
      // forwards the ICE candidate to the other person in the room
      socket.broadcast.in(room).emit("icecandidate", icecandidate);
    });
  });
});
server.listen(4000);
