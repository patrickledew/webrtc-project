import { useEffect, useRef, useState } from 'react'
import reactLogo from './assets/react.svg'

import io from 'socket.io-client';

import './App.css'

const socket = io('ws://localhost:4000', {
  transports: ['websocket']
});
function App() {
  const roomRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    socket.on('answer', (answer: string) => {
      console.log("answer: ", answer)
      if (preRef.current)
        preRef.current.innerText = answer;
    })
  }, [])

  function join() {
    console.log('join');
    socket.emit('join', roomRef.current?.value);
  }
  
  function sendMsg() {
    console.log('offer');
    socket.emit('offer', inputRef.current?.value);
  }

  return (
    <div className="App">
      <p>join</p>
      <input ref={roomRef} />
      <button onSubmit={join}>Join</button>

      <br />

      <p>Message</p>
      <input ref={inputRef}></input>
      <button onSubmit={sendMsg}>Send</button>
      <pre ref={preRef}></pre>
    </div>
  )
}

export default App
