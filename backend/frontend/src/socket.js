import { io } from "socket.io-client";
import { API_URL } from "./config";

export const socket = io(API_URL, {
  autoConnect: true,
  auth: {
    token: localStorage.getItem("token") || null
  }
});

export function setSocketAuthToken(token) {
  socket.auth = { ...(socket.auth || {}), token: token || null };
  if (socket.connected) {
    socket.disconnect();
    socket.connect();
  }
}
