// Subtle particle flock animation
class ParticleFlock {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.particleCount = 150;
    this.grid = null;
    this.cellSize = 150;
    this.lastUpdate = 0;
    this.updateInterval = 1000 / 30; // 30fps
    this.init();
  }

  init() {
    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '9999';
    document.body.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    this.resize();

    // Create particles
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push(new Particle(this.canvas.width, this.canvas.height));
    }

    // Event listeners
    window.addEventListener('resize', () => this.resize());

    // Start animation
    this.animate();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  buildSpatialGrid() {
    const cols = Math.ceil(this.canvas.width / this.cellSize);
    const rows = Math.ceil(this.canvas.height / this.cellSize);
    this.grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => []));

    this.particles.forEach(particle => {
      const col = Math.floor(particle.x / this.cellSize);
      const row = Math.floor(particle.y / this.cellSize);
      if (row >= 0 && row < rows && col >= 0 && col < cols) {
        this.grid[row][col].push(particle);
      }
    });
  }

  getNearbyParticles(particle) {
    const col = Math.floor(particle.x / this.cellSize);
    const row = Math.floor(particle.y / this.cellSize);
    const nearby = [];

    for (let r = row - 1; r <= row + 1; r++) {
      for (let c = col - 1; c <= col + 1; c++) {
        if (r >= 0 && r < this.grid.length && c >= 0 && c < this.grid[0].length) {
          nearby.push(...this.grid[r][c]);
        }
      }
    }
    return nearby;
  }

  animate(timestamp = 0) {
    if (timestamp - this.lastUpdate >= this.updateInterval) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      this.buildSpatialGrid();

      this.particles.forEach(particle => {
        const nearby = this.getNearbyParticles(particle);
        particle.update(nearby);
        particle.draw(this.ctx);
      });

      this.lastUpdate = timestamp;
    }

    requestAnimationFrame((t) => this.animate(t));
  }
}

class Particle {
  constructor(canvasWidth, canvasHeight) {
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = (Math.random() - 0.5) * 0.5;
    this.size = Math.random() * 2 + 1;
    this.opacity = Math.random() * 0.5 + 0.2;
    this.color = this.getColor();
  }

  getColor() {
    const colors = [
      'rgba(147, 51, 234, ', // purple
      'rgba(59, 130, 246, ',  // blue
      'rgba(99, 102, 241, ',  // indigo
      'rgba(168, 85, 247, ',  // violet
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  update(nearbyParticles) {
    // Boid flocking forces
    let separationX = 0, separationY = 0;
    let cohesionX = 0, cohesionY = 0;
    let alignmentX = 0, alignmentY = 0;
    let cohesionCount = 0;

    const separationDistSq = 2500;  // 50^2 - avoid sqrt
    const cohesionDistSq = 22500;   // 150^2 - avoid sqrt

    nearbyParticles.forEach(other => {
      if (other === this) return;

      const dx = other.x - this.x;
      const dy = other.y - this.y;
      const distSq = dx * dx + dy * dy;

      // Separation - avoid crowding
      if (distSq < separationDistSq && distSq > 0.01) {
        const dist = Math.sqrt(distSq);
        const force = (50 - dist) / 50;
        separationX -= (dx / dist) * force;
        separationY -= (dy / dist) * force;
      }

      // Cohesion - move towards group center
      if (distSq >= separationDistSq && distSq < cohesionDistSq) {
        cohesionX += other.x;
        cohesionY += other.y;
        cohesionCount++;

        // Alignment - match velocity
        alignmentX += other.vx;
        alignmentY += other.vy;
      }
    });

    // Apply forces
    this.vx += separationX * 1.5;
    this.vy += separationY * 1.5;
    this.vx += (Math.random() - 0.5) * 0.1;
    this.vy += (Math.random() - 0.5) * 0.1;

    if (cohesionCount > 0) {
      cohesionX = cohesionX / cohesionCount - this.x;
      cohesionY = cohesionY / cohesionCount - this.y;

      this.vx += cohesionX * 0.0003;
      this.vy += cohesionY * 0.0003;

      alignmentX /= cohesionCount;
      alignmentY /= cohesionCount;
      this.vx += (alignmentX - this.vx) * 0.03;
      this.vy += (alignmentY - this.vy) * 0.03;
    }

    // Clamp velocity
    const speedSq = this.vx * this.vx + this.vy * this.vy;
    const maxVelSq = 9.0; // 3.0^2
    if (speedSq > maxVelSq) {
      const speed = Math.sqrt(speedSq);
      this.vx = (this.vx / speed) * 3.0;
      this.vy = (this.vy / speed) * 3.0;
    }

    // Apply velocity with damping
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.94;
    this.vy *= 0.94;

    // Wrap edges
    if (this.x < 0) this.x = window.innerWidth;
    if (this.x > window.innerWidth) this.x = 0;
    if (this.y < 0) this.y = window.innerHeight;
    if (this.y > window.innerHeight) this.y = 0;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color + this.opacity + ')';
    ctx.fill();
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new ParticleFlock());
} else {
  new ParticleFlock();
}

export default ParticleFlock;
