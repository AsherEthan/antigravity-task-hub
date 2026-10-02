// renderer/services/clue-canvas.js
/**
 * 苹果 Freeform / 空间计算风格交互线索调查画布 (Apple-grade Clue Canvas)
 * 采用 Apple Freeform 点阵式微网格、深空极光毛玻璃节点、平滑贝塞尔因果流向与微能量脉冲
 * 增强功能：Auto-DAG 自动层级拓扑重排、节点聚光灯聚焦、全局关键词高亮
 */

class ClueCanvasEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.nodes = [];
    this.links = [];
    this.selectedNodeId = null;
    this.hoveredNodeId = null;
    this.draggedNode = null;
    this.isPanning = false;
    this.panOffset = { x: 0, y: 0 };
    this.panStart = { x: 0, y: 0 };
    this.zoom = 1.0;
    this.searchQuery = '';
    this.onNodeSelectCallback = null;
    this.animOffset = 0;
  }

  init(canvasId = 'clueCanvas', onNodeSelect) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.onNodeSelectCallback = onNodeSelect;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.bindEvents();
    this.animate();
  }

  resize() {
    if (!this.canvas || !this.canvas.parentElement) return;
    this.canvas.width = this.canvas.parentElement.clientWidth;
    this.canvas.height = this.canvas.parentElement.clientHeight || 520;
  }

  setData(clues = []) {
    // 自动为线索分配/继承画布拓扑坐标 (5阶因果布局: 100, 340, 580, 820, 1060)
    const typeXCol = {
      phenomenon: 100,
      observation: 100,
      question: 340,
      hypothesis: 580,
      evidence: 820,
      breakthrough: 1060,
      bottleneck: 1060
    };

    const typeRows = {
      phenomenon: 0,
      observation: 0,
      question: 0,
      hypothesis: 0,
      evidence: 0,
      breakthrough: 0,
      bottleneck: 0
    };

    const existingMap = new Map(this.nodes.map(n => [n.id, n]));

    this.nodes = clues.map(c => {
      const existing = existingMap.get(c.id);
      const colX = typeXCol[c.type] || 100;
      const rowIdx = typeRows[c.type] !== undefined ? typeRows[c.type]++ : 0;
      const defY = 120 + rowIdx * 120;

      return {
        id: c.id,
        type: c.type || 'observation',
        title: c.title || (c.content ? c.content.slice(0, 16) : '线索'),
        content: c.content || '',
        timestamp: c.timestamp || Date.now(),
        parentId: c.parentId,
        x: existing ? existing.x : (c.x !== undefined ? c.x : colX),
        y: existing ? existing.y : (c.y !== undefined ? c.y : defY),
        radius: (c.type === 'bottleneck' || c.type === 'breakthrough') ? 36 : 28
      };
    });

    // 建立连线拓扑
    this.links = [];
    this.nodes.forEach(node => {
      if (node.parentId) {
        const parent = this.nodes.find(n => n.id === node.parentId);
        if (parent) {
          this.links.push({ from: parent, to: node });
        }
      }
    });
  }

  /**
   * 智能有向无环图因果排版 (Auto-DAG Layout)
   * 5阶因果层次化布局 (x=100, 340, 580, 820, 1060) 与重心排序连线交叉最小化 (Barycentric Link Crossing Minimization)
   */
  autoLayoutDAG() {
    const colMap = {
      phenomenon: 100,
      observation: 100,
      question: 340,
      hypothesis: 580,
      evidence: 820,
      breakthrough: 1060,
      bottleneck: 1060
    };

    const layerMap = {
      phenomenon: 0,
      observation: 0,
      question: 1,
      hypothesis: 2,
      evidence: 3,
      breakthrough: 4,
      bottleneck: 4
    };

    const layers = [[], [], [], [], []];
    this.nodes.forEach(node => {
      const lvl = layerMap[node.type] !== undefined ? layerMap[node.type] : 0;
      node.x = colMap[node.type] || 100;
      layers[lvl].push(node);
    });

    // Layer 0 现象/目击列排版
    layers[0].forEach((node, idx) => {
      node.y = 120 + idx * 130;
    });

    // Layers 1 to 4: 重心启发式排序以最小化连线交叉
    for (let lvl = 1; lvl <= 4; lvl++) {
      const currentLayer = layers[lvl];
      if (currentLayer.length === 0) continue;

      currentLayer.forEach(node => {
        const parents = this.links.filter(l => l.to.id === node.id).map(l => l.from);
        if (parents.length > 0) {
          const sumY = parents.reduce((sum, p) => sum + p.y, 0);
          node.barycenter = sumY / parents.length;
        } else {
          const prevLayer = layers[lvl - 1];
          if (prevLayer.length > 0) {
            const sumY = prevLayer.reduce((sum, p) => sum + p.y, 0);
            node.barycenter = sumY / prevLayer.length;
          } else {
            node.barycenter = 120 + currentLayer.indexOf(node) * 130;
          }
        }
      });

      // 按照父节点重心排序
      currentLayer.sort((a, b) => a.barycenter - b.barycenter);

      // 分配非重叠垂直坐标 (保证 ΔY >= 110px)
      const totalNodes = currentLayer.length;
      if (totalNodes === 1) {
        currentLayer[0].y = Math.max(80, currentLayer[0].barycenter);
      } else {
        const avgBary = currentLayer.reduce((s, n) => s + n.barycenter, 0) / totalNodes;
        const startY = avgBary - ((totalNodes - 1) * 130) / 2;
        const baseY = Math.max(80, startY);
        currentLayer.forEach((node, idx) => {
          node.y = baseY + idx * 130;
        });
      }
    }

    // 优雅自适应平移
    this.panOffset = { x: 40, y: 20 };
    this.zoom = 0.95;

    if (typeof window !== 'undefined' && window.audioFx && typeof window.audioFx.playClueAdded === 'function') {
      window.audioFx.playClueAdded();
    }
  }

  /**
   * 聚光灯聚焦到指定线索节点
   */
  focusNode(nodeId) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node || !this.canvas) return;
    this.selectedNodeId = nodeId;
    this.zoom = 1.15;
    this.panOffset.x = (this.canvas.width / 2) - node.x * this.zoom;
    this.panOffset.y = (this.canvas.height / 2) - node.y * this.zoom;
  }

  setSearchFilter(query) {
    this.searchQuery = (query || '').trim().toLowerCase();
  }

  bindEvents() {
    if (!this.canvas) return;

    this.canvas.addEventListener('mousedown', (e) => {
      const pos = this.getCanvasPos(e);
      const clickedNode = this.findNodeAt(pos.x, pos.y);

      if (clickedNode) {
        this.draggedNode = clickedNode;
        this.selectedNodeId = clickedNode.id;
        if (this.onNodeSelectCallback) {
          this.onNodeSelectCallback(clickedNode);
        }
      } else {
        this.isPanning = true;
        this.panStart = { x: e.clientX - this.panOffset.x, y: e.clientY - this.panOffset.y };
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.draggedNode) {
        const rect = this.canvas.getBoundingClientRect();
        this.draggedNode.x = (e.clientX - rect.left - this.panOffset.x) / this.zoom;
        this.draggedNode.y = (e.clientY - rect.top - this.panOffset.y) / this.zoom;
      } else if (this.isPanning) {
        this.panOffset.x = e.clientX - this.panStart.x;
        this.panOffset.y = e.clientY - this.panStart.y;
      } else {
        const pos = this.getCanvasPos(e);
        const hovered = this.findNodeAt(pos.x, pos.y);
        this.hoveredNodeId = hovered ? hovered.id : null;
        this.canvas.style.cursor = hovered ? 'pointer' : 'default';
      }
    });

    window.addEventListener('mouseup', () => {
      this.draggedNode = null;
      this.isPanning = false;
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      this.zoom = Math.min(2.0, Math.max(0.6, this.zoom * zoomFactor));
    });
  }

  getCanvasPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - this.panOffset.x) / this.zoom,
      y: (e.clientY - rect.top - this.panOffset.y) / this.zoom
    };
  }

  findNodeAt(x, y) {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const n = this.nodes[i];
      const dist = Math.hypot(n.x - x, n.y - y);
      if (dist <= n.radius + 6) return n;
    }
    return null;
  }

  animate() {
    this.animOffset = (this.animOffset + 0.035) % 1;
    this.render();
    requestAnimationFrame(() => this.animate());
  }

  render() {
    if (!this.ctx || !this.canvas) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.translate(this.panOffset.x, this.panOffset.y);
    this.ctx.scale(this.zoom, this.zoom);

    // 1. 绘制苹果 Freeform 点阵式微网格 (Apple Dot Matrix Grid)
    this.drawDotGrid();

    // 2. 绘制因果能量连线 (Causal Links)
    this.drawLinks();

    // 3. 绘制线索节点 (Nodes)
    this.drawNodes();

    this.ctx.restore();
  }

  drawDotGrid() {
    const spacing = 28;
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';

    const startX = -this.panOffset.x / this.zoom - 50;
    const endX = startX + this.canvas.width / this.zoom + 100;
    const startY = -this.panOffset.y / this.zoom - 50;
    const endY = startY + this.canvas.height / this.zoom + 100;

    for (let x = Math.floor(startX / spacing) * spacing; x <= endX; x += spacing) {
      for (let y = Math.floor(startY / spacing) * spacing; y <= endY; y += spacing) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, 1.1, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    this.ctx.restore();
  }

  drawLinks() {
    this.links.forEach(link => {
      const from = link.from;
      const to = link.to;
      if (!from || !to) return;

      const isHighlighted = (from.id === this.selectedNodeId || to.id === this.selectedNodeId);

      this.ctx.save();
      // 曲线贝塞尔路径
      const midX = (from.x + to.x) / 2;
      this.ctx.beginPath();
      this.ctx.moveTo(from.x, from.y);
      this.ctx.bezierCurveTo(midX, from.y, midX, to.y, to.x, to.y);

      // 底线 (Apple Fluid Gradient Path)
      this.ctx.strokeStyle = isHighlighted ? 'rgba(10, 132, 255, 0.85)' : 'rgba(255, 255, 255, 0.14)';
      this.ctx.lineWidth = isHighlighted ? 2.5 : 1.5;
      this.ctx.shadowColor = isHighlighted ? 'rgba(10, 132, 255, 0.8)' : 'transparent';
      this.ctx.shadowBlur = isHighlighted ? 14 : 0;
      this.ctx.stroke();

      // 流动微光脉冲 (Luminescent Pulse)
      const t = (this.animOffset) % 1;
      const px = Math.pow(1 - t, 3) * from.x + 3 * Math.pow(1 - t, 2) * t * midX + 3 * (1 - t) * Math.pow(t, 2) * midX + Math.pow(t, 3) * to.x;
      const py = Math.pow(1 - t, 3) * from.y + 3 * Math.pow(1 - t, 2) * t * from.y + 3 * (1 - t) * Math.pow(t, 2) * to.y + Math.pow(t, 3) * to.y;

      this.ctx.fillStyle = isHighlighted ? '#64D2FF' : '#BF5AF2';
      this.ctx.shadowColor = '#64D2FF';
      this.ctx.shadowBlur = 10;
      this.ctx.beginPath();
      this.ctx.arc(px, py, isHighlighted ? 3.5 : 2.5, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
    });
  }

  drawNodes() {
    const nodeConfig = {
      phenomenon: { color: '#0A84FF', icon: '👁️', glow: 'rgba(10, 132, 255, 0.45)', label: '现象' },
      observation: { color: '#0A84FF', icon: '👁️', glow: 'rgba(10, 132, 255, 0.45)', label: '目击' },
      question: { color: '#BF5AF2', icon: '❓', glow: 'rgba(191, 90, 242, 0.45)', label: '疑问' },
      hypothesis: { color: '#FFD60A', icon: '💡', glow: 'rgba(255, 214, 10, 0.45)', label: '假说' },
      evidence: { color: '#30D158', icon: '🔬', glow: 'rgba(48, 209, 88, 0.45)', label: '证物' },
      breakthrough: { color: '#FF9F0A', icon: '⚡', glow: 'rgba(255, 159, 10, 0.65)', label: '突破' },
      bottleneck: { color: '#FF453A', icon: '🔥', glow: 'rgba(255, 69, 58, 0.65)', label: '卡点' }
    };

    this.nodes.forEach(node => {
      const cfg = nodeConfig[node.type] || nodeConfig.observation;
      const isSelected = node.id === this.selectedNodeId;
      const isHovered = node.id === this.hoveredNodeId;
      const isBossOrBreakthrough = node.type === 'bottleneck' || node.type === 'breakthrough';

      // 搜索聚光灯过滤
      let isDimmed = false;
      if (this.searchQuery) {
        const text = (node.title + ' ' + (node.content || '')).toLowerCase();
        isDimmed = !text.includes(this.searchQuery);
      }

      this.ctx.save();
      this.ctx.globalAlpha = isDimmed ? 0.25 : 1.0;

      // 1. 外部环境光晕与 Apple 选中高光圈
      if (isSelected || isHovered || isBossOrBreakthrough) {
        this.ctx.strokeStyle = isSelected ? '#FFFFFF' : cfg.color;
        this.ctx.lineWidth = isSelected ? 2.5 : 1.5;
        this.ctx.shadowColor = cfg.glow;
        this.ctx.shadowBlur = isSelected ? 22 : 14;
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, node.radius + (isSelected ? 5 : 2.5), 0, Math.PI * 2);
        this.ctx.stroke();
      }

      // 2. 苹果毛玻璃渐变圆盘 (Apple Frosted Squircle-disk)
      const grad = this.ctx.createRadialGradient(
        node.x - node.radius * 0.3,
        node.y - node.radius * 0.3,
        2,
        node.x,
        node.y,
        node.radius
      );
      grad.addColorStop(0, 'rgba(40, 48, 68, 0.92)');
      grad.addColorStop(1, 'rgba(18, 22, 32, 0.95)');

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      this.ctx.fill();

      // 3. 极细白高光内边框 (Specular Rim)
      this.ctx.strokeStyle = isSelected ? 'rgba(255, 255, 255, 0.6)' : cfg.color;
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();

      // 4. 内部表情符号/图标
      this.ctx.font = `${node.radius * 0.72}px -apple-system, sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(cfg.icon, node.x, node.y - 1);

      // 5. 底部文字标签 (Apple SF Typography)
      this.ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';
      this.ctx.fillStyle = isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.85)';
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      this.ctx.shadowBlur = 6;
      this.ctx.fillText(node.title, node.x, node.y + node.radius + 15);

      this.ctx.restore();
    });
  }
}

if (typeof window !== 'undefined') {
  window.clueCanvas = new ClueCanvasEngine();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClueCanvasEngine;
}
