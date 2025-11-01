const { Engine, Render, Runner, World, Bodies, Events, Body } = Matter;

// 엔진 및 월드 생성
const engine = Engine.create();
const world = engine.world;

// 렌더러 생성
const canvas = document.getElementById('gameCanvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const render = Render.create({
    canvas: canvas,
    engine: engine,
    options: {
        width: canvas.width,
        height: canvas.height,
        wireframes: false,
        background: '#222'
    }
});

Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

// 바닥 생성
const ground = Bodies.rectangle(canvas.width / 2, canvas.height + 50, canvas.width, 100, { isStatic: true });
World.add(world, ground);

// 점수
let score = 0;
const scoreDiv = document.getElementById('score');

// 원 리스트
let fruits = [];

// 랜덤 색상
function randomColor() {
    const colors = ['#e74c3c','#f1c40f','#2ecc71','#3498db','#9b59b6'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// 새로운 과일 생성
// fromTop: true → 화면 상단에서 떨어짐, false → 현재 위치에서 생성
function createFruit(x, y, radius = 30, fromTop = true) {
    const startX = x;
    const startY = fromTop ? -50 : y;  
    const fruit = Bodies.circle(startX, startY, radius, {
        restitution: 0.5,
        friction: 0.1,
        render: { fillStyle: randomColor() }
    });
    fruit.radius = radius;
    World.add(world, fruit);
    fruits.push(fruit);

    if (fromTop) {
        Body.setVelocity(fruit, { x: 0, y: 10 });
    }
}

// 충돌 시 합치기 처리 (같은 색끼리만)
Events.on(engine, 'collisionStart', function(event) {
    const pairs = event.pairs;
    pairs.forEach(pair => {
        const { bodyA, bodyB } = pair;

        // 두 개 모두 원형일 때
        if (bodyA.label === 'Circle Body' && bodyB.label === 'Circle Body') {
            
            // 같은 색인지 확인
            if (bodyA.render.fillStyle !== bodyB.render.fillStyle) return; // 색이 다르면 합치지 않음

            // 같은 색이면 합치기
            const newRadius = Math.sqrt(bodyA.radius**2 + bodyB.radius**2);
            createFruit(
                (bodyA.position.x + bodyB.position.x)/2,
                (bodyA.position.y + bodyB.position.y)/2,
                newRadius,
                false  // false → 현재 위치에서 생성
            );
            World.remove(world, bodyA);
            World.remove(world, bodyB);
            fruits = fruits.filter(f => f !== bodyA && f !== bodyB);

            // 점수 증가
            score += Math.floor(newRadius);
            scoreDiv.innerText = `점수: ${score}`;
        }
    });
});

// 마우스 클릭 시 과일 생성 (위에서 떨어짐)
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    createFruit(x, y, 20 + Math.random() * 20, true); // true → 위에서 떨어지도록
});

// 화면 리사이즈 대응
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    Render.lookAt(render, { min: { x: 0, y: 0 }, max: { x: canvas.width, y: canvas.height } });
});
