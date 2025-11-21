"use client";

import React from "react";

interface ChatInterfaceProps {
  userId?: string;
}

const ChatInterface = ({ userId }: ChatInterfaceProps) => {
  // check health
  const checkHealth = async() => {
    // see if ollama is healthy or not.
  }

  // function jo input se prompt le
  const  sendMessage = async () => {

  };

  return (
    <div>
      {/* chat display section  */}
      <section>
        {/* after sending the message appears here */}

        {/* thinking ui until answer is generated */}
      </section>

      <section>
        <div className="flex flex-row m-10">
          <input
            type="text"
            className="bg-gray-300 m-4 w-full px-4 py-2 text-black"
          />
          <button
            className="bg-amber-400 hover:bg-amber-500 cursor-pointer text-white  px-10 py-2 rounded-3xl"
            onClick={sendMessage}
          >
            send
          </button>
        </div>
      </section>
    </div>
  );
};

export default ChatInterface;
