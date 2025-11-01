// Matter.js 모듈 별칭 설정
const Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Composite = Matter.Composite,
    Events = Matter.Events,
    Body = Matter.Body;

// 게임 설정
const GAME_WIDTH_RATIO = 1 / 3;
let gameWidth = window.innerWidth * GAME_WIDTH_RATIO;
const gameHeight = window.innerHeight;
const wallThickness = 20;

let score = 0;
const scoreDisplay = document.getElementById('score');

// 공 종류 정의 (10가지)
const ballTypes = [
    { radius: 15, color: '#FFDDC1' }, // 1
    { radius: 25, color: '#FFD700' }, // 2
    { radius: 35, color: '#ADFF2F' }, // 3
    { radius: 45, color: '#40E0D0' }, // 4
    { radius: 55, color: '#6A5ACD' }, // 5
    { radius: 65, color: '#FF6347' }, // 6
    { radius: 75, color: '#DA70D6' }, // 7
    { radius: 85, color: '#FFA500' }, // 8
    { radius: 95, color: '#8A2BE2' }, // 9
    { radius: 105, color: '#DC143C' }, // 10
];

// 공 타입 변수 2개로 분리
let currentBallType = null; // 현재 마우스를 따라다니는 공의 타입
let nextBallType = null;    // 다음 공 미리보기에 표시될 타입
let currentDroppingBall = null; // 마우스를 따라다닐 공 (객체)

// 엔진 생성
const engine = Engine.create();
const world = engine.world;

// 렌더러 생성
const render = Render.create({
    element: document.body,
    engine: engine,
    canvas: document.getElementById('gameCanvas'),
    options: {
        width: gameWidth,
        height: gameHeight,
        wireframes: false,
        background: '#333'
    }
});

// 다음 공 미리보기 캔버스 설정
const nextBallCanvas = document.getElementById('nextBallCanvas');
const nextBallCtx = nextBallCanvas.getContext('2d');

// 경계선(벽) 생성
const ground = Bodies.rectangle(gameWidth / 2, gameHeight - wallThickness / 2, gameWidth, wallThickness, { isStatic: true, render: { fillStyle: '#666' } });
const leftWall = Bodies.rectangle(wallThickness / 2, gameHeight / 2, wallThickness, gameHeight, { isStatic: true, render: { fillStyle: '#666' } });
const rightWall = Bodies.rectangle(gameWidth - wallThickness / 2, gameHeight / 2, wallThickness, gameHeight, { isStatic: true, render: { fillStyle: '#666' } });
const ceiling = Bodies.rectangle(gameWidth / 2, wallThickness / 2, gameWidth, wallThickness, { isStatic: true, render: { fillStyle: 'transparent' } });

Composite.add(world, [ground, leftWall, rightWall, ceiling]);

// 렌더러 실행
Render.run(render);

// 러너 실행
const runner = Runner.create();
Runner.run(runner, engine);

// 실제 떨어지는 공 생성 함수
function createBall(x, y, type) {
    const options = {
        restitution: 0.2,
        friction: 0.001,
        density: 1,
        render: {
            fillStyle: type.color
        },
        label: `ball-${ballTypes.indexOf(type)}`,
        ballTypeIndex: ballTypes.indexOf(type),
        isSensor: false,
    };
    return Bodies.circle(x, y, type.radius, options);
}

// 랜덤 공 타입 반환 (0~2 인덱스)
function getRandomBallType() {
    const randomIndex = Math.floor(Math.random() * 3);
    return ballTypes[randomIndex];
}

// 다음 공 미리보기 그리기 (인자로 타입을 받음)
function drawNextBallPreview(type) {
    nextBallCtx.clearRect(0, 0, nextBallCanvas.width, nextBallCanvas.height);
    nextBallCtx.beginPath();
    nextBallCtx.arc(nextBallCanvas.width / 2, nextBallCanvas.height / 2, type.radius * (50 / (ballTypes[ballTypes.length-1].radius * 2)), 0, 2 * Math.PI);
    nextBallCtx.fillStyle = type.color;
    nextBallCtx.fill();
    nextBallCtx.strokeStyle = 'white';
    nextBallCtx.lineWidth = 1;
    nextBallCtx.stroke();
}

