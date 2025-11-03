// --- 1. 메인 메뉴 UI 요소들 ---
const mainMenu = document.getElementById('mainMenu');
const startButton = document.getElementById('startButton');

// 사이드 패널 UI
const leftPanel = document.getElementById('leftPanel');
const rightPanel = document.getElementById('rightPanel');
const highScoreDisplay = document.getElementById('highScoreDisplay');


// --- 2. 메인 메뉴 이벤트 리스너 ---

// '게임 시작' 버튼
startButton.addEventListener('click', () => {
    mainMenu.style.display = 'none'; // 메뉴 숨기기
    initializeGame(); // 게임 시작!
});

// --- 3. 최고 점수 로직 (LocalStorage) ---

function loadHighScore() {
    const highScore = localStorage.getItem('suikaHighScore') || 0;
    highScoreDisplay.textContent = highScore; 
    return highScore;
}

function saveHighScore(newScore) {
    const currentHighScore = loadHighScore();
    if (newScore > currentHighScore) {
        localStorage.setItem('suikaHighScore', newScore);
        highScoreDisplay.textContent = newScore; 
    }
}

// --- 4. 게임 초기화 및 핵심 로직 ---
// (이 함수는 '게임 시작' 버튼을 눌러야만 실행됨)

function initializeGame() {
    
    // 게임 UI 요소들 보이기
    document.getElementById('gameCanvas').style.display = 'block';
    document.getElementById('score').style.display = 'block';
    
    // 사이드 패널 보이기 (display: flex)
    leftPanel.style.display = 'flex';
    rightPanel.style.display = 'flex';
    
    // 게임 시작 시 최고 점수 불러오기
    loadHighScore();


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
    const wallThickness = 10; 

    let score = 0;
    const scoreDisplay = document.getElementById('score');

    const gameOverLineY = 150;
    let isGameOver = false; 

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

    const engine = Engine.create();
    const world = engine.world;

    const render = Render.create({
        element: document.body,
        engine: engine,
        canvas: document.getElementById('gameCanvas'),
        options: {
            width: gameWidth,
            height: gameHeight,
            wireframes: false,
            background: '#F0F8FF'
        }
    });

    const nextBallCanvas = document.getElementById('nextBallCanvas');
    const nextBallCtx = nextBallCanvas.getContext('2d');

    const ground = Bodies.rectangle(gameWidth / 2, gameHeight - wallThickness / 2, gameWidth, wallThickness, { isStatic: true, render: { fillStyle: '#666' } });
    const leftWall = Bodies.rectangle(wallThickness / 2, gameHeight / 2, wallThickness, gameHeight, { isStatic: true, render: { fillStyle: '#666' } });
    const rightWall = Bodies.rectangle(gameWidth - wallThickness / 2, gameHeight / 2, wallThickness, gameHeight, { isStatic: true, render: { fillStyle: '#666' } });
    const gameOverLine = Bodies.rectangle(gameWidth / 2, gameOverLineY, gameWidth, 2, {
        isStatic: true,
        isSensor: true, 
        label: 'gameOverLine',
        render: { fillStyle: '#FF0000' }
    });

    Composite.add(world, [ground, leftWall, rightWall, gameOverLine]); 

    function gameOver() {
        if (isGameOver) return; // 중복 실행 방지
        isGameOver = true;
        Runner.stop(runner); // 엔진 정지
        
        saveHighScore(score); // 게임 오버 시 최고 점수 저장 시도

        document.getElementById('gameOverScreen').style.display = 'flex'; // 게임오버 화면 표시
        if (currentDroppingBall) {
            Composite.remove(world, currentDroppingBall); // 미리보기 공 제거
        }
    }

    Render.run(render);
    const runner = Runner.create(); 
    Runner.run(runner, engine);

    function createBall(x, y, type) {
        const options = {
            restitution: 0.2,
            friction: 0.001,
            density: 1,
            render: { fillStyle: type.color },
            label: `ball-${ballTypes.indexOf(type)}`,
            ballTypeIndex: ballTypes.indexOf(type)
        };
        const ball = Bodies.circle(x, y, type.radius, options);
        ball.timeOnGameOverLine = 0; // 타이머 변수
        return ball;
    }

    function getRandomBallType() {
        const randomIndex = Math.floor(Math.random() * 3);
        return ballTypes[randomIndex];
    }

    function drawNextBallPreview(type) {
        nextBallCtx.clearRect(0, 0, nextBallCanvas.width, nextBallCanvas.height);
        nextBallCtx.beginPath();
        const scaledRadius = type.radius * (50 / (ballTypes[ballTypes.length - 1].radius * 1.5));
        nextBallCtx.arc(nextBallCanvas.width / 2, nextBallCanvas.height / 2, scaledRadius, 0, 2 * Math.PI);
        nextBallCtx.fillStyle = type.color;
        nextBallCtx.fill();
        nextBallCtx.strokeStyle = 'white';
        nextBallCtx.lineWidth = 1;
        nextBallCtx.stroke();
    }

    function updatePreviewBall(type) {
        const newPart = Bodies.circle(0, 0, type.radius, {
            render: { fillStyle: type.color }
        });
        Body.setParts(currentDroppingBall, [newPart]);
        currentDroppingBall.render.fillStyle = type.color;
        const currentX = currentDroppingBall.position.x;
        Body.setPosition(currentDroppingBall, { x: currentX, y: type.radius + 5 });
    }

    // --- 게임 플레이 이벤트 리스너 (마우스, 클릭) ---
    
    const mouseMoveListener = (event) => {
        if (isGameOver) return; 
        const rect = render.canvas.getBoundingClientRect();
        let mouseX = event.clientX - rect.left;
        mouseX = Math.max(currentBallType.radius + wallThickness, Math.min(gameWidth - currentBallType.radius - wallThickness, mouseX));
        Body.setPosition(currentDroppingBall, { x: mouseX, y: currentBallType.radius + 5 });
    };

    const clickListener = (event) => {
        if (isGameOver) return; 
        const rect = render.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const leftBound = wallThickness + currentBallType.radius; 
        const rightBound = gameWidth - wallThickness - currentBallType.radius; 
        if (mouseX < leftBound || mouseX > rightBound) return;
        const ballTypeToDrop = currentBallType;
        const droppedBall = createBall(mouseX, ballTypeToDrop.radius + 5, ballTypeToDrop);
        Composite.add(world, droppedBall);
        currentBallType = nextBallType;
        nextBallType = getRandomBallType();
        updatePreviewBall(currentBallType);
        drawNextBallPreview(nextBallType);
    };

    document.addEventListener('mousemove', mouseMoveListener);
    document.addEventListener('click', clickListener);

    // --- Matter.js 충돌 이벤트 ---

    Events.on(engine, 'collisionStart', (event) => {
        if (isGameOver) return; 
        event.pairs.forEach(pair => {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;
            if (bodyA.label.startsWith('ball-') && bodyB.label.startsWith('ball-') && bodyA.ballTypeIndex === bodyB.ballTypeIndex) {
                const currentIndex = bodyA.ballTypeIndex;
                Composite.remove(world, bodyA);
                Composite.remove(world, bodyB);
                if (currentIndex < ballTypes.length - 1) {
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
                    gameOver();
                }
            }
        });
    });

    Events.on(engine, 'collisionActive', (event) => {
        if (isGameOver) return;
        event.pairs.forEach(pair => {
            const { bodyA, bodyB } = pair;
            if (bodyA.label === 'gameOverLine' || bodyB.label === 'gameOverLine') {
                const ball = bodyA.label.startsWith('ball-') ? bodyA : (bodyB.label.startsWith('ball-') ? bodyB : null);
                if (ball) {
                    ball.timeOnGameOverLine++;
                    if (ball.timeOnGameOverLine > 90) { // 1.5초
                        gameOver();
                    }
                }
            }
        });
    });

    Events.on(engine, 'collisionEnd', (event) => {
        event.pairs.forEach(pair => {
            const { bodyA, bodyB } = pair;
            if (bodyA.label === 'gameOverLine' || bodyB.label === 'gameOverLine') {
                const ball = bodyA.label.startsWith('ball-') ? bodyA : (bodyB.label.startsWith('ball-') ? bodyB : null);
                if (ball) {
                    ball.timeOnGameOverLine = 0;
                }
            }
        });
    });

    // --- 창 크기 조절 및 가이드 ---

    function resizeGame() {
        gameWidth = window.innerWidth * GAME_WIDTH_RATIO;
        render.canvas.width = gameWidth;
        render.canvas.height = gameHeight;
        render.options.width = gameWidth;
        render.options.height = gameHeight;
        render.bounds.max.x = gameWidth;
        render.bounds.max.y = gameHeight;
        
        Body.setPosition(ground, { x: gameWidth / 2, y: gameHeight - wallThickness / 2 });
        Body.setVertices(ground, [
            { x: 0, y: gameHeight - wallThickness },
            { x: gameWidth, y: gameHeight - wallThickness },
            { x: gameWidth, y: gameHeight },
            { x: 0, y: gameHeight }
        ]);
        Body.setPosition(leftWall, { x: wallThickness / 2, y: gameHeight / 2 });
        Body.setPosition(rightWall, { x: gameWidth - wallThickness / 2, y: gameHeight / 2 });
        Body.setPosition(gameOverLine, { x: gameWidth / 2, y: gameOverLineY });
        Body.setVertices(gameOverLine, [
            { x: 0, y: gameOverLineY - 1 }, 
            { x: gameWidth, y: gameOverLineY - 1 },
            { x: gameWidth, y: gameOverLineY + 1 },
            { x: 0, y: gameOverLineY + 1 }
        ]);

        // 캔버스 및 사이드 패널 위치 계산
        const canvasMarginLeft = (window.innerWidth - gameWidth) / 2;
        render.canvas.style.marginLeft = `${canvasMarginLeft}px`;
        render.canvas.style.marginTop = `0px`;

        const leftSpaceWidth = canvasMarginLeft;
        const panelWidth = 180; // CSS에서 180px로 설정함

        if (leftPanel) {
            const leftPanelPosition = (leftSpaceWidth / 2) - (panelWidth / 2);
            leftPanel.style.left = `${leftPanelPosition}px`;
        }
        if (rightPanel) {
            const rightPanelPosition = (leftSpaceWidth / 2) - (panelWidth / 2);
            rightPanel.style.right = `${rightPanelPosition}px`;
        }
    }

    function drawLevelingGuide() {
        const guideContainer = document.getElementById('levelGuide');
        if (!guideContainer) return;
        
        let guideHTML = '<h3>레벨 가이드</h3>'; // <h3> 타이틀 유지

        ballTypes.forEach((type, index) => {
            const displaySize = 10 + (index * 2); // 레벨 기준 고정 크기
            
            guideHTML += `
                <div class="guide-item">
                    <div class="guide-ball" style="width:${displaySize}px; height:${displaySize}px; background-color:${type.color};"></div>
                    <span>Lv.${index + 1}</span>
                </div>
            `;
            
            if (index < ballTypes.length - 1) {
                guideHTML += '<div class="guide-arrow">↓</div>';
            }
        });
        guideContainer.innerHTML = guideHTML;
    }

    // --- 버튼 리스너 ---

    // '게임 오버' 화면의 '다시 시작' 버튼
    document.getElementById('restartButton').addEventListener('click', () => {
        location.reload(); // 새로고침 (메인 메뉴로 돌아감)
    });

    // [추가됨] '그만하기' 버튼
    document.getElementById('quitButton').addEventListener('click', () => {
        gameOver(); // 게임 오버 함수 호출
    });

    // --- 초기 실행 ---
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

    window.addEventListener('resize', resizeGame);
    resizeGame();
    drawLevelingGuide();

} // end of initializeGame()
