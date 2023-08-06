//backend


import express from "express";
import http from "http";
import SocketIO from "socket.io";


//-----------------------------------------------------------------------------
// 1. express 객체를 설정
const app = express();

// 2. 환경 설정 (app.set ,  app.use)
//  - 템플릿 엔진의 종류와 템플릿 파일의 위치를 정의
app.set("view engine", "pug");
app.set("views",__dirname + "/views")
//  - static 파일(html,css등)의 위치를 지정한다.
app.use("/public", express.static(__dirname + '/public'));

// 3. 라우터 처리 : app.get, app.post
// URL로 들어오는 http request에 대한 handler (node에서는 router라고 한다.) 처리
app.get("/", (req,res) => res.render("home"));   // Express가 템플릿을 렌더링
app.get("/*", (req,res) => res.redirect("/"));   // catch all (뭘 입력해도 홈으로 보냄 )
//-----------------------------------------------------------------------------



// 4. 서버 
const httpServer = http.createServer(app);
const wsServer = SocketIO(httpServer); 


// 5. 소켓 통신
/*wsServer.on("connection", (socket) => {

    // 1) room 입장시 둘 다 -> ( getMedia, makeconnection 콜백 -> myPeer + Stream)
    socket.on("joinRoom", (roomName, done) => {
        socket.join(roomName);
        done();

    // 2-1) guest가 입장 -> host 브라우저에서 creatOffer
        socket.to(roomName).emit("welcome");
    });

    // 2-2) host가 offer emit -> to guest
    socket.on("offer", (offer, roomName) => {
        socket.to(roomName).emit("offer", offer);
      });
});

*/
// 5. 소켓 통신
wsServer.on("connection", (socket) => {

    // 1) room 입장시 둘 다 -> ( getMedia, makeconnection 콜백 -> myPeer + Stream)
    socket.on("joinRoom", (roomName) => {
      socket.join(roomName);

    // 2-1) guest가 입장 -> host 브라우저에서 creatOffer
      socket.to(roomName).emit("welcome");
    });

     // 2-2) host가 offer emit -> to guest
    socket.on("offer", (offer, roomName) => {
      socket.to(roomName).emit("offer", offer);
    });

    // 3-1) guest가 answer emit -> to host
    socket.on("answer", (answer, roomName) => {
      socket.to(roomName).emit("answer", answer);
    });

     // 4) guest가 answer emit -> to host
    socket.on("ice", (ice, roomName) => {
        socket.to(roomName).emit("ice", ice);
      });
  });





const handleListen = () => console.log(`Listening on http://localhost:3000`);
httpServer.listen(3000,handleListen);   // 포트넘버 지정 