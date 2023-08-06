//frontend

// 소켓io 백엔드 연결 => io function
const socket = io();



// room html 요소들
const welcome = document.getElementById("welcome");
const call= document.getElementById("call")

call.hidden = true; 



// call html 요소들
const myFace = document.getElementById("myFace");
const muteBtn= document.getElementById("mute")
const cameraBtn= document.getElementById("camera")
const camerasSelect= document.getElementById("cameras")
const audiosSelect= document.getElementById("audios")


let roomName;

let myStream;  // stream = 비디오와 오디오가 결합된 것 from 유저
let myPeerConnection;

// 현재 오디오, 카메라 동작 상태
let audio = true;
let camera = true;

// 현재 선택된 장치 (true 는 디폴트 장치)
let audioID = true;  
let cameraID = true;







// 카메라 input 장치 불러오기
async function getCameras() {

    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === "videoinput");
        //myStream.getVideoTracks()[0]; 내 비디오 장치 별 데이터 배열
        cameras.forEach(camera => {
            const cameraoption = document.createElement("option");
            cameraoption.value = camera.deviceId;
            cameraoption.innerHTML = camera.label;
            camerasSelect.appendChild(cameraoption);
        })
    } catch (error) {
        console.log(error)
    }
}


// 오디오 input 장치 불러오기
async function getAudios() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audios = devices.filter(device => device.kind === "audioinput");
        //myStream.getAudioTracks()[0]; 내 오디오 장치 별 데이터 배열
        audios.forEach(audio => {
            const audiooption = document.createElement("option");
            audiooption.value = audio.deviceId;
            audiooption.innerHTML = audio.label;
            audiosSelect.appendChild(audiooption);
        })
    } catch (error) {
        console.log(error)
    }
}



// 스트림 가져오기
// WebRtc가 브라우저에 내장되어있기 때문에 바로 사용 가능 
// async - await으로 동기 처리 
async function getMedia(cameraID,audioID) {

    try {
        myStream = await navigator.mediaDevices.getUserMedia({
            audio: audioID==true? true :{deviceId : { exact : audioID }},
            video: cameraID==true? true :{deviceId : { exact : cameraID }},  
        });
        myFace.srcObject = myStream;

    } catch (e) {
        console.log(e);
    }
};





  // 음소거 기능 
  function handleMuteClick (){
      // btn 누르면 현재 상태에 반대 명령
      myStream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled));
      
      if(audio){ // 소리가 나오고 있다면
        muteBtn.innerText = "Unmute";
        audio=false;
    }else{
        muteBtn.innerText = "Mute";
        audio=true;
    }
  };


  //비디오 off 기능
  function handleCameraClick (){

    myStream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled));

    if(camera){ //카메라가 나오고 있다면 
        cameraBtn.innerText = "Camera On";
        camera = false;
    }else{
        cameraBtn.innerText = "Camera Off";
        camera = true;

    }

  };





// 카메라 변경 선택시
async function handleCameraChange(){
    let cameraID = camerasSelect.value;
    await getMedia(cameraID,audioID);

    // 카메라 바뀔 시 스트림 업데이트 -> 주고받기
    if (myPeerConnection) {
        const videoTrack = myStream.getVideoTracks()[0];
        const videoSender = myPeerConnection
          .getSenders()
          .find((sender) => sender.track.kind === "video");
        videoSender.replaceTrack(videoTrack);
      }
};

// 오디오 변경 선택시 
async function handleAudioChange(){
    let audioID = audiosSelect.value;
    await getMedia(cameraID,audioID);
};




//이벤트 리스너 
muteBtn.addEventListener("click",handleMuteClick);
cameraBtn.addEventListener("click",handleCameraClick);
camerasSelect.addEventListener("input",handleCameraChange);
audiosSelect.addEventListener("input",handleAudioChange);





// Socket code -----------------------------


// welcome submit 이벤트 리스너
const welcomeForm = welcome.querySelector("form");

async function initCall(){ 
    welcome.hidden = true;
    call.hidden = false;
    
    await getCameras(); 
    await getAudios(); 
    await getMedia();
    
    makeConnection()
    // 이때 socket 속도 > myPeerConnection creat 속도
    // initcall을 emit "joinRoom"의 콜백함수로 넣으면 -> 에러 발생 
};


// 방 입장 -> roomName 데이터 넣어주기 
async function handleWelcomeSubmit(event) {
    event.preventDefault();
    const input = welcomeForm.querySelector("input");
    await initCall();

    socket.emit("joinRoom", input.value);
    roomName = input.value;
    input.value = "";
  };

  welcomeForm.addEventListener("submit", handleWelcomeSubmit);




// offer 생성 -> 보내기 
//  (조건 : guest 입장 , create offer 주체 : room host)
socket.on("welcome", async () => {
    const offer = await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer);
    console.log("sent the offer");
    socket.emit("offer", offer, roomName);
  });

  

  // answer 생성 -> 보내기 
  // (조건 : offer 받은 후  , create answer 주체 : guest)
socket.on("offer", async (offer) => {
    myPeerConnection.setRemoteDescription(offer);
    const answer = await myPeerConnection.createAnswer();
    myPeerConnection.setLocalDescription(answer);
    socket.emit("answer", answer, roomName);
  });


  // host가 answer 받음
socket.on("answer", (answer) => {
    myPeerConnection.setRemoteDescription(answer);
  });

    // candidate 주고 받기 2
socket.on("ice", (ice) => {
    console.log("received candidate");
    myPeerConnection.addIceCandidate(ice);
  });
      




// RTC code -----------------------------

function makeConnection() {
    myPeerConnection = new RTCPeerConnection({
        iceServers: [
          {
            urls: [
              "stun:stun.l.google.com:19302",
              "stun:stun1.l.google.com:19302",
              "stun:stun2.l.google.com:19302",
              "stun:stun3.l.google.com:19302",
              "stun:stun4.l.google.com:19302",
            ],
          },
        ],
      });
    //icecandidate : 양쪽의 인터넷 연결할 수 있는 이벤트
    myPeerConnection.addEventListener("icecandidate", handleIce);
    // addstream
    myPeerConnection.addEventListener("addstream", handleAddStream);

    // 입장 할 떄 스트림을 peerConnection 에 넣어주기  
    myStream
      .getTracks()
      .forEach((track) => myPeerConnection.addTrack(track, myStream));
  };



function handleIce(data) {
    console.log("캔디 줌");
    // candidate 주고 받기 1
    socket.emit("ice", data.candidate, roomName);
};

function handleAddStream(data) {
    console.log("스트림 확인");
    const guestFace = document.getElementById("guestFace");
    guestFace.srcObject = data.stream;
  };