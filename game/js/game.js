const { Engine, Render, Runner, World, Bodies, Events } = Matter;

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
function createFruit(x, y, radius) {
    const fruit = Bodies.circle(x, y, radius, {
        restitution: 0.5,
        friction: 0.1,
        render: { fillStyle: randomColor() }
    });
    fruit.radius = radius;
    World.add(world, fruit);
    fruits.push(fruit);
}

// 충돌 시 합치기 처리
Events.on(engine, 'collisionStart', function(event) {
    const pairs = event.pairs;
    pairs.forEach(pair => {
        const { bodyA, bodyB } = pair;
        if (bodyA.label === 'Circle Body' && bodyB.label === 'Circle Body') {
            const newRadius = Math.sqrt(bodyA.radius**2 + bodyB.radius**2);
            createFruit((bodyA.position.x + bodyB.position.x)/2, (bodyA.position.y + bodyB.position.y)/2, newRadius);
            World.remove(world, bodyA);
            World.remove(world, bodyB);
            fruits = fruits.filter(f => f !== bodyA && f !== bodyB);
            score += Math.floor(newRadius);
            scoreDiv.innerText = `점수: ${score}`;
        }
    });
});

// 과일 주기적으로 떨어뜨리기
setInterval(() => {
    const x = Math.random() * canvas.width * 0.8 + canvas.width * 0.1;
    createFruit(x, -50, 20 + Math.random() * 20);
}, 1000);

// 화면 리사이즈 대응
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    Render.lookAt(render, { min: { x: 0, y: 0 }, max: { x: canvas.width, y: canvas.height } });
});
