(function () {
  'use strict';

  // ---- real move data, pulled from content/moves/*.md frontmatter ----
  var CLUSTERS = {
    'cha-cha-cha':   { label: 'Cha Cha Cha' },
    'turns-spins':   { label: 'Turns & Spins' },
    'circle-cradle': { label: 'Circle & Cradle' },
    'holds-lifts':   { label: 'Holds & Lifts' }
  };

  var nodes = [
    { id: 'cradle', name: 'Cradle', cluster: 'circle-cradle' },
    { id: 'windmill', name: 'Windmill', cluster: 'holds-lifts' },
    { id: 'around-the-world', name: 'Around the World', cluster: 'circle-cradle' },
    { id: 'closed-cha-cha-cha', name: 'Closed Cha Cha Cha', cluster: 'cha-cha-cha' },
    { id: 'open-cha-cha-cha', name: 'Open Cha Cha Cha', cluster: 'cha-cha-cha' },
    { id: 'flick', name: 'Flick', cluster: 'holds-lifts' },
    { id: 'hammer-lock', name: 'Hammer Lock', cluster: 'holds-lifts' },
    { id: 'i-go-round-and-you-go-round', name: 'I Go Round and You Go Round', cluster: 'circle-cradle' },
    { id: 'over-the-shoulder', name: 'Over the Shoulder', cluster: 'holds-lifts' },
    { id: 'spin', name: 'Spin', cluster: 'turns-spins' },
    { id: 'turn', name: 'Turn', cluster: 'turns-spins' }
  ];

  var links = [
    { source: 'around-the-world', target: 'cradle' },
    { source: 'hammer-lock', target: 'spin' },
    { source: 'hammer-lock', target: 'around-the-world' },
    { source: 'i-go-round-and-you-go-round', target: 'cradle' },
    { source: 'over-the-shoulder', target: 'windmill' },
    { source: 'over-the-shoulder', target: 'cradle' }
  ];

  var degree = {};
  nodes.forEach(function (n) { degree[n.id] = 0; });
  links.forEach(function (l) { degree[l.source] = (degree[l.source] || 0) + 1; degree[l.target] = (degree[l.target] || 0) + 1; });

  var graphData = {
    nodes: nodes.map(function (n) { return Object.assign({}, n, { degree: degree[n.id] || 0 }); }),
    links: links.map(function (l) { return Object.assign({}, l); })
  };

  // ---- variants ----
  var VARIANTS = {
    A: {
      key: 'A',
      name: 'Obsidian Void',
      desc: 'Closest to obsidian-galaxy: dark starfield, cool desaturated cluster colors, thin arrowed links, always-on slow orbit.',
      bg: '#05060a',
      font: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      clusterColors: {
        'cha-cha-cha': '#8b5cf6',
        'turns-spins': '#38bdf8',
        'circle-cradle': '#34d399',
        'holds-lifts': '#f472b6'
      },
      linkColor: 'rgba(255,255,255,0.28)',
      linkWidth: 0.6,
      particles: 0,
      particleSpeed: 0,
      particleColor: null,
      arrowLength: 4,
      nodeSizeByDegree: true,
      nodeBaseSize: 5,
      labelStyle: 'small-sans',
      showLegend: true,
      floor: null,
      starfield: true,
      autoOrbitDefault: true,
      autoOrbitSpeed: 0.10,
      flyToEase: 900
    },
    B: {
      key: 'B',
      name: 'Warm Ballroom',
      desc: 'Warm amber/gold palette, glowing ribbon links with flowing particles, serif labels, spotlight floor, manual camera by default.',
      bg: '#170e09',
      font: 'Georgia, "Times New Roman", serif',
      clusterColors: {
        'cha-cha-cha': '#f59e0b',
        'turns-spins': '#ef4444',
        'circle-cradle': '#d97706',
        'holds-lifts': '#fbbf24'
      },
      linkColor: 'rgba(251,191,36,0.55)',
      linkWidth: 1.6,
      particles: 3,
      particleSpeed: 0.004,
      particleColor: '#ffd27a',
      arrowLength: 0,
      nodeSizeByDegree: false,
      nodeBaseSize: 6,
      labelStyle: 'italic-serif',
      showLegend: false,
      floor: 'spotlight',
      starfield: false,
      autoOrbitDefault: false,
      autoOrbitSpeed: 0.045,
      flyToEase: 1800
    },
    C: {
      key: 'C',
      name: 'Neon Studio',
      desc: 'High-contrast neon on pure black, thick fast-flowing links, pulsing hub nodes, bold condensed labels, fast orbit + snap zoom.',
      bg: '#000000',
      font: '"Arial Narrow", "Helvetica Neue Condensed", sans-serif',
      clusterColors: {
        'cha-cha-cha': '#ff2fd0',
        'turns-spins': '#00f0ff',
        'circle-cradle': '#adff2f',
        'holds-lifts': '#ffe600'
      },
      linkColor: 'rgba(0,240,255,0.45)',
      linkWidth: 2.2,
      particles: 5,
      particleSpeed: 0.012,
      particleColor: '#ffffff',
      arrowLength: 5,
      nodeSizeByDegree: true,
      nodeBaseSize: 4.5,
      labelStyle: 'bold-condensed',
      showLegend: true,
      floor: 'grid',
      starfield: false,
      autoOrbitDefault: true,
      autoOrbitSpeed: 0.32,
      flyToEase: 400
    }
  };

  var ORDER = ['A', 'B', 'C'];

  // ---- three.js scene extras (starfield / floor), built once per variant switch ----
  var extraObjects = [];
  function clearExtras(scene) {
    extraObjects.forEach(function (o) { scene.remove(o); });
    extraObjects = [];
  }

  function addStarfield(scene) {
    var count = 900;
    var positions = new Float32Array(count * 3);
    for (var i = 0; i < count; i++) {
      var r = 400 + Math.random() * 600;
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    var mat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.1, sizeAttenuation: true, transparent: true, opacity: 0.55 });
    var stars = new THREE.Points(geo, mat);
    scene.add(stars);
    extraObjects.push(stars);
  }

  function addSpotlightFloor(scene) {
    var geo = new THREE.CircleGeometry(150, 48);
    var mat = new THREE.MeshBasicMaterial({ color: 0xffb84d, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false });
    var disc = new THREE.Mesh(geo, mat);
    disc.rotation.x = Math.PI / 2;
    disc.position.y = -260;
    scene.add(disc);
    extraObjects.push(disc);

    var ring = new THREE.Mesh(new THREE.RingGeometry(90, 150, 48), new THREE.MeshBasicMaterial({ color: 0xffb84d, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -260;
    scene.add(ring);
    extraObjects.push(ring);
  }

  function addGridFloor(scene) {
    var grid = new THREE.GridHelper(600, 24, 0x00f0ff, 0x113344);
    grid.position.y = -140;
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    scene.add(grid);
    extraObjects.push(grid);
  }

  // ---- pulsing hub nodes (variant C) ----
  var pulseTargets = [];

  function makeNodeObject(variant) {
    return function (node) {
      var isHub = node.degree >= 2;
      var color = variant.clusterColors[node.cluster] || '#ffffff';
      var size = variant.nodeBaseSize + (variant.nodeSizeByDegree ? node.degree * 2.4 : (isHub ? 3 : 0));
      var geo = new THREE.SphereGeometry(size, 16, 16);
      var mat = new THREE.MeshLambertMaterial({ color: color, emissive: color, emissiveIntensity: isHub ? 0.9 : 0.45, transparent: true, opacity: 0.95 });
      var mesh = new THREE.Mesh(geo, mat);
      if (variant.key === 'C' && isHub) {
        mesh.userData.pulse = { base: size, phase: Math.random() * Math.PI * 2 };
        pulseTargets.push(mesh);
      }
      return mesh;
    };
  }

  function labelClassFor(style) {
    switch (style) {
      case 'italic-serif': return 'font-style: italic;';
      case 'bold-condensed': return 'font-weight: 700; letter-spacing: 0.02em; text-transform: uppercase;';
      default: return 'font-weight: 500;';
    }
  }

  // ---- init graph (once) ----
  var container = document.getElementById('graph-container');
  var Graph = ForceGraph3D()(container)
    .graphData(graphData)
    .nodeLabel(function (n) { return n.name; })
    .linkDirectionalArrowRelPos(1)
    .onNodeClick(function (node) {
      var distance = 130;
      var distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z || 1);
      var camPos = Graph.cameraPosition();
      var current = current_ ? VARIANTS[current_] : VARIANTS.A;
      Graph.cameraPosition(
        { x: node.x * distRatio, y: node.y * distRatio, z: (node.z || 0) * distRatio },
        node,
        current.flyToEase
      );
    });

  Graph.width(window.innerWidth);
  Graph.height(window.innerHeight);
  window.addEventListener('resize', function () {
    Graph.width(window.innerWidth);
    Graph.height(window.innerHeight);
  });

  var autoOrbitOn = false;
  var orbitAngle = 0;
  var current_ = null;

  Graph.onEngineTick(function () {
    if (autoOrbitOn) {
      var v = VARIANTS[current_];
      orbitAngle += v.autoOrbitSpeed * 0.01;
      var camPos = Graph.cameraPosition();
      var radius = Math.hypot(camPos.x, camPos.z) || 260;
      Graph.cameraPosition({ x: radius * Math.sin(orbitAngle), y: camPos.y, z: radius * Math.cos(orbitAngle) });
    }
    if (current_ === 'C') {
      var t = Date.now() * 0.004;
      pulseTargets.forEach(function (m) {
        var p = m.userData.pulse;
        if (!p) return;
        var s = p.base * (1 + 0.18 * Math.sin(t + p.phase));
        m.scale.setScalar(s / p.base);
      });
    }
  });

  function applyVariant(key) {
    var v = VARIANTS[key];
    current_ = key;
    pulseTargets = [];

    Graph
      .backgroundColor(v.bg)
      .nodeThreeObject(makeNodeObject(v))
      .nodeThreeObjectExtend(false)
      .linkColor(function () { return v.linkColor; })
      .linkWidth(v.linkWidth)
      .linkDirectionalArrowLength(v.arrowLength)
      .linkDirectionalParticles(v.particles)
      .linkDirectionalParticleWidth(2.4)
      .linkDirectionalParticleSpeed(v.particleSpeed)
      .linkDirectionalParticleColor(function () { return v.particleColor || v.linkColor; });

    var scene = Graph.scene();
    clearExtras(scene);
    if (v.starfield) addStarfield(scene);
    if (v.floor === 'spotlight') addSpotlightFloor(scene);
    if (v.floor === 'grid') addGridFloor(scene);

    document.body.style.background = v.bg;
    document.body.style.color = '#f4f4f5';
    document.body.style.fontFamily = v.font;

    var nameEl = document.getElementById('variant-name-n');
    var descEl = document.getElementById('variant-name-d');
    nameEl.textContent = v.name;
    nameEl.style.fontFamily = v.font;
    descEl.textContent = v.desc;

    var hud = document.getElementById('hud');
    hud.style.display = v.showLegend ? 'block' : 'none';
    var legend = document.getElementById('legend');
    legend.innerHTML = '';
    Object.keys(CLUSTERS).forEach(function (c) {
      var row = document.createElement('div');
      row.className = 'legend-row';
      row.style.cssText = labelClassFor(v.labelStyle);
      var sw = document.createElement('span');
      sw.className = 'legend-swatch';
      sw.style.background = v.clusterColors[c];
      sw.style.boxShadow = '0 0 8px ' + v.clusterColors[c];
      row.appendChild(sw);
      var txt = document.createElement('span');
      txt.textContent = CLUSTERS[c].label;
      row.appendChild(txt);
      legend.appendChild(row);
    });

    autoOrbitOn = v.autoOrbitDefault;
    orbitAngle = Math.atan2(Graph.cameraPosition().x, Graph.cameraPosition().z) || 0;
    document.getElementById('orbit-toggle').textContent = 'Auto-orbit: ' + (autoOrbitOn ? 'on' : 'off');

    document.getElementById('switcher-label').textContent = key + ' — ' + v.name;
  }

  document.getElementById('orbit-toggle').addEventListener('click', function () {
    autoOrbitOn = !autoOrbitOn;
    this.textContent = 'Auto-orbit: ' + (autoOrbitOn ? 'on' : 'off');
  });

  // ---- switcher ----
  function currentKeyFromHash() {
    var m = /variant=([ABC])/.exec(location.hash);
    return m ? m[1] : 'A';
  }

  function goTo(key) {
    history.replaceState(null, '', '#variant=' + key);
    applyVariant(key);
  }

  function step(delta) {
    var idx = ORDER.indexOf(current_);
    var next = ORDER[(idx + delta + ORDER.length) % ORDER.length];
    goTo(next);
  }

  document.getElementById('prev').addEventListener('click', function () { step(-1); });
  document.getElementById('next').addEventListener('click', function () { step(1); });
  window.addEventListener('keydown', function (e) {
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (document.activeElement && document.activeElement.isContentEditable)) return;
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
  window.addEventListener('hashchange', function () { applyVariant(currentKeyFromHash()); });

  goTo(currentKeyFromHash());
})();
