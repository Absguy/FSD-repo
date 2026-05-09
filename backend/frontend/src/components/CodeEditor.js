import React, { useEffect, useState, useContext, useRef } from "react";
import Editor from "@monaco-editor/react";
import { socket } from "../socket";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { Play, Loader2 } from "lucide-react";

const WANDBOX_COMPILERS = {
  javascript: "nodejs-20.17.0",
  python: "cpython-3.10.15",
  java: "openjdk-jdk-22+36",
  cpp: "gcc-13.2.0"
};

const DEFAULT_CODE = {
  javascript: 'console.log("Hello, World!");',
  python: 'print("Hello, World!")',
  java: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, World!");\n  }\n}',
  cpp: '#include <iostream>\n\nint main() {\n  std::cout << "Hello, World!" << std::endl;\n  return 0;\n}'
};

const CodeEditor = ({ roomId, readOnly = false }) => {
  const { user } = useContext(AuthContext);
  const [code, setCode] = useState(DEFAULT_CODE['javascript']);
  const [language, setLanguage] = useState("javascript");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const versionRef = useRef(0);
  const lastAutosavedCodeRef = useRef("");

  useEffect(() => {
    // Join room with username
    if (user) {
      socket.emit("joinRoom", { roomId, username: user.name });
    }

    const onRoomCode = ({ code: roomCode, version }) => {
      if (typeof version === "number") versionRef.current = version;
      if (typeof roomCode === "string" && roomCode.length) {
        setCode(roomCode);
        lastAutosavedCodeRef.current = roomCode;
      } else {
        setCode(DEFAULT_CODE[language]);
        lastAutosavedCodeRef.current = DEFAULT_CODE[language];
      }
    };

    const onCodeUpdate = ({ code: newCode, version }) => {
      if (typeof version === "number" && version <= versionRef.current) return;
      if (typeof version === "number") versionRef.current = version;
      if (typeof newCode === "string") setCode(newCode);
    };

    socket.on("roomCode", onRoomCode);
    socket.on("codeUpdate", onCodeUpdate);

    return () => {
      socket.off("roomCode", onRoomCode);
      socket.off("codeUpdate", onCodeUpdate);
    };
  }, [roomId, user, language]);

  useEffect(() => {
    // Periodic autosave (server persists room code on its own interval too)
    const id = setInterval(() => {
      if (!roomId) return;
      if (code === lastAutosavedCodeRef.current) return;
      socket.emit("codeAutosave", { roomId, code });
      lastAutosavedCodeRef.current = code;
    }, 5000);

    return () => clearInterval(id);
  }, [roomId, code]);

  const handleChange = (value) => {
    if (value === undefined) return;
    if (readOnly) return;
    setCode(value);
    socket.emit("codeChange", { roomId, code: value });
  };

  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    setLanguage(lang);
    setCode(DEFAULT_CODE[lang]);
    if (!readOnly) socket.emit("codeChange", { roomId, code: DEFAULT_CODE[lang] });
  };

  const executeCode = async () => {
    if (!code.trim()) return;
    // Guests are read-only and cannot run/save code
    if (readOnly) return;
    setIsRunning(true);
    setOutput("Running...");

    try {
      const response = await axios.post("https://wandbox.org/api/compile.json", {
        compiler: WANDBOX_COMPILERS[language],
        code: code,
        save: false
      });

      const result = response.data;
      if (result.status !== "0") {
        setOutput(`Error:\n${result.compiler_error || result.compiler_message || result.program_error}`);
      } else {
        setOutput(result.program_message || "Execution finished with no output.");
      }
    } catch (error) {
      console.error(error);
      setOutput("Failed to execute code. Wandbox API might be unreachable.");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="editor-wrapper">
      <div className="editor-toolbar">
        <select value={language} onChange={handleLanguageChange} className="lang-select">
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
        </select>

        <button onClick={executeCode} disabled={isRunning} className="run-button">
          {isRunning ? <Loader2 size={16} className="spinner" /> : <Play size={16} />} 
          Run Code
        </button>
      </div>

      <div className="editor-container">
        <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          value={code}
          onChange={handleChange}
          options={{
            readOnly,
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            padding: { top: 16 }
          }}
        />
      </div>

      <div className="output-panel">
        <div className="output-header">Terminal / Output</div>
        <pre className="output-content">{output}</pre>
      </div>
    </div>
  );
};

export default CodeEditor;
