import { useEffect, useRef, useState } from "react";
import reactLogo from "./assets/react.svg";
import io from "socket.io-client";

import "./App.css";

const socket = io("localhost:4000", {
  transports: ["websocket"],
});

function App() {
  const roomRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const [room, setRoom] = useState<string>("");

  const [peerConn, setPeerConn] = useState(
    new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    })
  );

  const [sendChannel, setSendChannel] = useState<RTCDataChannel>();
  const [recieveChannel, setRecieveChannel] = useState<RTCDataChannel>();

  const [active, setActive] = useState(false);

  function join() {
    setRoom(roomRef.current?.value ?? "");
    socket.emit("join", roomRef.current?.value);
  }

  // Listen for an offer
  useEffect(() => {
    createDataChannels();
    socket.once("offer", async (offer: RTCSessionDescriptionInit) => {
      // We're answering, noone else should answer
      socket.off("answer");
      const remoteDesc = new RTCSessionDescription(offer);
      peerConn.setRemoteDescription(remoteDesc);

      if (preRef.current) preRef.current.innerText += `Offer Recieved.\n`;

      // After offer is recieved, send an answer
      const answer = await peerConn.createAnswer();
      const localDesc = new RTCSessionDescription(answer);
      await peerConn.setLocalDescription(localDesc);

      socket.emit("answer", answer);

      if (preRef.current) preRef.current.innerText += `Sent Answer.\n`;

      setUpICENegotiation();

      waitUntilConnected();
    });
  }, []);

  async function sendOffer() {
    // We're initiating, don't listen to other offers
    socket.off("offer");
    // Sends an offer to the other peer
    const offer = await peerConn.createOffer();
    const desc = new RTCSessionDescription(offer);
    await peerConn.setLocalDescription(desc);

    socket.emit("offer", offer);

    if (preRef.current) preRef.current.innerText += "Sent offer.\n";

    // Listens for the answer
    socket.once("answer", (answer: RTCSessionDescriptionInit) => {
      const desc = new RTCSessionDescription(answer);
      peerConn.setRemoteDescription(desc);

      if (preRef.current) preRef.current.innerText += `Answer Recieved.\n`;

      setUpICENegotiation();

      waitUntilConnected();
    });
  }

  function setUpICENegotiation() {
    if (preRef.current)
      preRef.current.innerText += `Setting up ICE candidate exchange...\n`;

    peerConn.addEventListener("icecandidateerror", (e) => {
      if (preRef.current)
        preRef.current.innerText += `Error in ICE candidate exchange.\n`;
    });
    // If we find any, send out ICE candidates
    peerConn.addEventListener("icecandidate", (e) => {
      console.log("Send cand ", e.candidate);

      if (!e.candidate) {
        socket.emit("icecandidate", null);
        if (preRef.current)
          preRef.current.innerText += `End of ICE candidates.\n`;
      } else {
        if (preRef.current)
          preRef.current.innerText += `Found new ICE candidate ${e.candidate?.address}, sending.\n`;

        const sentCandidate: RTCIceCandidateInit = {
          candidate: e.candidate.candidate,
          sdpMid: e.candidate.sdpMid,
          sdpMLineIndex: e.candidate.sdpMLineIndex,
          usernameFragment: e.candidate.usernameFragment,
        };

        socket.emit("icecandidate", sentCandidate);
      }
    });

    // Listen for incoming candidates
    socket.on("icecandidate", async (candidate: RTCIceCandidateInit | null) => {
      console.log("Recv cand ", candidate);

      if (candidate !== null) {
        if (preRef.current) {
          preRef.current.innerText += `Recieved ICE candidate. \n`;
        }
        await peerConn.addIceCandidate(candidate);
      } else {
        await peerConn.addIceCandidate(undefined);
      }
    });
  }

  function waitUntilConnected() {
    peerConn.addEventListener("connectionstatechange", (e) => {
      if (peerConn.connectionState == "connected") {
        setActive(true);
        if (preRef.current)
          preRef.current.innerText += "Successfully connected!\n";
      }
    });
  }

  function createDataChannels() {
    const channel = peerConn.createDataChannel("messages");
    setSendChannel(channel);

    peerConn.addEventListener("datachannel", (e) => {
      e.channel.addEventListener("message", (e) => {
        if (preRef.current) preRef.current.innerText += `> ${e.data}\n`;
      });
      setRecieveChannel(e.channel);
    });
  }

  function sendMsg() {
    console.log("sending message");
    if (sendChannel && inputRef.current) {
      sendChannel.send(inputRef.current.value);
      inputRef.current.value = "";
      inputRef.current.focus();
    }
  }

  return (
    <div className="App">
      {room && <h1>In room {room}</h1>}
      <p>Room</p>
      <input ref={roomRef} />
      <button onClick={join}>Join</button>
      <br />
      <br />
      <button
        onClick={sendOffer}
        disabled={active}
        style={{ backgroundColor: "green", width: "100%" }}
      >
        Send Offer
      </button>
      <br />

      <p>Message</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          return 0;
        }}
      >
        <input ref={inputRef} disabled={!active}></input>
        <button
          onClick={() => {
            sendMsg();
          }}
          disabled={!active}
        >
          Send
        </button>
      </form>
      <pre ref={preRef} style={{ backgroundColor: "gray" }}></pre>
    </div>
  );
}

export default App;
