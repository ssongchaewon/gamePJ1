// --- 1. 메인 메뉴 UI 요소들 ---
const mainMenu = document.getElementById('mainMenu');
const startButton = document.getElementById('startButton');

// 사이드 패널 UI
const leftPanel = document.getElementById('leftPanel');
const rightPanel = document.getElementById('rightPanel');
const highScoreDisplay = document.getElementById('highScoreDisplay');


// --- 2. 메인 메뉴 이벤트 리스너 ---

// 게임 시작 사운드 로드
const gameStartSound = new Audio('./sound/GameStart.mp3');
gameStartSound.preload = 'auto';
gameStartSound.volume = 0.9;

// '게임 시작' 버튼
startButton.addEventListener('click', () => {
    mainMenu.style.display = 'none'; // 메뉴 숨기기

    const bgm = document.getElementById('backgroundMusic');
    if (bgm) {
        bgm.play().catch(e => console.error("BGM 재생 오류:", e));
    }

    // 게임 시작 사운드 재생
    try { gameStartSound.currentTime = 0; gameStartSound.play().catch(()=>{}); } catch(e){ /* ignore play errors */ }

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

    // 게임 설정 - 캔버스 및 물리 영역을 고정 크기(500x700)로 고정
    const CANVAS_WIDTH = 500;
    const CANVAS_HEIGHT = 700;
    let gameWidth = CANVAS_WIDTH;      // 고정 너비
    const gameHeight = CANVAS_HEIGHT;  // 고정 높이
    const wallThickness = 10; 

    let score = 0;
    const scoreDisplay = document.getElementById('score');

    const gameOverLineY = 150;
    let isGameOver = false; 

    const ballTypes = [
        { radius: 15,  imgPath: 'image/Bubble.png',   color: '#FFDDC1' }, // Lv 1
        { radius: 30,  imgPath: 'image/SeaUrchin.png',       color: '#FFD700' }, // Lv 2
        { radius: 40,  imgPath: 'image/StarFish.png',       color: '#FFA500' }, // Lv 3
        { radius: 55,  imgPath: 'image/ShellFish.png',     color: '#40E0D0' }, // Lv 4
        { radius: 70,  imgPath: 'image/JellyFish.png',     color: '#DA70D6' }, // Lv 5
        { radius: 80,  imgPath: 'image/Nemo.png',   color: '#FF6347' }, // Lv 6
        { radius: 90,  imgPath: 'image/Shrimp.png',   color: '#DC143C' }, // Lv 7
        { radius: 100, imgPath: 'image/Turtle.png', color: '#ADFF2F' }, // Lv 8
        { radius: 120, imgPath: 'image/Octopus.png',     color: '#8A2BE2' }, // Lv 9
        { radius: 140, imgPath: 'image/Whale.png',     color: '#6A5ACD' }, // Lv 10
    ];
    
    function drawNextBallPreview(type) {
        nextBallCtx.clearRect(0, 0, nextBallCanvas.width, nextBallCanvas.height);

        const cx = nextBallCanvas.width / 2;
        const cy = nextBallCanvas.height / 2;

        const IMG = 80;
        const borderRadius = Math.min(nextBallCanvas.width, nextBallCanvas.height) * 0.45;

        if (type.image && type.imageLoaded) {
            nextBallCtx.drawImage(type.image, cx - IMG / 2, cy - IMG / 2, IMG, IMG);
        } else {
            // 로드되지 않았으면 단색 원으로 대체
            const r = Math.min(IMG / 2, borderRadius);
            nextBallCtx.fillStyle = type.color;
            nextBallCtx.beginPath();
            nextBallCtx.arc(cx, cy, r, 0, Math.PI * 2);
            nextBallCtx.fill();
        }

    }
    // 이미지 객체 미리 로드하기
    ballTypes.forEach(type => {
        if (type.imgPath) {
            type.image = new Image(); // type 객체에 .image 속성 추가
            type.image.src = type.imgPath;
            type.image.onload = () => {
                type.imageLoaded = true; // 로드 완료 플래그
            };
            type.image.onerror = () => {
                type.imageLoaded = false; // 로드 실패 플래그
                console.error(`이미지 로드 실패: ${type.imgPath}`);
            }
        }
    });

    let currentBallType = null;
    let nextBallType = null;
    let currentDroppingBall = null; // 마우스 따라다니는 미리보기 공

    const engine = Engine.create();
    const world = engine.world;

    const render = Render.create({
        element: document.body,
        engine: engine,
        canvas: document.getElementById('gameCanvas'),
        options: {
            width: gameWidth,
            height: gameHeight,
            wireframes: false, // [수정] false로 설정 (우리가 직접 그릴 것)
            background: '#F0F8FF' // 캔버스 기본 배경색
        }
    });

    const nextBallCanvas = document.getElementById('nextBallCanvas');
    const nextBallCtx = nextBallCanvas.getContext('2d');
    nextBallCanvas.width = 80;
    nextBallCanvas.height = 80;

    // --- 벽, 바닥, 게임오버 라인 생성 ---
    const ground = Bodies.rectangle(gameWidth / 2, gameHeight - wallThickness / 2, gameWidth, wallThickness, { isStatic: true, label: 'wall', render: { fillStyle: '#666' } });
    const leftWall = Bodies.rectangle(wallThickness / 2, gameHeight / 2, wallThickness, gameHeight, { isStatic: true, label: 'wall', render: { fillStyle: '#666' } });
    const rightWall = Bodies.rectangle(gameWidth - wallThickness / 2, gameHeight / 2, wallThickness, gameHeight, { isStatic: true, label: 'wall', render: { fillStyle: '#666' } });
    const gameOverLine = Bodies.rectangle(gameWidth / 2, gameOverLineY, gameWidth, 2, {
        isStatic: true,
        isSensor: true, 
        label: 'gameOverLine',
        render: { fillStyle: '#FF0000' }
    });

    Composite.add(world, [ground, leftWall, rightWall, gameOverLine]); 

    // 게임오버 효과음 로드
    const gameOverSound = new Audio('./sound/GameOver.mp3');
    gameOverSound.preload = 'auto';
    gameOverSound.volume = 0.9;

    function gameOver() {
        if (isGameOver) return; // 중복 실행 방지
        isGameOver = true;

        // 게임오버 사운드 재생 (브라우저 정책으로 실패할 수 있으므로 try/catch)
        try { gameOverSound.currentTime = 0; gameOverSound.play(); } catch (e) { /* ignore play errors */ }

        Runner.stop(runner); // 엔진 정지
        
        saveHighScore(score); // 게임 오버 시 최고 점수 저장 시도

        document.getElementById('gameOverScreen').style.display = 'flex'; // 게임오버 화면 표시
        if (currentDroppingBall) {
            Composite.remove(world, currentDroppingBall); // 미리보기 공 제거
        }
    }

    // [수정] Render.run(render); // <-- 이 줄을 "삭제" 합니다.
    const runner = Runner.create(); 
    Runner.run(runner, engine); // 물리 계산은 계속 실행

    // [새로 추가됨] Matter.js의 기본 렌더링 대신 우리가 직접 그리는 함수
    function drawCustomBall(ctx, body) {
        const typeIndex = body.ballTypeIndex;
        if (typeIndex === undefined) return; // ball이 아니면 그리지 않음

        const type = ballTypes[typeIndex];
        const pos = body.position;
        const radius = body.circleRadius;

        ctx.save(); // 현재 캔버스 상태 (좌표계 등) 저장
        ctx.translate(pos.x, pos.y); // 원의 중심으로 좌표계 이동
        ctx.rotate(body.angle);      // 원의 회전 각도 적용
        
        // 원 모양 클리핑 경로 생성
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        
        // "이 원 안에만 그려라" (클리핑)
        ctx.clip(); 

        // 이미지 로드 여부 확인
        if (type.image && type.imageLoaded) {
            // 이미지가 로드되었으면 이미지 그리기
                const scale = 0.925; 
                const drawRadius = radius / scale;
            ctx.drawImage(type.image, -drawRadius, -drawRadius, drawRadius * 2, drawRadius * 2);
        } else {
            // 이미지가 없거나 로드 중/실패 시 기존 'color'로 채우기 (비상용)
            ctx.fillStyle = type.color;
            ctx.fill();
        }

        ctx.restore(); // 저장했던 캔버스 상태 복원 (클리핑 해제)
    }

    // [새로 추가됨] 'afterUpdate' 이벤트로 커스텀 렌더링 루프 만들기
    Events.on(engine, 'afterUpdate', () => {
        if (isGameOver) return; // 게임 오버 시 그리기 중지

        const ctx = render.context; // 렌더러의 캔버스 컨텍스트
        const bodies = Composite.allBodies(world);
        
        // 1. 캔버스 지우기 (배경색으로)
        ctx.clearRect(0, 0, render.canvas.width, render.canvas.height);
        ctx.fillStyle = render.options.background;
        ctx.fillRect(0, 0, render.canvas.width, render.canvas.height);
        
        ctx.save();

        // 2. 벽, 바닥 그리기
        bodies.forEach(body => {
            if (body.label === 'wall') {
                ctx.beginPath();
                ctx.moveTo(body.vertices[0].x, body.vertices[0].y);
                for (let j = 1; j < body.vertices.length; j++) {
                    ctx.lineTo(body.vertices[j].x, body.vertices[j].y);
                }
                ctx.lineTo(body.vertices[0].x, body.vertices[0].y);
                ctx.fillStyle = body.render.fillStyle;
                ctx.fill();
            }
        });

        // 3. 게임 오버 라인 그리기
        ctx.beginPath();
        ctx.moveTo(gameOverLine.vertices[0].x, gameOverLine.vertices[0].y);
        ctx.lineTo(gameOverLine.vertices[1].x, gameOverLine.vertices[1].y);
        ctx.strokeStyle = gameOverLine.render.fillStyle;
        ctx.lineWidth = 2;
        ctx.stroke();

        // 4. 떨어지는 공들(Dynamic bodies) 그리기
        bodies.forEach(body => {
            if (body.label.startsWith('ball-')) {
                drawCustomBall(ctx, body); // ★ 우리가 만든 함수로 그리기
            }
        });

        // 5. '떨어뜨릴 공' (미리보기 공) 그리기
        if (currentDroppingBall && !isGameOver) {
            const type = currentBallType;
            const pos = currentDroppingBall.position;
            const radius = type.radius;
            const scale = 0.925;
            const drawRadius = radius / scale;
            
            ctx.globalAlpha = currentDroppingBall.render.opacity; // 투명도 적용
            
            // drawCustomBall 함수와 유사하게 직접 그리기
            ctx.save();
            ctx.translate(pos.x, pos.y);
            
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.clip(); 

            if (type.image && type.imageLoaded) {
                ctx.drawImage(type.image, -drawRadius, -drawRadius, drawRadius * 2, drawRadius * 2);
            } else {
                ctx.fillStyle = type.color;
                ctx.fill();
            }
            ctx.restore();
            
            ctx.globalAlpha = 1.0; // 투명도 복원
        }

        ctx.restore();
    });

    // [수정] createBall 함수
    function createBall(x, y, type) {
        const typeIndex = ballTypes.indexOf(type);
        const options = {
            restitution: 0.2,
            friction: 0.001,
            density: 1,
            // render: { fillStyle: type.color }, // <-- [수정] 이 줄 "삭제"
            label: `ball-${typeIndex}`,
            ballTypeIndex: typeIndex // [수정] 이미지 그리기에 사용할 인덱스
        };
        const ball = Bodies.circle(x, y, type.radius, options);
        ball.timeOnGameOverLine = 0; // 타이머 변수
        return ball;
    }

    function getRandomBallType() {
        const randomIndex = Math.floor(Math.random() * 3); // 0, 1, 2 레벨만
        return ballTypes[randomIndex];
    }

    // [수정] drawNextBallPreview 함수
    function drawNextBallPreview(type) {
        nextBallCtx.clearRect(0, 0, nextBallCanvas.width, nextBallCanvas.height);

        const cx = nextBallCanvas.width / 2;
        const cy = nextBallCanvas.height / 2;

        const IMG_W = 30;
        const IMG_H = 30;
        const borderRadius = Math.min(nextBallCanvas.width, nextBallCanvas.height) * 0.45;

        if (type.image && type.imageLoaded) {
            // 원형 마스크 제거 — 항상 고정 크기(30x30)로 중앙에 그림
            nextBallCtx.drawImage(type.image, cx - IMG_W / 2, cy - IMG_H / 2, IMG_W, IMG_H);
        } else {
            // 로드되지 않았으면 단색 원으로 대체
            const r = Math.min(IMG_W / 2, borderRadius);
            nextBallCtx.fillStyle = type.color;
            nextBallCtx.beginPath();
            nextBallCtx.arc(cx, cy, r, 0, Math.PI * 2);
            nextBallCtx.fill();
        }

        // 항상 테두리 그리기 (일관된 크기)
        nextBallCtx.beginPath();
        nextBallCtx.arc(cx, cy, borderRadius, 0, Math.PI * 2);
        nextBallCtx.strokeStyle = 'white';
        nextBallCtx.lineWidth = 1;
        nextBallCtx.stroke();
    }

    // [수정] updatePreviewBall 함수
    function updatePreviewBall(type) {
        // newPart에서 render 옵션 "삭제"
        const newPart = Bodies.circle(0, 0, type.radius, {
            // render: { fillStyle: type.color } // <-- "삭제"
        });
        Body.setParts(currentDroppingBall, [newPart]);
        // currentDroppingBall.render.fillStyle = type.color; // <-- "삭제"
        
        const currentX = currentDroppingBall.position.x;
        Body.setPosition(currentDroppingBall, { x: currentX, y: type.radius + 5 });
    }

    // --- 게임 플레이 이벤트 리스너 (마우스, 클릭) ---
    
    let isMouseActive = false;   // 마우스가 캔버스 안에 있을 때만 preview가 따라다님
    let inputLocked = false;     // 클릭 쿨다운(연속클릭 방지)

    const mouseMoveListener = (event) => {
        if (isGameOver || !isMouseActive) return; // 캔버스 밖이면 무시
        const rect = render.canvas.getBoundingClientRect();
        let mouseX = event.clientX - rect.left;
        // 캔버스 내부 좌표로 변환 후 preview가 캔버스/벽 밖으로 나가지 않도록 클램프
        mouseX = Math.max(currentBallType.radius + wallThickness, Math.min(gameWidth - currentBallType.radius - wallThickness, mouseX));
        Body.setPosition(currentDroppingBall, { x: mouseX, y: currentBallType.radius + 5 });
    };

    // 캔버스에 들어왔을 때 마우스 인식 시작, 나가면 스냅하여 끝자락에 위치
    render.canvas.addEventListener('mouseenter', () => {
        isMouseActive = true;
    });
    render.canvas.addEventListener('mouseleave', () => {
        isMouseActive = false;
        // 캔버스 밖으로 나가면 물리 범위 끝자락(내부 한계)으로 스냅
        const snapX = Math.max(currentBallType.radius + wallThickness, Math.min(gameWidth - currentBallType.radius - wallThickness, currentDroppingBall.position.x));
        Body.setPosition(currentDroppingBall, { x: snapX, y: currentBallType.radius + 5 });
    });

    const clickListener = (event) => {
        if (isGameOver || inputLocked) return; // 게임오버 또는 쿨다운 중엔 무시

        const rect = render.canvas.getBoundingClientRect();
        const mouseXscreen = event.clientX - rect.left;
        // 캔버스 밖 클릭은 무시
        if (mouseXscreen < 0 || mouseXscreen > gameWidth) return;

        // 생성 X는 preview 위치를 사용하되 물리 범위 내로 클램프
        const leftBound = wallThickness + currentBallType.radius;
        const rightBound = gameWidth - wallThickness - currentBallType.radius;
        let spawnX = currentDroppingBall.position.x;
        spawnX = Math.max(leftBound, Math.min(rightBound, spawnX));

        // 클릭 잠금(연속 클릭 방지)
        inputLocked = true;
        setTimeout(() => { inputLocked = false; }, 1000); // 1000ms 쿨다운

        // 미리보기 공을 실제 공으로 전환하여 생성
        const ballTypeToDrop = currentBallType;
        const droppedBall = createBall(spawnX, currentDroppingBall.position.y, ballTypeToDrop);
        Composite.add(world, droppedBall);

        // 다음/현재 공 갱신: 다음 공은 항상 중앙에서 스폰하도록 preview 위치 리셋
        currentBallType = nextBallType;
        nextBallType = getRandomBallType();
        updatePreviewBall(currentBallType);
        Body.setPosition(currentDroppingBall, { x: gameWidth / 2, y: currentBallType.radius + 5 });
        drawNextBallPreview(nextBallType);
    };

    // 이벤트 리스너 등록 (캔버스 기준)
    render.canvas.addEventListener('mousemove', mouseMoveListener);
    render.canvas.addEventListener('click', clickListener);

    // --- Matter.js 충돌 이벤트 ---

    // 합체 효과음 로드
    const mergeSound = new Audio('./sound/EffectSound.mp3');
    mergeSound.preload = 'auto';
    mergeSound.volume = 0.9;

    Events.on(engine, 'collisionStart', (event) => {
        if (isGameOver) return; 
        event.pairs.forEach(pair => {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;
            
            if (bodyA.label.startsWith('ball-') && bodyB.label.startsWith('ball-') && bodyA.ballTypeIndex === bodyB.ballTypeIndex) {
                
                const currentIndex = bodyA.ballTypeIndex;
                
                // 사운드 재생
                try { mergeSound.currentTime = 0; mergeSound.play(); } catch (e) { /* ignore play errors */ }

                // [수정] 충돌 즉시 제거 (병합 랙 방지)
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
                    
                    // [수정] 다음 프레임에 추가 (안정성)
                    setTimeout(() => {
                        Composite.add(world, newBall);
                    }, 0);

                    score += newBallType.radius * 2; // 점수 계산 (예시)
                    scoreDisplay.textContent = `점수: ${score}`;
                } else {
                    // 최고 레벨(수박)이 합쳐진 경우 (게임 승리/특별 효과 등)
                    // 현재는 아무것도 안함. (수박 2개 사라짐)
                }
            }
        });
    });

    // --- 게임오버 라인 충돌 감지 ---
    Events.on(engine, 'collisionActive', (event) => {
        if (isGameOver) return;
        event.pairs.forEach(pair => {
            const { bodyA, bodyB } = pair;
            if (bodyA.label === 'gameOverLine' || bodyB.label === 'gameOverLine') {
                const ball = bodyA.label.startsWith('ball-') ? bodyA : (bodyB.label.startsWith('ball-') ? bodyB : null);
                
                // [수정] currentDroppingBall(미리보기 공)은 게임오버 대상에서 제외
                if (ball && ball !== currentDroppingBall) { 
                    ball.timeOnGameOverLine++;
                    if (ball.timeOnGameOverLine > 90) { // 약 1.5초 (60fps 기준)
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
                    ball.timeOnGameOverLine = 0; // 라인에서 벗어나면 타이머 리셋
                }
            }
        });
    });

    // --- 창 크기 조절 및 가이드 ---

    function resizeGame() {
        // 고정 크기 유지: 캔버스 크기를 항상 CANVAS_WIDTH x CANVAS_HEIGHT로 설정
        gameWidth = CANVAS_WIDTH;
        render.canvas.width = CANVAS_WIDTH;
        render.canvas.height = CANVAS_HEIGHT;
        render.options.width = CANVAS_WIDTH;
        render.options.height = CANVAS_HEIGHT;
        render.bounds.max.x = CANVAS_WIDTH;
        render.bounds.max.y = CANVAS_HEIGHT;
        
        // 벽(직사각형) 위치/정점 재설정 (고정 크기에 맞춤)
        Body.setPosition(ground, { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - wallThickness / 2 });
        Body.setVertices(ground, [
            { x: 0, y: CANVAS_HEIGHT - wallThickness },
            { x: CANVAS_WIDTH, y: CANVAS_HEIGHT - wallThickness },
            { x: CANVAS_WIDTH, y: CANVAS_HEIGHT },
            { x: 0, y: CANVAS_HEIGHT }
        ]);
        Body.setPosition(leftWall, { x: wallThickness / 2, y: CANVAS_HEIGHT / 2 });
        Body.setPosition(rightWall, { x: CANVAS_WIDTH - wallThickness / 2, y: CANVAS_HEIGHT / 2 });
        Body.setPosition(gameOverLine, { x: CANVAS_WIDTH / 2, y: gameOverLineY });
        Body.setVertices(gameOverLine, [
            { x: 0, y: gameOverLineY - 1 }, 
            { x: CANVAS_WIDTH, y: gameOverLineY - 1 },
            { x: CANVAS_WIDTH, y: gameOverLineY + 1 },
            { x: 0, y: gameOverLineY + 1 }
        ]);

        const canvasMarginLeft = Math.max(0, (window.innerWidth - CANVAS_WIDTH) / 2);
        render.canvas.style.marginLeft = `${canvasMarginLeft}px`;
        // score 요소 높이만큼 아래로 내림 (겹침 방지).
        const scoreEl = document.getElementById('score');
        const topOffset = scoreEl ? (scoreEl.offsetHeight + 50) : 60;
        render.canvas.style.marginTop = `${topOffset}px`;
    }

    // [수정] drawLevelingGuide 함수 (이미지 사용)
    function drawLevelingGuide() {
        const guideContainer = document.getElementById('levelGuide');
        if (!guideContainer) return;
        
        let guideHTML = '<h3>레벨 가이드</h3>'; // <h3> 타이틀 유지

        ballTypes.forEach((type, index) => {
            const displaySize = 16 + (index * 4); // 레벨 기준 고정 크기
            
            // 이미지 경로에 따라 스타일 분기
            let ballStyle = '';
            if (type.imgPath) {
                // 이미지가 있으면 배경 이미지로 설정
                ballStyle = `background-image: url('${type.imgPath}');`;
            } else {
                // 이미지가 없으면 기존 색상
                ballStyle = `background-color:${type.color};`;
            }
            
            guideHTML += `
                <div class="guide-item">
                    <div class="guide-ball" style="width:${displaySize}px; height:${displaySize}px; ${ballStyle}"></div>
                    <span style="font-size:14px;">Lv.${index + 1}</span>
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

    // '그만하기' 버튼
    document.getElementById('quitButton').addEventListener('click', () => {
        gameOver(); // 게임 오버 함수 호출
    });

    // --- 초기 실행 ---
    currentBallType = getRandomBallType();
    nextBallType = getRandomBallType();
    
    // [수정] 미리보기 공 생성
    currentDroppingBall = Body.create({
        isSensor: true, // [수정] 다른 공과 충돌하지 않도록 센서로 변경
        isStatic: true, // 마우스를 따라다니므로 Static으로
        label: 'previewBall',
        render: { opacity: 0.7 }
    });
    
    // [수정] 초기 공 파트 설정
    const initialPart = Bodies.circle(0, 0, currentBallType.radius, {
        // render 옵션 "삭제"
    });
    Body.setParts(currentDroppingBall, [initialPart]);
    Body.setPosition(currentDroppingBall, { x: gameWidth / 2, y: currentBallType.radius + 5 });
    Composite.add(world, currentDroppingBall); // 미리보기 공을 월드에 추가
    
    drawNextBallPreview(nextBallType);

    window.addEventListener('resize', resizeGame);
    resizeGame();
    drawLevelingGuide();

} // end of initializeGame()