// 미리보기 공의 속성(크기, 색상)을 업데이트하는 함수
function updatePreviewBall(type) {
    // [수정] 새 파츠를 만들 때 렌더 옵션에 색상을 지정합니다.
    const newPart = Bodies.circle(0, 0, type.radius, {
        render: { fillStyle: type.color }
    });

    Body.setParts(currentDroppingBall, [newPart]);
    currentDroppingBall.render.fillStyle = type.color; // 이 줄도 이중 보장을 위해 유지합니다.
    
    const currentX = currentDroppingBall.position.x;
    Body.setPosition(currentDroppingBall, { x: currentX, y: type.radius + 5 });
}


// --- 로직 재구성 (게임 흐름 변경) ---

// 1. 게임 시작 시 공 2개 준비
currentBallType = getRandomBallType(); // 현재 공 (A)
nextBallType = getRandomBallType();    // 다음 공 (B)

// 2. 마우스를 따라다닐 임시 공 (최초 1회 생성)
currentDroppingBall = Body.create({
    isSensor: true,
    isStatic: true, // [수정 완료!] 중력 영향 받지 않음
    render: { opacity: 0.7 }
});

// setParts로 초기 모양 (currentBallType, A) 설정
const initialPart = Bodies.circle(0, 0, currentBallType.radius, { render: { fillStyle: currentBallType.color } });
Body.setParts(currentDroppingBall, [initialPart]);
currentDroppingBall.render.fillStyle = currentBallType.color;

// 초기 위치 설정 (currentBallType, A 기준)
Body.setPosition(currentDroppingBall, { x: gameWidth / 2, y: currentBallType.radius + 5 });
Composite.add(world, currentDroppingBall);

// 3. 다음 공 미리보기(측면) 그리기 (nextBallType, B)
drawNextBallPreview(nextBallType);


// 4. 마우스 움직임 (단순히 위치만 변경)
document.addEventListener('mousemove', (event) => {
    let mouseX = event.clientX;
    const canvasRect = render.canvas.getBoundingClientRect();
    const canvasLeft = canvasRect.left;

    let ballX = mouseX - canvasLeft;
    
    // 현재 공(currentBallType)의 반지름 기준으로 X 위치 제한
    ballX = Math.max(currentBallType.radius + wallThickness, Math.min(gameWidth - currentBallType.radius - wallThickness, ballX));

    // Y 위치는 현재 공(currentBallType)의 반지름 기준으로 항상 고정
    Body.setPosition(currentDroppingBall, { x: ballX, y: currentBallType.radius + 5 });
});

// 5. 클릭 시 공 떨어뜨리기 (핵심 로직 변경)
document.addEventListener('click', (event) => {
    // 1. 현재 임시 공의 위치와 "현재 타입(A)"을 가져옴
    const ballPosition = currentDroppingBall.position;
    const ballTypeToDrop = currentBallType; // Ball A를 떨어뜨림

    // 2. 실제 떨어지는 공 생성 (Ball A)
    const droppedBall = createBall(ballPosition.x, ballPosition.y, ballTypeToDrop);
    Composite.add(world, droppedBall);

    // 3. [핵심] 다음 공(B)이 현재 공(A) 자리를 대체함
    currentBallType = nextBallType; // currentBallType은 이제 Ball B가 됨

    // 4. [핵심] 새로운 다음 공(C)을 뽑음
    nextBallType = getRandomBallType(); // nextBallType은 이제 Ball C가 됨

    // 5. [핵심] 임시 공(상단)을 Ball B의 모양으로 업데이트
    updatePreviewBall(currentBallType);

    // 6. [핵심] 측면 미리보기를 Ball C의 모양으로 업데이트
    drawNextBallPreview(nextBallType);
});

