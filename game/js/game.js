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

    const bgm = document.getElementById('backgroundMusic');
    if (bgm) {
        bgm.play().catch(e => console.error("BGM 재생 오류:", e));
    }


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

    // [수정] ballTypes 배열에 imgPath (이미지 경로) 속성 추가
    // 'ball/...' 경로는 실제 이미지 파일 위치에 맞게 수정
    const ballTypes = [
        { radius: 15,  imgPath: 'ball/탁구공.png',   color: '#FFDDC1' }, // Lv 1
        { radius: 30,  imgPath: 'ball/골프공.png',       color: '#FFD700' }, // Lv 2
        { radius: 40,  imgPath: 'ball/야구공.png',       color: '#ADFF2F' }, // Lv 3
        { radius: 55,  imgPath: 'ball/당구공.png',     color: '#40E0D0' }, // Lv 4
        { radius: 70,  imgPath: 'ball/테니스공.png',     color: '#6A5ACD' }, // Lv 5
        { radius: 80,  imgPath: 'ball/볼링공.png',   color: '#FF6347' }, // Lv 6
        { radius: 90,  imgPath: 'ball/풋살공.png',   color: '#DA70D6' }, // Lv 7
        { radius: 100, imgPath: 'ball/배구공.png', color: '#FFA500' }, // Lv 8
        { radius: 150, imgPath: 'ball/축구공.png',     color: '#8A2BE2' }, // Lv 9
        { radius: 200, imgPath: 'ball/농구공.png',     color: '#DC143C' }, // Lv 10
    ];

    // [새로 추가됨] 이미지 객체 미리 로드하기
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
            ctx.drawImage(type.image, -radius, -radius, radius * 2, radius * 2);
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
            
            ctx.globalAlpha = currentDroppingBall.render.opacity; // 투명도 적용
            
            // drawCustomBall 함수와 유사하게 직접 그리기
            ctx.save();
            ctx.translate(pos.x, pos.y);
            
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.clip(); 

            if (type.image && type.imageLoaded) {
                ctx.drawImage(type.image, -radius, -radius, radius * 2, radius * 2);
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
        
        // 크기 비율 계산 (가장 큰 공 기준 50px)
        const scaledRadius = type.radius * (50 / (ballTypes[ballTypes.length - 1].radius * 1.5));
        const centerX = nextBallCanvas.width / 2;
        const centerY = nextBallCanvas.height / 2;
        
        // 여기도 클리핑 적용
        nextBallCtx.save();
        nextBallCtx.beginPath();
        nextBallCtx.arc(centerX, centerY, scaledRadius, 0, 2 * Math.PI);
        nextBallCtx.clip(); // 클리핑

        if (type.image && type.imageLoaded) {
            // 이미지가 있으면 이미지 그리기
            nextBallCtx.drawImage(type.image, centerX - scaledRadius, centerY - scaledRadius, scaledRadius * 2, scaledRadius * 2);
        } else {
            // 없으면 기존 색상
            nextBallCtx.fillStyle = type.color;
            nextBallCtx.fill();
        }
        
        nextBallCtx.restore(); // 클리핑 해제

        // 테두리 그리기 (클리핑 해제 후에)
        nextBallCtx.beginPath();
        nextBallCtx.arc(centerX, centerY, scaledRadius, 0, 2 * Math.PI);
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
        
        // 클릭 시, 미리보기 공을 물리 객체로 전환
        const ballTypeToDrop = currentBallType;
        const droppedBall = createBall(currentDroppingBall.position.x, currentDroppingBall.position.y, ballTypeToDrop);
        Composite.add(world, droppedBall);
        
        // 다음 공 준비
        currentBallType = nextBallType;
        nextBallType = getRandomBallType();
        updatePreviewBall(currentBallType); // 미리보기 공 업데이트
        drawNextBallPreview(nextBallType); // '다음 공' UI 업데이트
    };

    render.canvas.addEventListener('mousemove', mouseMoveListener); // [수정] document -> render.canvas
    render.canvas.addEventListener('click', clickListener); // [수정] document -> render.canvas

    // --- Matter.js 충돌 이벤트 ---

    Events.on(engine, 'collisionStart', (event) => {
        if (isGameOver) return; 
        event.pairs.forEach(pair => {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;
            
            if (bodyA.label.startsWith('ball-') && bodyB.label.startsWith('ball-') && bodyA.ballTypeIndex === bodyB.ballTypeIndex) {
                
                const currentIndex = bodyA.ballTypeIndex;
                
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
        const panelWidth = 190; // CSS에서 190px로 설정함

        if (leftPanel) {
            const leftPanelPosition = (leftSpaceWidth / 2) - (panelWidth / 2);
            leftPanel.style.left = `${leftPanelPosition}px`;
        }
        if (rightPanel) {
            const rightPanelPosition = (leftSpaceWidth / 2) - (panelWidth / 2);
            rightPanel.style.right = `${rightPanelPosition}px`;
        }
    }

    // [수정] drawLevelingGuide 함수 (이미지 사용)
    function drawLevelingGuide() {
        const guideContainer = document.getElementById('levelGuide');
        if (!guideContainer) return;
        
        let guideHTML = '<h3>레벨 가이드</h3>'; // <h3> 타이틀 유지

        ballTypes.forEach((type, index) => {
            const displaySize = 10 + (index * 2); // 레벨 기준 고정 크기
            
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