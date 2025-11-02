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
    { radius: 15, color: '#FFDDC1' },
    { radius: 30, color: '#FFD700' },
    { radius: 40, color: '#ADFF2F' },
    { radius: 55, color: '#40E0D0' },
    { radius: 70, color: '#6A5ACD' },
    { radius: 80, color: '#FF6347' },
    { radius: 90, color: '#DA70D6' },
    { radius: 100, color: '#FFA500' },
    { radius: 150, color: '#8A2BE2' },
    { radius: 200, color: '#DC143C' },
];

let currentBallType = null;
let nextBallType = null;
let currentDroppingBall = null;

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

// 다음 공 미리보기 캔버스
const nextBallCanvas = document.getElementById('nextBallCanvas');
const nextBallCtx = nextBallCanvas.getContext('2d');

// 경계선 생성
const ground = Bodies.rectangle(gameWidth / 2, gameHeight - wallThickness / 2, gameWidth, wallThickness, { isStatic: true, render: { fillStyle: '#666' } });
const leftWall = Bodies.rectangle(wallThickness / 2, gameHeight / 2, wallThickness, gameHeight, { isStatic: true, render: { fillStyle: '#666' } });
const rightWall = Bodies.rectangle(gameWidth - wallThickness / 2, gameHeight / 2, wallThickness, gameHeight, { isStatic: true, render: { fillStyle: '#666' } });
const ceiling = Bodies.rectangle(gameWidth / 2, wallThickness / 2, gameWidth, wallThickness, { isStatic: true, render: { fillStyle: 'transparent' } });

Composite.add(world, [ground, leftWall, rightWall, ceiling]);

// 렌더러 및 엔진 실행
Render.run(render);
Runner.run(Runner.create(), engine);

// 공 생성 함수
function createBall(x, y, type) {
    const options = {
        restitution: 0.2,
        friction: 0.001,
        density: 1,
        render: { fillStyle: type.color },
        label: `ball-${ballTypes.indexOf(type)}`,
        ballTypeIndex: ballTypes.indexOf(type)
    };
    return Bodies.circle(x, y, type.radius, options);
}

// 랜덤 공 타입 반환 (0~2)
function getRandomBallType() {
    const randomIndex = Math.floor(Math.random() * 3);
    return ballTypes[randomIndex];
}

// 다음 공 미리보기 그리기
function drawNextBallPreview(type) {
    nextBallCtx.clearRect(0, 0, nextBallCanvas.width, nextBallCanvas.height);
    nextBallCtx.beginPath();
    const scaledRadius = type.radius * (50 / (ballTypes[ballTypes.length - 1].radius * 2));
    nextBallCtx.arc(nextBallCanvas.width / 2, nextBallCanvas.height / 2, scaledRadius, 0, 2 * Math.PI);
    nextBallCtx.fillStyle = type.color;
    nextBallCtx.fill();
    nextBallCtx.strokeStyle = 'white';
    nextBallCtx.lineWidth = 1;
    nextBallCtx.stroke();
}

// 미리보기용 공 갱신
function updatePreviewBall(type) {
    const newPart = Bodies.circle(0, 0, type.radius, {
        render: { fillStyle: type.color }
    });
    Body.setParts(currentDroppingBall, [newPart]);
    currentDroppingBall.render.fillStyle = type.color;

    const currentX = currentDroppingBall.position.x;
    Body.setPosition(currentDroppingBall, { x: currentX, y: type.radius + 5 });
}

// 게임 시작 초기화
currentBallType = getRandomBallType();
nextBallType = getRandomBallType();

currentDroppingBall = Body.create({
    isSensor: true,
    isStatic: true,
    render: { opacity: 0.7 }
});

const initialPart = Bodies.circle(0, 0, currentBallType.radius, { render: { fillStyle: currentBallType.color } });
Body.setParts(currentDroppingBall, [initialPart]);
currentDroppingBall.render.fillStyle = currentBallType.color;
Body.setPosition(currentDroppingBall, { x: gameWidth / 2, y: currentBallType.radius + 5 });
Composite.add(world, currentDroppingBall);