// 6. 충돌 이벤트 처리 (변경 없음)
Events.on(engine, 'collisionStart', (event) => {
    const pairs = event.pairs;

    pairs.forEach(pair => {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;

        if (bodyA.label.startsWith('ball-') && bodyB.label.startsWith('ball-') && bodyA.ballTypeIndex === bodyB.ballTypeIndex) {
            if (bodyA.ballTypeIndex < ballTypes.length - 1) {
                Composite.remove(world, bodyA);
                Composite.remove(world, bodyB);

                const nextTypeIndex = bodyA.ballTypeIndex + 1;
                const newBallType = ballTypes[nextTypeIndex];
                const newBall = createBall((bodyA.position.x + bodyB.position.x) / 2, (bodyA.position.y + bodyB.position.y) / 2, newBallType);
                Composite.add(world, newBall);

                score += newBallType.radius * 2;
                scoreDisplay.textContent = `점수: ${score}`;
            }
        }
    });
});

// 7. 캔버스 중앙 정렬 및 크기 조정
function resizeGame() {
    gameWidth = window.innerWidth * GAME_WIDTH_RATIO;
    render.canvas.width = gameWidth;
    render.canvas.height = gameHeight;
    render.options.width = gameWidth;
    render.options.height = gameHeight;

    Body.setPosition(ground, { x: gameWidth / 2, y: gameHeight - wallThickness / 2 });
    Body.setPosition(leftWall, { x: wallThickness / 2, y: gameHeight / 2 });
    Body.setPosition(rightWall, { x: gameWidth - wallThickness / 2, y: gameHeight / 2 });
    Body.setPosition(ceiling, { x: gameWidth / 2, y: wallThickness / 2 });

    render.canvas.style.marginLeft = `${(window.innerWidth - gameWidth) / 2}px`;
    render.canvas.style.marginTop = `0px`;

    // [추가] 레벨 가이드 및 다음 공 미리보기 위치 계산
    const leftSpaceWidth = (window.innerWidth - gameWidth) / 2;
    const guideContainer = document.getElementById('levelGuide');
    const nextBallContainer = document.getElementById('nextBallDisplay');

    if (guideContainer) {
        // 왼쪽 빈 공간의 중앙에 배치 (가이드 너비를 약 80px로 가정)
        guideContainer.style.left = `${leftSpaceWidth / 2 - 40}px`;
    }
    if (nextBallContainer) {
        // 오른쪽 빈 공간의 중앙에 배치 (미리보기 너비를 약 100px로 가정)
        nextBallContainer.style.right = `${leftSpaceWidth / 2 - 50}px`;
    }
}

// [신규] 레벨링 가이드 그리기 함수
function drawLevelingGuide() {
    const guideContainer = document.getElementById('levelGuide');
    if (!guideContainer) return; // 가이드 div가 없으면 종료
    guideContainer.innerHTML = ''; // 내용을 비웁니다

    // ballTypes 배열을 순회하며 가이드 아이템 생성
    ballTypes.forEach((type, index) => {
        // 1. 공 + 텍스트를 감싸는 래퍼
        const item = document.createElement('div');
        item.className = 'guide-item';

        // 2. 공 모양 <div>
        const ballDiv = document.createElement('div');
        ballDiv.className = 'guide-ball';
        
        // 가이드용으로 크기를 좀 작게 조절
        const displaySize = type.radius * 0.6 + 5; // 예: 15px ~ 41px
        ballDiv.style.width = `${displaySize}px`;
        ballDiv.style.height = `${displaySize}px`;
        ballDiv.style.backgroundColor = type.color;
        item.appendChild(ballDiv);
        
        // 3. 레벨 텍스트
        const text = document.createElement('span');
        text.textContent = `Lv.${index + 1}`;
        item.appendChild(text);
        
        // 4. 컨테이너에 추가
        guideContainer.appendChild(item);

        // 5. 마지막 공이 아니면 화살표(↓) 추가
        if (index < ballTypes.length - 1) {
            const arrow = document.createElement('div');
            arrow.className = 'guide-arrow';
            arrow.textContent = '↓';
            guideContainer.appendChild(arrow);
        }
    });
}

// --- 최종 실행 ---
window.addEventListener('resize', resizeGame);
resizeGame(); // 초기 로드 (캔버스 크기 + 가이드 위치 계산)
drawLevelingGuide(); // 초기 로드 (가이드 내용물 그리기)