drawNextBallPreview(nextBallType);

// 마우스 이동 시 미리보기 공 이동
document.addEventListener('mousemove', (event) => {
    const rect = render.canvas.getBoundingClientRect();
    let mouseX = event.clientX - rect.left;
    mouseX = Math.max(currentBallType.radius + wallThickness, Math.min(gameWidth - currentBallType.radius - wallThickness, mouseX));
    Body.setPosition(currentDroppingBall, { x: mouseX, y: currentBallType.radius + 5 });
});

// 클릭 시 공 생성
document.addEventListener('click', (event) => {
    const rect = render.canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const leftBound = wallThickness + 10;
    const rightBound = gameWidth - wallThickness - 10;
    if (mouseX < leftBound || mouseX > rightBound) return;

    const ballTypeToDrop = currentBallType;
    const droppedBall = createBall(mouseX, ballTypeToDrop.radius + 5, ballTypeToDrop);
    Composite.add(world, droppedBall);

    currentBallType = nextBallType;
    nextBallType = getRandomBallType();

    updatePreviewBall(currentBallType);
    drawNextBallPreview(nextBallType);
});

// 충돌 처리 (같은 색만 합쳐짐, 마지막 공 처리 포함)
Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach(pair => {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;

        if (bodyA.label.startsWith('ball-') && bodyB.label.startsWith('ball-') && bodyA.ballTypeIndex === bodyB.ballTypeIndex) {
            const currentIndex = bodyA.ballTypeIndex;

            // 공 제거
            Composite.remove(world, bodyA);
            Composite.remove(world, bodyB);

            if (currentIndex < ballTypes.length - 1) {
                // 마지막 공이 아니면 합쳐서 새 공 생성
                const nextTypeIndex = currentIndex + 1;
                const newBallType = ballTypes[nextTypeIndex];
                const newBall = createBall(
                    (bodyA.position.x + bodyB.position.x) / 2,
                    (bodyA.position.y + bodyB.position.y) / 2,
                    newBallType
                );
                Composite.add(world, newBall);

                score += newBallType.radius * 2;
                scoreDisplay.textContent = `점수: ${score}`;
            } else {
                // 마지막 공이면 점수만 증가, 새 공는 생성하지 않음
                const lastBallType = ballTypes[currentIndex];
                score += lastBallType.radius * 2;
                scoreDisplay.textContent = `점수: ${score}`;
            }
        }
    });
});

// 윈도우 크기 변경 대응
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

    const leftSpaceWidth = (window.innerWidth - gameWidth) / 2;
    const guideContainer = document.getElementById('levelGuide');
    const nextBallContainer = document.getElementById('nextBallDisplay');

    if (guideContainer) {
        guideContainer.style.left = `${leftSpaceWidth / 2 - 40}px`;
    }
    if (nextBallContainer) {
        nextBallContainer.style.right = `${leftSpaceWidth / 2 - 50}px`;
    }
}

// 레벨 가이드 표시
function drawLevelingGuide() {
    const guideContainer = document.getElementById('levelGuide');
    if (!guideContainer) return;
    guideContainer.innerHTML = '';

    ballTypes.forEach((type, index) => {
        const item = document.createElement('div');
        item.className = 'guide-item';

        const ballDiv = document.createElement('div');
        ballDiv.className = 'guide-ball';
        const displaySize = type.radius * 0.6 + 5;
        ballDiv.style.width = `${displaySize}px`;
        ballDiv.style.height = `${displaySize}px`;
        ballDiv.style.backgroundColor = type.color;
        item.appendChild(ballDiv);

        const text = document.createElement('span');
        text.textContent = `Lv.${index + 1}`;
        item.appendChild(text);
        guideContainer.appendChild(item);

        if (index < ballTypes.length - 1) {
            const arrow = document.createElement('div');
            arrow.className = 'guide-arrow';
            arrow.textContent = '↓';
            guideContainer.appendChild(arrow);
        }
    });
}

// 초기 실행
window.addEventListener('resize', resizeGame);
resizeGame();
drawLevelingGuide();
